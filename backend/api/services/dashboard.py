from __future__ import annotations

from api.cache import cached
from api.config import Settings
from api.dependencies.database import DuckDBReader
from api.schemas.chamados import ChamadosQueryParams
from api.schemas.dashboard import (
    AtrasoOrgaoShare,
    AtrasoRegiaoOrgaoShare,
    BacklogKpis,
    CategoriaVolume,
    DashboardKpis,
    DashboardResponse,
    ReclamacoesPressure,
    RegiaoSecretariaCell,
    SecretariaKpi,
    SlaBreakdown,
    SubprefeituraSecretariaCell,
    TemporalPoint,
    TerritorialVolume,
    TipoVolume,
)
from api.services.chamados_query import CHAMADOS_TABLE, build_where, has_active_filters

PIC_SECRETARIAS = frozenset({"SMS", "SME", "SMAS"})


class DashboardService:
    def __init__(self, reader: DuckDBReader, settings: Settings) -> None:
        self.reader = reader
        self.settings = settings

    def get_dashboard(self, params: ChamadosQueryParams) -> DashboardResponse:
        cache_params = params.model_dump(
            exclude={"page", "page_size", "sort_by", "sort_order"},
            exclude_none=True,
        )

        def factory() -> DashboardResponse:
            if has_active_filters(params):
                return self._from_filtered_sql(params)
            return self._from_marts()

        return cached("dashboard", cache_params, factory)

    def _from_marts(self) -> DashboardResponse:
        kpi_row = self.reader.read_table("mart_dashboard_pic_kpis").row(0, named=True)
        backlog_row = self.reader.read_table("mart_dashboard_pic_backlog").row(0, named=True)
        sla_row = self.reader.read_table("mart_dashboard_pic_sla_breakdown").row(0, named=True)

        temporal = self._temporal_rows(
            self.reader.read_table("mart_dashboard_pic_temporal").iter_rows(named=True),
        )

        by_secretaria = self._secretaria_rows(
            self.reader.read_table("mart_dashboard_by_secretaria").iter_rows(named=True),
        )

        top_tipos = [
            TipoVolume(
                tipo=str(row["tipo"]),
                secretaria=str(row["secretaria"]),
                total_chamados=int(row["total_chamados"]),
            )
            for row in self.reader.read_table("mart_dashboard_top_tipos_pic").iter_rows(named=True)
        ]

        return DashboardResponse(
            kpis=self._kpis_from_row(kpi_row),
            backlog=BacklogKpis(
                chamados_abertos=int(backlog_row["chamados_abertos"]),
                idade_media_aberto_dias=backlog_row["idade_media_aberto_dias"],
            ),
            temporal=temporal,
            sla_breakdown=self._sla_from_row(sla_row),
            by_secretaria=by_secretaria,
            top_tipos=top_tipos,
            by_regiao_atrasos=self._read_territorial_mart(
                "mart_dashboard_pic_by_regiao_atrasos",
            ),
            by_subprefeitura=self._read_territorial_mart(
                "mart_dashboard_pic_by_subprefeitura",
            ),
            regiao_x_secretaria_vol=self._read_regiao_secretaria_vol_mart(),
            subprefeitura_x_secretaria=self._read_subpref_secretaria_mart(),
            atrasos_subpref_por_secretaria=self._read_atrasos_subpref_por_secretaria_mart(),
            atrasos_subpref_orgao=self._read_atrasos_subpref_orgao_mart(),
            atrasos_regiao_por_secretaria=self._read_atrasos_regiao_por_secretaria_mart(),
            atrasos_regiao_orgao=self._read_atrasos_regiao_orgao_mart(),
            by_categoria=self._read_categoria_mart(),
            pressao_reclamacoes=self._read_reclamacoes_mart(),
            pressao_reclamacoes_subpref=self._read_reclamacoes_subpref_mart(),
        )

    def _read_territorial_mart(self, table: str) -> list[TerritorialVolume]:
        try:
            df = self.reader.read_table(table)
        except Exception:
            return []
        return [
            TerritorialVolume(
                territorio=str(row["territorio"]),
                total_chamados=int(row["total_chamados"]),
                taxa_resolucao_prazo=row.get("taxa_resolucao_prazo"),
            )
            for row in df.iter_rows(named=True)
        ]

    def _from_filtered_sql(self, params: ChamadosQueryParams) -> DashboardResponse:
        where_sql, where_values = build_where(params)
        base = f"from {CHAMADOS_TABLE} where {where_sql}"

        kpi_row = self.reader.fetch_df(
            f"""
            select
                count(*) as total_chamados,
                count(*) filter (where data_fim is not null) as total_resolvidos,
                count(*) filter (where data_fim is null) as chamados_abertos,
                round(
                    100.0 * count(*) filter (where resolvido_no_prazo)
                    / nullif(count(*) filter (where data_fim is not null and prazo_atendimento is not null), 0),
                    2
                ) as taxa_resolucao_prazo,
                round(avg(dias_resolucao) filter (where dias_resolucao is not null), 2)
                    as tempo_medio_resolucao_dias
            {base}
            """,
            where_values,
        ).row(0, named=True)

        backlog_row = self.reader.fetch_df(
            f"""
            select
                count(*) filter (where data_fim is null) as chamados_abertos,
                round(
                    avg(date_diff('day', cast(data_inicio as date), current_date))
                    filter (where data_fim is null and data_inicio is not null),
                    1
                ) as idade_media_aberto_dias
            {base}
            """,
            where_values,
        ).row(0, named=True)

        sla_row = self.reader.fetch_df(
            f"""
            select
                count(*) filter (
                    where data_fim is not null and prazo_atendimento is not null and resolvido_no_prazo
                ) as no_prazo,
                count(*) filter (
                    where data_fim is not null and prazo_atendimento is not null
                      and not resolvido_no_prazo
                ) as fora_prazo,
                count(*) filter (where data_fim is not null and prazo_atendimento is null)
                    as fechado_sem_prazo,
                count(*) filter (where data_fim is null) as em_aberto
            {base}
            """,
            where_values,
        ).row(0, named=True)

        temporal_df = self.reader.fetch_df(
            f"""
            select
                date_trunc('month', cast(data_inicio as date)) as periodo,
                count(*) as total_chamados,
                count(*) filter (where data_fim is not null) as total_encerrados
            {base}
              and data_inicio is not null
            group by 1
            order by 1
            """,
            where_values,
        )

        top_tipos_df = self.reader.fetch_df(
            f"""
            with counts as (
                select tipo, secretaria, count(*) as total_chamados
                {base} and tipo is not null
                group by 1, 2
            ),
            ranked as (
                select *, row_number() over (order by total_chamados desc) as rn from counts
            )
            select tipo, secretaria, total_chamados
            from ranked
            where rn <= 10
            order by total_chamados desc
            """,
            where_values,
        )

        secretaria_df = self.reader.fetch_df(
            f"""
            select
                secretaria,
                count(*) as total_chamados,
                round(
                    100.0 * count(*) filter (where resolvido_no_prazo)
                    / nullif(count(*) filter (where data_fim is not null and prazo_atendimento is not null), 0),
                    2
                ) as taxa_resolucao_prazo
            {base}
              and secretaria is not null
            group by 1
            order by total_chamados desc
            """,
            where_values,
        )

        by_regiao_atrasos = self._filtered_territorial_atrasos(
            base, where_values, "regiao_administrativa"
        )
        by_subpref = self._filtered_territorial(base, where_values, "subprefeitura")

        return DashboardResponse(
            kpis=self._kpis_from_row(kpi_row),
            backlog=BacklogKpis(
                chamados_abertos=int(backlog_row["chamados_abertos"]),
                idade_media_aberto_dias=backlog_row["idade_media_aberto_dias"],
            ),
            temporal=self._temporal_rows(temporal_df.iter_rows(named=True)),
            sla_breakdown=self._sla_from_row(sla_row),
            by_secretaria=self._secretaria_rows(secretaria_df.iter_rows(named=True)),
            top_tipos=[
                TipoVolume(
                    tipo=str(r["tipo"]),
                    secretaria=str(r["secretaria"]),
                    total_chamados=int(r["total_chamados"]),
                )
                for r in top_tipos_df.iter_rows(named=True)
            ],
            by_regiao_atrasos=by_regiao_atrasos,
            by_subprefeitura=by_subpref,
            regiao_x_secretaria_vol=self._filtered_regiao_secretaria_vol(base, where_values),
            subprefeitura_x_secretaria=self._filtered_subpref_secretaria(base, where_values),
            atrasos_subpref_por_secretaria=self._filtered_atrasos_subpref_por_secretaria(
                base, where_values
            ),
            atrasos_subpref_orgao=self._filtered_atrasos_subpref_orgao(base, where_values),
            atrasos_regiao_por_secretaria=self._filtered_atrasos_regiao_por_secretaria(
                base, where_values
            ),
            atrasos_regiao_orgao=self._filtered_atrasos_regiao_orgao(base, where_values),
            by_categoria=self._filtered_categoria(base, where_values),
            pressao_reclamacoes=self._filtered_reclamacoes(base, where_values),
            pressao_reclamacoes_subpref=self._filtered_reclamacoes_subpref(
                base, where_values
            ),
        )

    def _column_exists(self, column: str) -> bool:
        try:
            self.reader.fetch_df(f"select {column} from {CHAMADOS_TABLE} limit 0", [])
            return True
        except Exception:
            return False

    def _read_regiao_secretaria_vol_mart(self) -> list[RegiaoSecretariaCell]:
        try:
            df = self.reader.read_table("mart_dashboard_pic_regiao_x_secretaria_vol")
        except Exception:
            return []
        return self._regiao_secretaria_cells(df)

    def _read_subpref_secretaria_mart(self) -> list[SubprefeituraSecretariaCell]:
        try:
            df = self.reader.read_table("mart_dashboard_pic_subprefeitura_x_secretaria")
        except Exception:
            return []
        return self._subpref_secretaria_cells(df)

    def _read_atrasos_regiao_por_secretaria_mart(self) -> list[RegiaoSecretariaCell]:
        try:
            df = self.reader.read_table("mart_dashboard_pic_atrasos_regiao_por_secretaria")
        except Exception:
            return []
        return self._atrasos_regiao_secretaria_cells(df)

    def _read_atrasos_subpref_por_secretaria_mart(self) -> list[SubprefeituraSecretariaCell]:
        try:
            df = self.reader.read_table("mart_dashboard_pic_atrasos_subpref_por_secretaria")
        except Exception:
            return []
        return self._atrasos_subpref_secretaria_cells(df)

    def _read_atrasos_subpref_orgao_mart(self) -> list[AtrasoOrgaoShare]:
        try:
            df = self.reader.read_table("mart_dashboard_pic_atrasos_subpref_orgao")
        except Exception:
            return []
        return self._atraso_orgao_share_cells(df)

    def _read_atrasos_regiao_orgao_mart(self) -> list[AtrasoRegiaoOrgaoShare]:
        try:
            df = self.reader.read_table("mart_dashboard_pic_atrasos_regiao_orgao")
        except Exception:
            return []
        return self._atraso_regiao_orgao_share_cells(df)

    @staticmethod
    def _atraso_orgao_share_cells(df) -> list[AtrasoOrgaoShare]:
        return [
            AtrasoOrgaoShare(
                secretaria=str(row["secretaria"]),
                subprefeitura=str(row["subprefeitura"]),
                orgao=str(row["orgao"]),
                chamados_atrasados=int(row["chamados_atrasados"]),
                pct_do_atraso=float(row["pct_do_atraso"]),
            )
            for row in df.iter_rows(named=True)
            if str(row["secretaria"]) in PIC_SECRETARIAS
        ]

    @staticmethod
    def _atraso_regiao_orgao_share_cells(df) -> list[AtrasoRegiaoOrgaoShare]:
        return [
            AtrasoRegiaoOrgaoShare(
                secretaria=str(row["secretaria"]),
                regiao=str(row["regiao"]),
                orgao=str(row["orgao"]),
                chamados_atrasados=int(row["chamados_atrasados"]),
                pct_do_atraso=float(row["pct_do_atraso"]),
            )
            for row in df.iter_rows(named=True)
            if str(row["secretaria"]) in PIC_SECRETARIAS
        ]

    @staticmethod
    def _subpref_secretaria_cells(df) -> list[SubprefeituraSecretariaCell]:
        return [
            SubprefeituraSecretariaCell(
                subprefeitura=str(row["subprefeitura"]),
                secretaria=str(row["secretaria"]),
                total_chamados=int(row["total_chamados"]),
            )
            for row in df.iter_rows(named=True)
            if str(row["secretaria"]) in PIC_SECRETARIAS
        ]

    @staticmethod
    def _regiao_secretaria_cells(df) -> list[RegiaoSecretariaCell]:
        return [
            RegiaoSecretariaCell(
                regiao=str(row["regiao"]),
                secretaria=str(row["secretaria"]),
                total_chamados=int(row["total_chamados"]),
            )
            for row in df.iter_rows(named=True)
            if str(row["secretaria"]) in PIC_SECRETARIAS
        ]

    @staticmethod
    def _atrasos_regiao_secretaria_cells(df) -> list[RegiaoSecretariaCell]:
        return [
            RegiaoSecretariaCell(
                regiao=str(row["regiao"]),
                secretaria=str(row["secretaria"]),
                chamados_atrasados=int(row.get("chamados_atrasados") or 0),
                taxa_resolucao_prazo=row.get("taxa_resolucao_prazo"),
            )
            for row in df.iter_rows(named=True)
            if str(row["secretaria"]) in PIC_SECRETARIAS
        ]

    @staticmethod
    def _atrasos_subpref_secretaria_cells(df) -> list[SubprefeituraSecretariaCell]:
        return [
            SubprefeituraSecretariaCell(
                subprefeitura=str(row["subprefeitura"]),
                secretaria=str(row["secretaria"]),
                chamados_atrasados=int(row.get("chamados_atrasados") or 0),
                taxa_resolucao_prazo=row.get("taxa_resolucao_prazo"),
            )
            for row in df.iter_rows(named=True)
            if str(row["secretaria"]) in PIC_SECRETARIAS
        ]

    def _read_categoria_mart(self) -> list[CategoriaVolume]:
        try:
            df = self.reader.read_table("mart_dashboard_pic_by_categoria")
        except Exception:
            return []
        return [
            CategoriaVolume(
                categoria=str(row["categoria"]),
                total_chamados=int(row["total_chamados"]),
            )
            for row in df.iter_rows(named=True)
        ]

    def _read_reclamacoes_mart(self) -> list[ReclamacoesPressure]:
        return self._read_reclamacoes_pressure_mart("mart_dashboard_pic_pressao_reclamacoes")

    def _read_reclamacoes_subpref_mart(self) -> list[ReclamacoesPressure]:
        return self._read_reclamacoes_pressure_mart(
            "mart_dashboard_pic_pressao_reclamacoes_subprefeitura"
        )

    def _read_reclamacoes_pressure_mart(self, table: str) -> list[ReclamacoesPressure]:
        try:
            df = self.reader.read_table(table)
        except Exception:
            return []
        return self._reclamacoes_pressure_cells(df)

    @staticmethod
    def _reclamacoes_pressure_cells(df) -> list[ReclamacoesPressure]:
        return [
            ReclamacoesPressure(
                territorio=str(row["territorio"]),
                com_reclamacoes_repetidas=int(row["com_reclamacoes_repetidas"]),
            )
            for row in df.iter_rows(named=True)
        ]

    def _filtered_subpref_secretaria(
        self, base: str, where_values: list
    ) -> list[SubprefeituraSecretariaCell]:
        if not self._column_exists("subprefeitura"):
            return []
        df = self.reader.fetch_df(
            f"""
            select
                subprefeitura,
                secretaria,
                count(*) as total_chamados
            {base}
              and subprefeitura is not null
              and secretaria is not null
            group by 1, 2
            order by subprefeitura, total_chamados desc
            """,
            where_values,
        )
        return self._subpref_secretaria_cells(df)

    def _filtered_regiao_secretaria_vol(
        self, base: str, where_values: list
    ) -> list[RegiaoSecretariaCell]:
        if not self._column_exists("regiao_administrativa"):
            return []
        df = self.reader.fetch_df(
            f"""
            select
                regiao_administrativa as regiao,
                secretaria,
                count(*) as total_chamados
            {base}
              and regiao_administrativa is not null
              and secretaria is not null
            group by 1, 2
            order by regiao, total_chamados desc
            """,
            where_values,
        )
        return self._regiao_secretaria_cells(df)

    def _filtered_atrasos_regiao_por_secretaria(
        self, base: str, where_values: list
    ) -> list[RegiaoSecretariaCell]:
        if not self._column_exists("regiao_administrativa"):
            return []
        df = self.reader.fetch_df(
            f"""
            with agg as (
                select
                    regiao_administrativa as regiao,
                    secretaria,
                    count(*) as total_chamados,
                    count(*) filter (
                        where data_fim is not null
                          and prazo_atendimento is not null
                          and not resolvido_no_prazo
                    ) as chamados_atrasados,
                    round(
                        100.0 * count(*) filter (where resolvido_no_prazo)
                        / nullif(count(*) filter (where data_fim is not null and prazo_atendimento is not null), 0),
                        2
                    ) as taxa_resolucao_prazo
                {base}
                  and regiao_administrativa is not null
                  and secretaria is not null
                group by 1, 2
            ),
            ranked as (
                select
                    *,
                    row_number() over (
                        partition by secretaria
                        order by
                            taxa_resolucao_prazo asc nulls last,
                            chamados_atrasados desc
                    ) as rn
                from agg
                where taxa_resolucao_prazo is not null
            )
            select regiao, secretaria, chamados_atrasados, taxa_resolucao_prazo
            from ranked
            where rn <= 5
            order by secretaria, taxa_resolucao_prazo asc, chamados_atrasados desc
            """,
            where_values,
        )
        return self._atrasos_regiao_secretaria_cells(df)

    def _filtered_atrasos_subpref_por_secretaria(
        self, base: str, where_values: list
    ) -> list[SubprefeituraSecretariaCell]:
        if not self._column_exists("subprefeitura"):
            return []
        df = self.reader.fetch_df(
            f"""
            with agg as (
                select
                    subprefeitura,
                    secretaria,
                    count(*) as total_chamados,
                    count(*) filter (
                        where data_fim is not null
                          and prazo_atendimento is not null
                          and not resolvido_no_prazo
                    ) as chamados_atrasados,
                    round(
                        100.0 * count(*) filter (where resolvido_no_prazo)
                        / nullif(count(*) filter (where data_fim is not null and prazo_atendimento is not null), 0),
                        2
                    ) as taxa_resolucao_prazo
                {base}
                  and subprefeitura is not null
                  and secretaria is not null
                group by 1, 2
            ),
            ranked as (
                select
                    *,
                    row_number() over (
                        partition by secretaria
                        order by
                            taxa_resolucao_prazo asc nulls last,
                            chamados_atrasados desc
                    ) as rn
                from agg
                where taxa_resolucao_prazo is not null
            )
            select
                subprefeitura,
                secretaria,
                chamados_atrasados,
                taxa_resolucao_prazo
            from ranked
            where rn <= 5
            order by secretaria, taxa_resolucao_prazo asc, chamados_atrasados desc
            """,
            where_values,
        )
        return self._atrasos_subpref_secretaria_cells(df)

    def _filtered_atrasos_subpref_orgao(
        self, base: str, where_values: list
    ) -> list[AtrasoOrgaoShare]:
        if not self._column_exists("subprefeitura") or not self._column_exists(
            "nome_unidade_organizacional"
        ):
            return []
        df = self.reader.fetch_df(
            f"""
            with atrasados as (
                select
                    secretaria,
                    subprefeitura,
                    nome_unidade_organizacional as orgao
                {base}
                  and subprefeitura is not null
                  and nome_unidade_organizacional is not null
                  and data_fim is not null
                  and prazo_atendimento is not null
                  and not resolvido_no_prazo
            ),
            totais as (
                select secretaria, subprefeitura, count(*) as total_atrasados
                from atrasados
                group by 1, 2
            ),
            por_orgao as (
                select secretaria, subprefeitura, orgao, count(*) as chamados_atrasados
                from atrasados
                group by 1, 2, 3
            ),
            ranked as (
                select
                    p.secretaria,
                    p.subprefeitura,
                    p.orgao,
                    p.chamados_atrasados,
                    round(100.0 * p.chamados_atrasados / t.total_atrasados, 1) as pct_do_atraso,
                    row_number() over (
                        partition by p.secretaria, p.subprefeitura
                        order by p.chamados_atrasados desc
                    ) as rn
                from por_orgao as p
                inner join totais as t
                    on p.secretaria = t.secretaria
                    and p.subprefeitura = t.subprefeitura
            )
            select secretaria, subprefeitura, orgao, chamados_atrasados, pct_do_atraso
            from ranked
            where rn <= 3
            order by secretaria, subprefeitura, chamados_atrasados desc
            """,
            where_values,
        )
        return self._atraso_orgao_share_cells(df)

    def _filtered_atrasos_regiao_orgao(
        self, base: str, where_values: list
    ) -> list[AtrasoRegiaoOrgaoShare]:
        if not self._column_exists("regiao_administrativa") or not self._column_exists(
            "nome_unidade_organizacional"
        ):
            return []
        df = self.reader.fetch_df(
            f"""
            with atrasados as (
                select
                    secretaria,
                    regiao_administrativa as regiao,
                    nome_unidade_organizacional as orgao
                {base}
                  and regiao_administrativa is not null
                  and nome_unidade_organizacional is not null
                  and data_fim is not null
                  and prazo_atendimento is not null
                  and not resolvido_no_prazo
            ),
            totais as (
                select secretaria, regiao, count(*) as total_atrasados
                from atrasados
                group by 1, 2
            ),
            por_orgao as (
                select secretaria, regiao, orgao, count(*) as chamados_atrasados
                from atrasados
                group by 1, 2, 3
            ),
            ranked as (
                select
                    p.secretaria,
                    p.regiao,
                    p.orgao,
                    p.chamados_atrasados,
                    round(100.0 * p.chamados_atrasados / t.total_atrasados, 1) as pct_do_atraso,
                    row_number() over (
                        partition by p.secretaria, p.regiao
                        order by p.chamados_atrasados desc
                    ) as rn
                from por_orgao as p
                inner join totais as t
                    on p.secretaria = t.secretaria
                    and p.regiao = t.regiao
            )
            select secretaria, regiao, orgao, chamados_atrasados, pct_do_atraso
            from ranked
            where rn <= 3
            order by secretaria, regiao, chamados_atrasados desc
            """,
            where_values,
        )
        return self._atraso_regiao_orgao_share_cells(df)

    def _filtered_categoria(self, base: str, where_values: list) -> list[CategoriaVolume]:
        if not self._column_exists("categoria"):
            return []
        df = self.reader.fetch_df(
            f"""
            select
                categoria,
                count(*) as total_chamados
            {base}
              and categoria is not null
            group by 1
            order by total_chamados desc
            """,
            where_values,
        )
        return [
            CategoriaVolume(
                categoria=str(r["categoria"]),
                total_chamados=int(r["total_chamados"]),
            )
            for r in df.iter_rows(named=True)
        ]

    def _filtered_reclamacoes(self, base: str, where_values: list) -> list[ReclamacoesPressure]:
        if not self._column_exists("reclamacoes") or not self._column_exists(
            "regiao_administrativa"
        ):
            return []
        df = self.reader.fetch_df(
            f"""
            with ranked as (
                select
                    regiao_administrativa as territorio,
                    count(*) filter (where reclamacoes >= 2) as com_reclamacoes_repetidas,
                    row_number() over (
                        order by count(*) filter (where reclamacoes >= 2) desc
                    ) as rn
                {base}
                  and regiao_administrativa is not null
                  and reclamacoes is not null
                group by 1
            )
            select territorio, com_reclamacoes_repetidas
            from ranked
            where rn <= 12
            order by com_reclamacoes_repetidas desc
            """,
            where_values,
        )
        return self._reclamacoes_pressure_cells(df)

    def _filtered_reclamacoes_subpref(
        self, base: str, where_values: list
    ) -> list[ReclamacoesPressure]:
        if not self._column_exists("subprefeitura") or not self._column_exists("reclamacoes"):
            return []
        df = self.reader.fetch_df(
            f"""
            with ranked as (
                select
                    subprefeitura as territorio,
                    count(*) filter (where reclamacoes >= 2) as com_reclamacoes_repetidas,
                    row_number() over (
                        order by count(*) filter (where reclamacoes >= 2) desc
                    ) as rn
                {base}
                  and subprefeitura is not null
                  and reclamacoes is not null
                group by 1
            )
            select territorio, com_reclamacoes_repetidas
            from ranked
            where rn <= 12
            order by com_reclamacoes_repetidas desc
            """,
            where_values,
        )
        return self._reclamacoes_pressure_cells(df)

    def _filtered_territorial(
        self,
        base: str,
        where_values: list,
        column: str,
    ) -> list[TerritorialVolume]:
        allowed = ("regiao_administrativa", "area_planejamento", "subprefeitura")
        if column not in allowed:
            return []
        if not self._column_exists(column):
            return []

        if column == "subprefeitura":
            return self._territorial_ranked_rows(
                base, where_values, column, top_n=10, worst_prazo=True
            )
        return self._territorial_ranked_rows(
            base, where_values, column, top_n=12, worst_prazo=False
        )

    def _filtered_territorial_atrasos(
        self,
        base: str,
        where_values: list,
        column: str,
    ) -> list[TerritorialVolume]:
        allowed = ("regiao_administrativa", "subprefeitura")
        if column not in allowed:
            return []
        return self._territorial_ranked_rows(
            base, where_values, column, top_n=10, worst_prazo=True
        )

    def _territorial_ranked_rows(
        self,
        base: str,
        where_values: list,
        column: str,
        *,
        top_n: int,
        worst_prazo: bool,
    ) -> list[TerritorialVolume]:
        if not self._column_exists(column):
            return []

        if worst_prazo:
            rank_order = "taxa_resolucao_prazo asc nulls last, total_chamados desc"
            outer_order = "taxa_resolucao_prazo asc, total_chamados desc"
            having_taxa = "and taxa_resolucao_prazo is not null"
        else:
            rank_order = "count(*) desc"
            outer_order = "total_chamados desc"
            having_taxa = ""

        df = self.reader.fetch_df(
            f"""
            with ranked as (
                select
                    {column} as territorio,
                    count(*) as total_chamados,
                    round(
                        100.0 * count(*) filter (where resolvido_no_prazo)
                        / nullif(count(*) filter (where data_fim is not null and prazo_atendimento is not null), 0),
                        2
                    ) as taxa_resolucao_prazo,
                    row_number() over (order by {rank_order}) as rn
                {base}
                  and {column} is not null
                group by 1
            )
            select territorio, total_chamados, taxa_resolucao_prazo
            from ranked
            where rn <= {top_n}
              {having_taxa}
            order by {outer_order}
            """,
            where_values,
        )
        return [
            TerritorialVolume(
                territorio=str(row["territorio"]),
                total_chamados=int(row["total_chamados"]),
                taxa_resolucao_prazo=row.get("taxa_resolucao_prazo"),
            )
            for row in df.iter_rows(named=True)
        ]

    @staticmethod
    def _temporal_rows(rows) -> list[TemporalPoint]:
        return [
            TemporalPoint(
                periodo=str(row["periodo"]),
                total_chamados=int(row["total_chamados"]),
                total_encerrados=int(row["total_encerrados"]),
            )
            for row in rows
        ]

    @staticmethod
    def _sla_from_row(row: dict) -> SlaBreakdown:
        return SlaBreakdown(
            no_prazo=int(row["no_prazo"]),
            fora_prazo=int(row["fora_prazo"]),
            fechado_sem_prazo=int(row["fechado_sem_prazo"]),
            em_aberto=int(row["em_aberto"]),
        )

    @staticmethod
    def _kpis_from_row(row: dict) -> DashboardKpis:
        return DashboardKpis(
            total_chamados=int(row["total_chamados"]),
            total_resolvidos=int(row["total_resolvidos"]),
            taxa_resolucao_prazo=float(row["taxa_resolucao_prazo"] or 0),
            tempo_medio_resolucao_dias=row.get("tempo_medio_resolucao_dias"),
            atualizado_em=str(row["atualizado_em"]) if row.get("atualizado_em") else None,
            chamados_abertos=int(row.get("chamados_abertos") or 0),
        )

    @staticmethod
    def _secretaria_rows(rows) -> list[SecretariaKpi]:
        return [
            SecretariaKpi(
                secretaria=str(row["secretaria"]),
                total_chamados=int(row["total_chamados"]),
                taxa_resolucao_prazo=row.get("taxa_resolucao_prazo"),
            )
            for row in rows
            if str(row["secretaria"]) in PIC_SECRETARIAS
        ]
