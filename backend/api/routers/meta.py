from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from api.auth.dependencies import require_role
from api.cache import cached
from api.config import Settings, get_settings
from api.dependencies.database import get_reader
from api.rbac.models import Role, User
from api.schemas.meta import DataMetaResponse

router = APIRouter(prefix="/api/v1/meta", tags=["meta"])


@router.get("/data", response_model=DataMetaResponse)
def get_data_meta(
    settings: Annotated[Settings, Depends(get_settings)],
    _: Annotated[User, Depends(require_role(Role.OPERADOR))],
) -> DataMetaResponse:
    reader = get_reader(settings)

    def factory() -> DataMetaResponse:
        kpi_row = reader.fetch_df(
            "select atualizado_em from main_mart.mart_dashboard_pic_kpis",
        ).row(0, named=True)
        atualizado = kpi_row.get("atualizado_em")
        return DataMetaResponse(
            atualizado_em=str(atualizado) if atualizado is not None else None,
        )

    return cached("data_meta", {}, factory)
