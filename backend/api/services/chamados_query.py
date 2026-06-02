from __future__ import annotations

from typing import Any

from api.schemas.chamados import ChamadosQueryParams

FILTER_COLUMNS = ("tipo", "subtipo", "secretaria", "status", "situacao")
SEARCH_COLUMNS = ("id_chamado", "tipo", "subtipo", "secretaria", "status", "situacao")
ALLOWED_SORT = {
    "id_chamado",
    "data_inicio",
    "data_fim",
    "tipo",
    "subtipo",
    "secretaria",
    "status",
    "situacao",
    "resolvido_no_prazo",
}

CHAMADOS_TABLE = "main_mart.mart_chamados"
PIC_SCOPE_SQL = "secretaria in ('SMS', 'SME', 'SMAS')"


def resolve_sort_column(sort_by: str) -> str:
    return sort_by if sort_by in ALLOWED_SORT else "data_inicio"


def build_where(params: ChamadosQueryParams) -> tuple[str, list[Any]]:
    """Parameterized WHERE clause for mart_chamados (no string interpolation of user values)."""
    clauses: list[str] = []
    values: list[Any] = []

    for col in FILTER_COLUMNS:
        value = getattr(params, col)
        if value:
            clauses.append(f"{col} = ?")
            values.append(value)

    if params.data_inicio_from:
        clauses.append("cast(data_inicio as date) >= ?")
        values.append(params.data_inicio_from)
    if params.data_inicio_to:
        clauses.append("cast(data_inicio as date) <= ?")
        values.append(params.data_inicio_to)

    if params.q and params.q.strip():
        pattern = f"%{params.q.strip()}%"
        search_parts = [f"cast({col} as varchar) ilike ?" for col in SEARCH_COLUMNS]
        clauses.append(f"({' OR '.join(search_parts)})")
        values.extend([pattern] * len(SEARCH_COLUMNS))

    predicate = " AND ".join(clauses) if clauses else "1=1"
    return f"({predicate}) AND {PIC_SCOPE_SQL}", values


def has_active_filters(params: ChamadosQueryParams) -> bool:
    return bool(
        params.q
        or params.tipo
        or params.subtipo
        or params.secretaria
        or params.status
        or params.situacao
        or params.data_inicio_from
        or params.data_inicio_to
    )
