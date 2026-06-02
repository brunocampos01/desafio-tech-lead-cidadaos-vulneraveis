from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from api.auth.dependencies import require_role
from api.config import Settings, get_settings
from api.dependencies.database import get_reader
from api.rbac.models import Role, User
from api.schemas.chamados import ChamadosQueryParams
from api.schemas.dashboard import DashboardResponse
from api.services.dashboard import DashboardService

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    params: Annotated[ChamadosQueryParams, Depends()],
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[User, Depends(require_role(Role.OPERADOR))],
) -> DashboardResponse:
    service = DashboardService(get_reader(settings), settings)
    return service.get_dashboard(params)
