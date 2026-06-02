from __future__ import annotations


def test_pagination(client, operador_headers):
    resp = client.get("/api/v1/chamados?page=1&page_size=10", headers=operador_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) <= 10
    assert data["total"] > 0
    assert data["page"] == 1


def test_filter_cascade(client, operador_headers):
    resp = client.get("/api/v1/chamados/filters?secretaria=SMS", headers=operador_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "tipos" in data
    assert "subtipos" in data


def test_dashboard(client, operador_headers):
    resp = client.get("/api/v1/dashboard", headers=operador_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "kpis" in data
    assert data["kpis"]["total_chamados"] > 0


def test_export_csv(client, operador_headers):
    resp = client.get("/api/v1/export", headers=operador_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]


def test_search_q(client, operador_headers):
    resp = client.get("/api/v1/chamados?q=Saúde&page=1&page_size=10", headers=operador_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 0
    if data["items"]:
        row = data["items"][0]
        haystack = " ".join(
            str(row.get(k, "") or "")
            for k in ("id_chamado", "tipo", "subtipo", "secretaria", "status", "situacao")
        ).lower()
        assert "saúde" in haystack or "saude" in haystack


def test_dashboard_with_filter(client, operador_headers):
    resp = client.get("/api/v1/dashboard?secretaria=SMS", headers=operador_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["kpis"]["total_chamados"] > 0
    for row in data["by_secretaria"]:
        assert row["secretaria"] == "SMS"


def test_dashboard_search_q(client, operador_headers):
    """Busca no dashboard usa o mesmo ``q`` da listagem; deve responder 200 mesmo sem match."""
    resp = client.get(
        "/api/v1/dashboard?q=__id_inexistente_xyz__",
        headers=operador_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["kpis"]["total_chamados"] == 0
    assert data["temporal"] == []
    assert data["by_secretaria"] == []
