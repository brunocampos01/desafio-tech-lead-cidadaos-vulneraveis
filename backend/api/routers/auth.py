"""Rotas HTTP de autenticação (login, refresh, logout, perfil)."""

from __future__ import annotations

from typing import Annotated
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from api.auth.dependencies import get_current_user
from api.auth.jwt_validator import issue_token_pair, revoke_refresh_token, validate_refresh_token
from api.config import Settings, get_settings
from api.rbac.models import User
from api.rbac.service import rbac_service
from api.schemas.auth import (
    AuthCheckResponse,
    OAuthTokenRequest,
    RefreshRequest,
    TokenRequest,
    TokenResponse,
    UserResponse,
)

# Códigos mock do fluxo Authorization Code (login_hint → usuário de teste)
_MOCK_OAUTH_CODES: dict[str, str] = {
    "mock:operador": "u-operador",
    "mock:admin": "u-admin",
    "mock:super": "u-super",
}

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/token", response_model=TokenResponse)
def login(
    body: TokenRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    """Mock login: email/senha → access + refresh JWT."""
    user = rbac_service.authenticate(body.email, body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    tokens = issue_token_pair(user, settings)
    return TokenResponse(**tokens)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    body: RefreshRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    """Rotaciona refresh token (revoga o anterior e emite novo par)."""
    user = validate_refresh_token(body.refresh_token, settings)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    revoke_refresh_token(body.refresh_token, settings)
    tokens = issue_token_pair(user, settings)
    return TokenResponse(**tokens)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    body: RefreshRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> None:
    """Revoga refresh token (blocklist por ``jti``)."""
    revoke_refresh_token(body.refresh_token, settings)


@router.get("/me", response_model=UserResponse)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    """Perfil do usuário autenticado (Bearer obrigatório)."""
    return UserResponse(id=user.id, email=user.email, name=user.name, role=user.role.value)


@router.get("/authorize")
def oauth_authorize(
    redirect_uri: Annotated[str, Query(description="URI de redirect registrada no client OAuth")],
    state: Annotated[str, Query()] = "",
    login_hint: Annotated[str, Query(description="operador | admin | super")] = "operador",
) -> RedirectResponse:
    """Mock IdP: redireciona ao redirect_uri com ``code`` (sem tela Keycloak)."""
    hint = login_hint.strip().lower()
    if hint not in ("operador", "admin", "super"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid login_hint")
    code = f"mock:{hint}"
    parsed = urlparse(redirect_uri)
    merged = dict(parse_qsl(parsed.query))
    merged["code"] = code
    if state:
        merged["state"] = state
    location = urlunparse(parsed._replace(query=urlencode(merged)))
    return RedirectResponse(url=location, status_code=status.HTTP_302_FOUND)


@router.post("/oauth/token", response_model=TokenResponse)
def oauth_token(
    body: OAuthTokenRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    """Troca ``code`` mock por par de tokens (equivalente ao token endpoint OIDC)."""
    if body.grant_type != "authorization_code":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported grant_type")
    user_id = _MOCK_OAUTH_CODES.get(body.code)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization code")
    user = rbac_service.get_user(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    tokens = issue_token_pair(user, settings)
    return TokenResponse(**tokens)


@router.get("/check", response_model=AuthCheckResponse)
def check_auth(user: Annotated[User, Depends(get_current_user)]) -> AuthCheckResponse:
    """Validação de sessão (equivalente a check-auth dados.rio)."""
    return AuthCheckResponse(
        authenticated=True,
        user=UserResponse(id=user.id, email=user.email, name=user.name, role=user.role.value),
    )
