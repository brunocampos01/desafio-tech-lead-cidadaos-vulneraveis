from __future__ import annotations

import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from api.auth.dependencies import require_role
from api.rbac.models import Role, User
from api.schemas.chamados import ChamadosQueryParams
from api.routers.chamados import get_chamados_service
from api.services.chamados import ChamadosService

router = APIRouter(prefix="/api/v1/export", tags=["export"])


@router.get("")
def export_chamados(
    params: Annotated[ChamadosQueryParams, Depends()],
    service: Annotated[ChamadosService, Depends(get_chamados_service)],
    _: Annotated[User, Depends(require_role(Role.OPERADOR))],
) -> StreamingResponse:
    rows = service.export_rows(params)
    if not rows:
        rows = [{}]

    output = io.StringIO()
    headers = list(rows[0].keys())
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=chamados.csv"},
    )
