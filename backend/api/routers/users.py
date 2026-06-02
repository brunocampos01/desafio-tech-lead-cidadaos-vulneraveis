from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from api.auth.dependencies import require_role
from api.rbac.models import Role, User
from api.rbac.service import rbac_service
from api.schemas.users import RoleGrantRequest, UserListResponse

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("", response_model=UserListResponse)
def list_users(
    _: Annotated[User, Depends(require_role(Role.ADMIN))],
) -> UserListResponse:
    items = [
        {"id": u.id, "email": u.email, "name": u.name, "role": u.role.value}
        for u in rbac_service.list_users()
    ]
    return UserListResponse(items=items)


@router.post("/{user_id}/roles")
def grant_role(
    user_id: str,
    body: RoleGrantRequest,
    actor: Annotated[User, Depends(require_role(Role.ADMIN))],
) -> dict[str, str]:
    try:
        user = rbac_service.grant_role(actor, user_id, body.role)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"id": user.id, "role": user.role.value}


@router.delete("/{user_id}/roles")
def revoke_role(
    user_id: str,
    actor: Annotated[User, Depends(require_role(Role.ADMIN))],
) -> dict[str, str]:
    try:
        user = rbac_service.revoke_role(actor, user_id)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"id": user.id, "role": user.role.value}
