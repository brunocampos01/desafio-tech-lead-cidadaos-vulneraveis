from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt

from api.config import Settings
from api.rbac.models import User

_refresh_tokens: dict[str, str] = {}
_revoked_tokens: set[str] = set()


def _now() -> datetime:
    return datetime.now(tz=UTC)


def create_access_token(user: User, settings: Settings) -> str:
    """Gera JWT de acesso para chamadas na API com ``Authorization: Bearer``.

    Args:
        user: Usuário autenticado (origem: ``rbac_service.authenticate``).
        settings: ``jwt_secret``, ``jwt_algorithm``, TTL e claims OIDC.

    Returns:
        Token JWT assinado (string).
    """
    expire = _now() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "iss": settings.oidc_issuer,
        "aud": settings.oidc_audience,
        "exp": expire,
        "iat": _now(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user: User, settings: Settings) -> str:
    """Gera JWT de refresh e registra ``jti`` para validação e revogação.

    Args:
        user: Mesmo usuário do access token emitido no par.
        settings: TTL via ``refresh_token_expire_minutes``.

    Returns:
        Refresh token assinado.
    """
    token_id = str(uuid4())
    expire = _now() + timedelta(minutes=settings.refresh_token_expire_minutes)
    payload = {
        "sub": user.id,
        "jti": token_id,
        "type": "refresh",
        "iss": settings.oidc_issuer,
        "aud": settings.oidc_audience,
        "exp": expire,
        "iat": _now(),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    _refresh_tokens[token_id] = user.id
    return token


def decode_token(token: str, settings: Settings) -> dict[str, Any]:
    """Decodifica JWT validando assinatura e claims obrigatórios.

    Args:
        token: String JWT (access ou refresh).
        settings: Segredo, algoritmo, ``oidc_audience`` e ``oidc_issuer``

    Returns:
        Payload decodificado (dict)
    """
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        audience=settings.oidc_audience,
        issuer=settings.oidc_issuer,
    )


def revoke_refresh_token(token: str, settings: Settings) -> None:
    """Marca refresh como revogado pelo ``jti``

    Args:
        token: Refresh token enviado em ``POST /auth/logout`` ou antes da rotação.
        settings: Usado em ``decode_token``.
    """
    try:
        payload = decode_token(token, settings)
        if payload.get("type") == "refresh":
            _revoked_tokens.add(payload["jti"])
    except jwt.PyJWTError:
        pass


def validate_refresh_token(token: str, settings: Settings) -> User | None:
    """Valida refresh e retorna o usuário associado.

    Args:
        token: Refresh token do body ``RefreshRequest``.
        settings: Repassado a ``decode_token``.

    Returns:
        ``User`` se token for refresh válido, não revogado e usuário existir; senão ``None``.
    """
    from api.rbac.service import rbac_service

    try:
        payload = decode_token(token, settings)
    except jwt.PyJWTError:
        return None

    if payload.get("type") != "refresh":
        return None
    jti = payload.get("jti")
    if jti in _revoked_tokens:
        return None
    user_id = _refresh_tokens.get(jti) or payload.get("sub")
    if not user_id:
        return None
    return rbac_service.get_user(user_id)


def issue_token_pair(user: User, settings: Settings) -> dict[str, str]:
    """Emite par access + refresh após login ou refresh bem-sucedido.

    Args:
        user: Usuário autenticado.
        settings: Configuração JWT completa.

    Returns:
        Dict com chaves ``access_token``, ``refresh_token``, ``token_type`` (sempre ``"bearer"``).
        Compatível com ``TokenResponse`` e OAuth2 client credentials style.
    """
    return {
        "access_token": create_access_token(user, settings),
        "refresh_token": create_refresh_token(user, settings),
        "token_type": "bearer",
    }
