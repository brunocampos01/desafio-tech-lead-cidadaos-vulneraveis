from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class ChamadoItem(BaseModel):
    id_chamado: str
    data_inicio: str | None = None
    data_fim: str | None = None
    prazo_atendimento: str | None = None
    tipo: str | None = None
    subtipo: str | None = None
    status: str | None = None
    situacao: str | None = None
    longitude: float | None = None
    latitude: float | None = None
    data_particao: str | None = None
    secretaria: str | None = None
    dias_resolucao: int | None = None
    resolvido_no_prazo: bool | None = None


class ChamadosQueryParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    q: str | None = Field(
        default=None,
        description="Busca textual em id, tipo, subtipo, secretaria, status, situação",
    )
    tipo: str | None = None
    subtipo: str | None = None
    secretaria: str | None = None
    status: str | None = None
    situacao: str | None = None
    data_inicio_from: date | None = None
    data_inicio_to: date | None = None
    sort_by: str = "data_inicio"
    sort_order: Literal["asc", "desc"] = "desc"


class PaginatedChamados(BaseModel):
    items: list[ChamadoItem]
    total: int
    page: int
    page_size: int
    pages: int


class FilterOptions(BaseModel):
    tipos: list[str]
    subtipos: list[str]
    secretarias: list[str]
    statuses: list[str]
    situacoes: list[str]
