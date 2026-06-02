from __future__ import annotations

from pydantic import BaseModel

from api.rbac.models import Role


class RoleGrantRequest(BaseModel):
    role: Role


class UserListResponse(BaseModel):
    items: list[dict[str, str]]
