from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.auth.jwt_validator import create_access_token
from api.config import Settings, get_settings
from api.main import app
from api.rbac.service import DEFAULT_USERS, rbac_service


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def settings() -> Settings:
    return get_settings()


def auth_headers(user_id: str) -> dict[str, str]:
    user = rbac_service.get_user(user_id)
    assert user is not None
    token = create_access_token(user, get_settings())
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def operador_headers() -> dict[str, str]:
    return auth_headers("u-operador")


@pytest.fixture
def admin_headers() -> dict[str, str]:
    return auth_headers("u-admin")


@pytest.fixture
def super_headers() -> dict[str, str]:
    return auth_headers("u-super")


@pytest.fixture(autouse=True)
def reset_rbac_roles() -> None:
    yield
    for uid, data in DEFAULT_USERS.items():
        user = rbac_service.get_user(uid)
        if user:
            rbac_service.store.users[uid] = user.model_copy(update={"role": data["role"]})
