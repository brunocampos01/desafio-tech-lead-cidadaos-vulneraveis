from __future__ import annotations

from pydantic import BaseModel


class DataMetaResponse(BaseModel):
    """Metadados da carga local (dbt / DuckDB)."""

    atualizado_em: str | None = None
    data_particao_max: str | None = None
