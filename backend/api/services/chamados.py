from __future__ import annotations

import math
from datetime import date

from api.cache import cached
from api.config import Settings
from api.dependencies.database import DuckDBReader
from api.schemas.chamados import (
    ChamadoItem,
    ChamadosQueryParams,
    FilterOptions,
    PaginatedChamados,
)
from api.services.chamados_query import (
    CHAMADOS_TABLE,
    FILTER_COLUMNS,
    build_where,
    resolve_sort_column,
)

_SELECT_COLUMNS = """
    id_chamado, data_inicio, data_fim, prazo_atendimento,
    tipo, subtipo, status, situacao, longitude, latitude,
    data_particao, secretaria, dias_resolucao, resolvido_no_prazo
"""


class ChamadosService:
    def __init__(self, reader: DuckDBReader, settings: Settings) -> None:
        self.reader = reader
        self.settings = settings

    def list(self, params: ChamadosQueryParams) -> PaginatedChamados:
        cache_params = params.model_dump()

        def factory() -> PaginatedChamados:
            where_sql, where_values = build_where(params)
            total = int(
                self.reader.fetch_scalar(
                    f"select count(*) from {CHAMADOS_TABLE} where {where_sql}",
                    where_values,
                )
                or 0
            )
            pages = max(1, math.ceil(total / params.page_size)) if total else 1
            page = min(params.page, pages)
            offset = (page - 1) * params.page_size
            sort_col = resolve_sort_column(params.sort_by)
            direction = "desc" if params.sort_order == "desc" else "asc"

            page_df = self.reader.fetch_df(
                f"""
                select {_SELECT_COLUMNS}
                from {CHAMADOS_TABLE}
                where {where_sql}
                order by {sort_col} {direction} nulls last
                limit ? offset ?
                """,
                [*where_values, params.page_size, offset],
            )

            items = [
                ChamadoItem(**self._row_to_dict(row))
                for row in page_df.iter_rows(named=True)
            ]
            return PaginatedChamados(
                items=items,
                total=total,
                page=page,
                page_size=params.page_size,
                pages=pages,
            )

        return cached("chamados:list", cache_params, factory)

    def filters(self, params: ChamadosQueryParams) -> FilterOptions:
        filter_params = params.model_dump(
            exclude={"page", "page_size", "sort_by", "sort_order"},
            exclude_none=True,
        )

        def factory() -> FilterOptions:
            where_sql, where_values = build_where(params)
            return FilterOptions(
                tipos=self._distinct("tipo", where_sql, where_values),
                subtipos=self._distinct("subtipo", where_sql, where_values),
                secretarias=self._distinct("secretaria", where_sql, where_values),
                statuses=self._distinct("status", where_sql, where_values),
                situacoes=self._distinct("situacao", where_sql, where_values),
            )

        return cached("chamados:filters", filter_params, factory)

    def export_rows(self, params: ChamadosQueryParams) -> list[dict]:
        where_sql, where_values = build_where(params)
        sort_col = resolve_sort_column(params.sort_by)
        direction = "desc" if params.sort_order == "desc" else "asc"
        df = self.reader.fetch_df(
            f"""
            select {_SELECT_COLUMNS}
            from {CHAMADOS_TABLE}
            where {where_sql}
            order by {sort_col} {direction} nulls last
            """,
            where_values,
        )
        return [self._row_to_dict(row) for row in df.iter_rows(named=True)]

    def _distinct(
        self, column: str, where_sql: str, where_values: list
    ) -> list[str]:
        if column not in FILTER_COLUMNS:
            return []
        df = self.reader.fetch_df(
            f"""
            select distinct {column} as value
            from {CHAMADOS_TABLE}
            where {where_sql} and {column} is not null
            order by 1
            """,
            where_values,
        )
        return [str(v) for v in df["value"].to_list()]

    @staticmethod
    def _row_to_dict(row: dict) -> dict:
        result = {}
        for key, value in row.items():
            if isinstance(value, date):
                result[key] = value.isoformat()
            elif hasattr(value, "isoformat"):
                result[key] = value.isoformat()
            else:
                result[key] = value
        return result
