#!/usr/bin/env python3
"""One-time BigQuery extraction (chamado + geo) to data/raw/*.parquet.

Requires:
    brew install --cask google-cloud-sdk
    gcloud auth application-default login
    gcloud auth application-default set-quota-project <PROJECT_ID>

Usage:
    python pipeline/scripts/extract_bigquery.py --billing-project <PROJECT_ID>
"""

from __future__ import annotations

import argparse
import logging
import sys
import threading
import time
from pathlib import Path

DOWNLOAD_PLAN: list[tuple[str, str, str]] = [
    ("dados_mestres", "regiao_administrativa", "regiao_administrativa.parquet"),
    ("dados_mestres", "area_planejamento", "area_planejamento.parquet"),
    ("dados_mestres", "subprefeitura", "subprefeitura.parquet"),
    ("dados_mestres", "bairro", "bairro.parquet"),
    ("adm_central_atendimento_1746", "chamado", "chamado.parquet"),
]

QUERY_CHAMADO = """
SELECT
    id_chamado,
    data_inicio,
    data_fim,
    data_alvo_finalizacao AS prazo_atendimento,
    tipo,
    subtipo,
    status,
    situacao,
    id_bairro,
    categoria,
    tipo_situacao,
    nome_unidade_organizacional,
    reclamacoes,
    longitude,
    latitude,
    data_particao
FROM `datario.adm_central_atendimento_1746.chamado`
WHERE data_particao >= '2023-01-01'
"""

QUERY_BAIRRO = """
SELECT
    id_bairro,
    nome,
    subprefeitura,
    nome_regiao_administrativa,
    nome_regiao_planejamento,
    geometry_wkt
FROM `datario.dados_mestres.bairro`
"""

QUERY_REGIAO_ADMINISTRATIVA = """
SELECT
    id_regiao_administrativa,
    nome,
    id_area_planejamento_sms
FROM `datario.dados_mestres.regiao_administrativa`
"""

QUERY_AREA_PLANEJAMENTO = """
SELECT
    id_area_planejamento,
    id_area_planejamento_numerico,
    geometry_wkt
FROM `datario.dados_mestres.area_planejamento`
"""

QUERY_SUBPREFEITURA = """
SELECT
    subprefeitura,
    area,
    perimetro,
    geometry_wkt
FROM `datario.dados_mestres.subprefeitura`
"""

EXTRACTION_QUERIES: dict[tuple[str, str], str] = {
    ("adm_central_atendimento_1746", "chamado"): QUERY_CHAMADO,
    ("dados_mestres", "bairro"): QUERY_BAIRRO,
    ("dados_mestres", "regiao_administrativa"): QUERY_REGIAO_ADMINISTRATIVA,
    ("dados_mestres", "area_planejamento"): QUERY_AREA_PLANEJAMENTO,
    ("dados_mestres", "subprefeitura"): QUERY_SUBPREFEITURA,
}

LOG_HEARTBEAT_SECONDS = 45
PROGRESS_ROW_INTERVAL = 250_000


def setup_logging(log_path: Path) -> logging.Logger:
    logger = logging.getLogger("extract_bigquery")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(fmt)
    logger.addHandler(console)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)
    return logger


def _format_bytes(num_bytes: int | None) -> str:
    if num_bytes is None:
        return "n/d"
    value = float(num_bytes)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if value < 1024 or unit == "TiB":
            return f"{value:.2f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{num_bytes} B"


def _format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes, secs = divmod(int(seconds), 60)
    if minutes < 60:
        return f"{minutes}m {secs}s"
    hours, minutes = divmod(minutes, 60)
    return f"{hours}h {minutes}m {secs}s"


def extraction_query(dataset_id: str, table_name: str) -> str:
    key = (dataset_id, table_name)
    if key not in EXTRACTION_QUERIES:
        known = ", ".join(f"{d}.{t}" for d, t in sorted(EXTRACTION_QUERIES))
        raise ValueError(f"Unknown table {dataset_id}.{table_name}. Known: {known}")
    return EXTRACTION_QUERIES[key]


def _wait_with_heartbeat(job: object, logger: logging.Logger, label: str, started: float) -> None:
    stop = threading.Event()

    def heartbeat() -> None:
        while not stop.wait(LOG_HEARTBEAT_SECONDS):
            logger.info(
                "%s: BigQuery ainda processando… (%s decorridos, job %s)",
                label,
                _format_duration(time.monotonic() - started),
                getattr(job, "job_id", "?"),
            )

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    try:
        job.result()  # type: ignore[union-attr]
    finally:
        stop.set()
        thread.join(timeout=1)


def download_query_to_parquet(
    query: str,
    billing_project: str,
    output: Path,
    *,
    logger: logging.Logger,
    label: str,
) -> int:
    from google.cloud import bigquery
    import pyarrow.parquet as pq

    if output.suffix != ".parquet":
        output = output.with_suffix(".parquet")

    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        logger.warning("%s: sobrescrevendo arquivo existente (%s)", label, output)

    client = bigquery.Client(project=billing_project)
    logger.info("%s: enviando query ao BigQuery (cobrança no projeto %s)", label, billing_project)

    t0 = time.monotonic()
    job = client.query(query)
    logger.info("%s: job criado (id=%s) — aguardando slot no BigQuery…", label, job.job_id)
    _wait_with_heartbeat(job, logger, label, t0)

    bytes_processed = getattr(job, "total_bytes_processed", None)
    slot_ms = getattr(job, "slot_millis", None)
    logger.info(
        "%s: query concluída em %s | bytes processados: %s | slot_ms: %s",
        label,
        _format_duration(time.monotonic() - t0),
        _format_bytes(bytes_processed),
        f"{slot_ms:,}" if slot_ms is not None else "n/d",
    )

    logger.info("%s: baixando resultado e gravando Parquet → %s", label, output)
    rows = job.result()
    writer = None
    total = 0
    batch_idx = 0
    t_write = time.monotonic()
    last_logged_rows = 0

    for batch in rows.to_arrow_iterable():
        batch_idx += 1
        total += batch.num_rows
        if writer is None:
            writer = pq.ParquetWriter(output, batch.schema, compression="snappy")
            logger.info("%s: schema Parquet definido (%d colunas)", label, len(batch.schema.names))
        writer.write_batch(batch)

        if total - last_logged_rows >= PROGRESS_ROW_INTERVAL:
            elapsed = time.monotonic() - t_write
            rate = total / elapsed if elapsed > 0 else 0
            logger.info(
                "%s: lote %d — %s linhas gravadas (%s linhas/s, %s na gravação)",
                label,
                batch_idx,
                f"{total:,}",
                f"{rate:,.0f}",
                _format_duration(elapsed),
            )
            last_logged_rows = total

    if writer is not None:
        writer.close()

    file_size = output.stat().st_size if output.exists() else 0
    total_elapsed = time.monotonic() - t0
    logger.info(
        "%s: concluído — %s linhas, arquivo %s (%s), tempo total %s",
        label,
        f"{total:,}",
        output.name,
        _format_bytes(file_size),
        _format_duration(total_elapsed),
    )
    return total


def download_table(
    dataset_id: str,
    table_name: str,
    output: Path,
    billing_project: str,
    logger: logging.Logger,
) -> int:
    label = f"datario.{dataset_id}.{table_name}"
    query = extraction_query(dataset_id, table_name)
    return download_query_to_parquet(
        query,
        billing_project,
        output,
        logger=logger,
        label=label,
    )


def download_all_tables(
    billing_project: str,
    raw_dir: Path,
    logger: logging.Logger,
) -> None:
    total_steps = len(DOWNLOAD_PLAN)
    run_started = time.monotonic()
    logger.info(
        "Início do download (%d tabelas) → %s",
        total_steps,
        raw_dir.resolve(),
    )

    for step, (dataset_id, table_name, filename) in enumerate(DOWNLOAD_PLAN, start=1):
        out = raw_dir / filename
        logger.info("=" * 72)
        logger.info("[%d/%d] %s", step, total_steps, f"datario.{dataset_id}.{table_name}")
        logger.info("Destino: %s", out.resolve())
        step_started = time.monotonic()
        try:
            rows = download_table(dataset_id, table_name, out, billing_project, logger)
        except Exception:
            logger.exception(
                "[%d/%d] Falha em %s após %s",
                step,
                total_steps,
                f"datario.{dataset_id}.{table_name}",
                _format_duration(time.monotonic() - step_started),
            )
            raise
        logger.info(
            "[%d/%d] OK — %s linhas em %s",
            step,
            total_steps,
            f"{rows:,}",
            _format_duration(time.monotonic() - step_started),
        )

    logger.info("=" * 72)
    logger.info(
        "Download finalizado em %s. Próximo passo: cd pipeline && dbt run",
        _format_duration(time.monotonic() - run_started),
    )


def main() -> None:
    raw_dir = Path(__file__).resolve().parents[2] / "data" / "raw"

    parser = argparse.ArgumentParser(
        description="Export chamado + dados_mestres from datario to data/raw/*.parquet",
    )
    parser.add_argument(
        "--billing-project",
        required=True,
        help="GCP project billed for BigQuery queries",
    )
    parser.add_argument(
        "--raw-dir",
        default=str(raw_dir),
        help="Output directory (default: data/raw)",
    )
    parser.add_argument(
        "--log-file",
        default=str(raw_dir / "extract_bigquery.log"),
        help="Log file path (default: data/raw/extract_bigquery.log)",
    )
    args = parser.parse_args()

    raw_path = Path(args.raw_dir)
    raw_path.mkdir(parents=True, exist_ok=True)
    logger = setup_logging(Path(args.log_file))
    logger.info("Log também em %s", Path(args.log_file).resolve())
    logger.info("Projeto de cobrança: %s", args.billing_project)
    logger.info("Diretório de saída: %s", raw_path.resolve())

    download_all_tables(args.billing_project, raw_path, logger)


if __name__ == "__main__":
    main()
