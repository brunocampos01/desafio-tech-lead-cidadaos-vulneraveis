from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, EmailStr, Field


class Role(StrEnum):
    OPERADOR = "operador"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


ROLE_HIERARCHY: dict[Role, int] = {
    Role.OPERADOR: 0,
    Role.ADMIN: 1,
    Role.SUPER_ADMIN: 2,
}


class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: Role


class UserStore(BaseModel):
    users: dict[str, User] = Field(default_factory=dict)
