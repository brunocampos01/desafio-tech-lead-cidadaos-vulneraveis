from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from api.auth.dependencies import require_role
from api.config import Settings, get_settings
from api.dependencies.database import get_reader
from api.rbac.models import Role, User
from api.schemas.chamados import ChamadosQueryParams, FilterOptions, PaginatedChamados
from api.services.chamados import ChamadosService

router = APIRouter(prefix="/api/v1/chamados", tags=["chamados"])


def get_chamados_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> ChamadosService:
    return ChamadosService(get_reader(settings), settings)


@router.get("", response_model=PaginatedChamados)
def list_chamados(
    params: Annotated[ChamadosQueryParams, Depends()],
    service: Annotated[ChamadosService, Depends(get_chamados_service)],
    _: Annotated[User, Depends(require_role(Role.OPERADOR))],
) -> PaginatedChamados:
    return service.list(params)


@router.get("/filters", response_model=FilterOptions)
def get_filters(
    params: Annotated[ChamadosQueryParams, Depends()],
    service: Annotated[ChamadosService, Depends(get_chamados_service)],
    _: Annotated[User, Depends(require_role(Role.OPERADOR))],
) -> FilterOptions:
    return service.filters(params)
