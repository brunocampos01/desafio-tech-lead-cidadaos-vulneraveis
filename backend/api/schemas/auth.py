from __future__ import annotations

from pydantic import BaseModel, EmailStr


class TokenRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str


class AuthCheckResponse(BaseModel):
    authenticated: bool
    user: UserResponse | None = None


class OAuthTokenRequest(BaseModel):
    grant_type: str = "authorization_code"
    code: str
    redirect_uri: str
