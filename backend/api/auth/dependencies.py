from __future__ import annotations

from typing import Annotated, Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from api.auth.jwt_validator import decode_token
from api.config import Settings, get_settings
from api.rbac.models import ROLE_HIERARCHY, Role, User
from api.rbac.service import rbac_service

# falta de Bearer vira 401
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    "Resolve o usuário autenticado a partir do header ``Authorization: Bearer``."
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        payload = decode_token(credentials.credentials, settings)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user = rbac_service.get_user(payload["sub"])
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(min_role: Role) -> Callable[..., User]:
    """Cria dependência que exige papel mínimo na hierarquia RBAC.

    Hierarquia: ``operador`` (0) < ``admin`` (1) < ``super_admin`` (2).

    Args:
        min_role: Papel mínimo aceito no endpoint.

    Returns:
        Função ``_checker`` usável em ``Depends(...)``; repassa o ``User`` se autorizado.

    Raises:
        HTTPException: 403 se ``ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[min_role]``.
    """

    async def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[min_role]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _checker
