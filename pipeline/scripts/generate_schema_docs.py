# python pipeline/scripts/generate_schema_docs.py --billing-project <PROJECT_ID>
from __future__ import annotations

import argparse
from pathlib import Path

import basedosdados as bd

TABLE_CATALOG: list[tuple[str, str, str]] = [
    (
        "adm_central_atendimento_1746",
        "chamado",
        "Chamados 1746; extração com filtro em data_particao",
    ),
    ("dados_mestres", "bairro", "Geo — bairros"),
    ("dados_mestres", "regiao_administrativa", "Geo — regiões administrativas"),
    ("dados_mestres", "area_planejamento", "Geo — áreas de planejamento"),
    ("dados_mestres", "subprefeitura", "Geo — subprefeituras"),
]


def schema_sql(dataset_id: str, table_name: str) -> str:
    """Build the INFORMATION_SCHEMA query for a ``datario`` table.

    Args:
        dataset_id: BigQuery dataset, e.g. ``"dados_mestres"``.
        table_name: Table within the dataset, e.g. ``"bairro"``.

    Returns:
        SQL selecting each column's name, data type and official description
        (joined from ``COLUMN_FIELD_PATHS``), ordered by ordinal position.
    """
    return f"""
        SELECT
            c.column_name,
            c.data_type,
            p.description
        FROM `datario.{dataset_id}.INFORMATION_SCHEMA.COLUMNS` AS c
        LEFT JOIN `datario.{dataset_id}.INFORMATION_SCHEMA.COLUMN_FIELD_PATHS` AS p
            ON c.table_name = p.table_name
            AND c.column_name = p.column_name
            AND p.field_path = p.column_name
        WHERE c.table_name = '{table_name}'
        ORDER BY c.ordinal_position
    """


def fetch_schema(billing_project_id: str, dataset_id: str, table_name: str):
    """Run the schema query for a table and return it as a DataFrame.

    Args:
        billing_project_id: GCP project billed for the query.
        dataset_id: BigQuery dataset.
        table_name: Table within the dataset.

    Returns:
        A pandas DataFrame with columns ``column_name``, ``data_type`` and
        ``description``.
    """
    return bd.read_sql(
        schema_sql(dataset_id, table_name),
        billing_project_id=billing_project_id,
    )


def main() -> None:
    """Generate ``docs/bigquery_schemas.md`` from the BigQuery schemas.

    Parses ``--billing-project``, queries the schema of every table in
    ``TABLE_CATALOG`` and writes a Markdown summary (column name, type and
    description) to ``docs/bigquery_schemas.md``.
    """
    parser = argparse.ArgumentParser(description="Generate BigQuery schema markdown")
    parser.add_argument("--billing-project", required=True)
    args = parser.parse_args()

    lines = [
        "# Schemas BigQuery — projeto `datario`",
        "",
        "Para cada tabela: **coluna (nome)**, **tipo** e **descrição** (`INFORMATION_SCHEMA.COLUMN_FIELD_PATHS`).",
        "",
        "Regerar:",
        "",
        "```bash",
        "source .venv/bin/activate",
        f"python pipeline/scripts/generate_schema_docs.py --billing-project {args.billing_project}",
        "```",
        "",
        "> Enunciado cita `prazo_atendimento`; no datalake atual o SLA alvo é `data_alvo_finalizacao` "
        "(alias no export).",
        "",
    ]

    for dataset_id, table_name, note in TABLE_CATALOG:
        table_path = f"datario.{dataset_id}.{table_name}"
        lines.append(f"## `{table_path}`")
        lines.append("")
        if note:
            lines.append(f"{note}.")
            lines.append("")
        df = fetch_schema(args.billing_project, dataset_id, table_name)
        lines.append("| Coluna (nome) | Tipo | Descrição |")
        lines.append("|---------------|------|-----------|")
        for _, row in df.iterrows():
            desc = (row["description"] or "").replace("\n", " ").replace("|", "\\|").strip()
            lines.append(f"| `{row['column_name']}` | {row['data_type']} | {desc or '—'} |")
        lines.append("")

    out = Path(__file__).resolve().parents[2] / "docs" / "bigquery_schemas.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
