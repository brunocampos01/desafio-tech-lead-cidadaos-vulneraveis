from __future__ import annotations


def test_operador_can_read_chamados(client, operador_headers):
    resp = client.get("/api/v1/chamados?page=1&page_size=5", headers=operador_headers)
    assert resp.status_code == 200


def test_operador_cannot_grant_roles(client, operador_headers):
    resp = client.post(
        "/api/v1/users/u-admin/roles",
        json={"role": "operador"},
        headers=operador_headers,
    )
    assert resp.status_code == 403


def test_operador_cannot_list_users(client, operador_headers):
    resp = client.get("/api/v1/users", headers=operador_headers)
    assert resp.status_code == 403


def test_admin_can_grant_operador(client, admin_headers):
    resp = client.post(
        "/api/v1/users/u-admin/roles",
        json={"role": "operador"},
        headers=admin_headers,
    )
    assert resp.status_code == 200


def test_admin_cannot_grant_admin(client, admin_headers):
    resp = client.post(
        "/api/v1/users/u-admin/roles",
        json={"role": "admin"},
        headers=admin_headers,
    )
    assert resp.status_code == 403


def test_admin_cannot_grant_super_admin(client, admin_headers):
    resp = client.post(
        "/api/v1/users/u-operador/roles",
        json={"role": "super_admin"},
        headers=admin_headers,
    )
    assert resp.status_code == 403


def test_admin_can_revoke_operador(client, admin_headers):
    """u-operador já é operador; admin pode revogar (rebaixa permanece operador)."""
    resp = client.delete("/api/v1/users/u-operador/roles", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "operador"


def test_admin_cannot_revoke_admin(client, admin_headers):
    resp = client.delete("/api/v1/users/u-admin/roles", headers=admin_headers)
    assert resp.status_code == 403


def test_super_admin_can_grant_admin(client, super_headers):
    resp = client.post(
        "/api/v1/users/u-operador/roles",
        json={"role": "admin"},
        headers=super_headers,
    )
    assert resp.status_code == 200
    restore = client.post(
        "/api/v1/users/u-operador/roles",
        json={"role": "operador"},
        headers=super_headers,
    )
    assert restore.status_code == 200


def test_super_admin_cannot_grant_super_admin(client, super_headers):
    resp = client.post(
        "/api/v1/users/u-operador/roles",
        json={"role": "super_admin"},
        headers=super_headers,
    )
    assert resp.status_code == 403


def test_super_admin_can_revoke_admin(client, super_headers):
    client.post(
        "/api/v1/users/u-operador/roles",
        json={"role": "admin"},
        headers=super_headers,
    )
    resp = client.delete("/api/v1/users/u-operador/roles", headers=super_headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "operador"
    client.post(
        "/api/v1/users/u-operador/roles",
        json={"role": "operador"},
        headers=super_headers,
    )
