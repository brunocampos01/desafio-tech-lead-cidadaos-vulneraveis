from __future__ import annotations

import jwt


def test_login_success(client):
    resp = client.post("/auth/token", json={"email": "operador@test.com", "password": "test"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_invalid_credentials(client):
    resp = client.post("/auth/token", json={"email": "operador@test.com", "password": "wrong"})
    assert resp.status_code == 401


def test_protected_route_without_token(client):
    resp = client.get("/api/v1/chamados")
    assert resp.status_code == 401


def test_expired_token(client, settings):
    user = __import__("api.rbac.service", fromlist=["rbac_service"]).rbac_service.list_users()[0]
    expire = __import__("datetime").datetime.now(__import__("datetime").UTC) - __import__("datetime").timedelta(hours=1)
    payload = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "iss": settings.oidc_issuer,
        "aud": settings.oidc_audience,
        "exp": expire,
        "iat": expire,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    resp = client.get("/api/v1/chamados", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_refresh_token(client):
    login = client.post("/auth/token", json={"email": "operador@test.com", "password": "test"})
    refresh = client.post("/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert refresh.status_code == 200
    data = refresh.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != login.json()["refresh_token"]


def test_refresh_token_rotation(client):
    login = client.post("/auth/token", json={"email": "operador@test.com", "password": "test"})
    old_refresh = login.json()["refresh_token"]
    refresh = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert refresh.status_code == 200
    reused = client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401


def test_logout_revokes_refresh_token(client):
    login = client.post("/auth/token", json={"email": "operador@test.com", "password": "test"})
    refresh_token = login.json()["refresh_token"]
    logout = client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert logout.status_code == 204
    refresh = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh.status_code == 401


def test_auth_me(client, operador_headers):
    resp = client.get("/auth/me", headers=operador_headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "operador"
