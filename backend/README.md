# Backend — FastAPI

API REST para monitoramento de chamados 1746 / PIC.

Detalhes de cache, concorrência DuckDB, autenticação (fluxo + diagramas) e Keycloak: [`docs/decisoes.md`](../docs/decisoes.md).

## Variáveis de ambiente

Todas as configurações abaixo são campos da classe `Settings` em [`api/config.py`](api/config.py), carregados via [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/). O app usa `get_settings()` em todo o backend (CORS, JWT, DuckDB, cache, etc.).


| Variável | Default | Descrição |
|----------|---------|-----------|
| `DUCKDB_PATH` | `data/pic.duckdb` | path do DuckDB |
| `JWT_SECRET` | `dev-secret` | secret JWT |
| `AUTH_MODE` | `mock` | `mock` ou `keycloak` |
| `CACHE_TTL_SECONDS` | `600` | Tempo de vida do cache in-memory da API |
| `CORS_ORIGINS` | `http://localhost:3000` | Cross-Origin Resource Sharing |

### De onde vêm os valores (ordem de prioridade)
1. **Variáveis de ambiente** do sistema (`export DUCKDB_PATH=...`)
2. Arquivo **`.env`** na pasta de trabalho ao subir o uvicorn (geralmente `backend/.env`), se existir
3. **Defaults** definidos em `api/config.py`, se nada for informado

## API — contrato

A API lê o DuckDB produzido pelo dbt (`main_mart.*`). O frontend consome apenas HTTP (`Authorization: Bearer`); não acessa banco nem aplica filtros/paginação nos dados.

| Requisito | Como é atendido |
|-----------|----------------|
| Dados transformados | Marts dbt materializados em `data/pic.duckdb` |
| Filtro, busca, ordenação, paginação | Query params na API; SQL no DuckDB (`LIMIT`/`OFFSET`) |
| Dataset completo só no export | Listagem sempre paginada; export sem `page`/`page_size` |
| Dashboard agregado no dbt | Sem filtros: lê `mart_dashboard_*`; com filtros: SQL espelhando marts (ver `docs/decisoes.md`) |
| Cache | `api/cache.py` + `CACHE_TTL_SECONDS` (ver [`docs/decisoes.md`](../docs/decisoes.md)) |

### Endpoints de dados

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/chamados` | Listagem paginada de chamados |
| `GET` | `/api/v1/chamados/filters` | Opções de filtro em cascata (refletem o contexto atual) |
| `GET` | `/api/v1/dashboard` | KPIs + séries temporais + métricas por secretaria |
| `GET` | `/api/v1/export` | Exportação CSV de todas as linhas **filtradas** (sem paginação) |
| `GET` | `/api/v1/auth` | Validação do token (padrão dados.rio) |

Autenticação mock: `POST /auth/token` com email/senha. Usuários de teste, RBAC e fluxo completo: [`docs/decisoes.md`](../docs/decisoes.md#4-controle-de-acesso-rbac--6).

### Parâmetros de query (`ChamadosQueryParams`)

| Parâmetro | Tipo | Default | Uso |
|-----------|------|---------|-----|
| `page` | int | `1` | Página (somente listagem) |
| `page_size` | int | `20` (máx. 100) | Itens por página (somente listagem) |
| `q` | string | — | Busca textual (`ilike` em id, tipo, subtipo, secretaria, status, situação) |
| `tipo`, `subtipo`, `secretaria`, `status`, `situacao` | string | — | Filtros de igualdade |
| `data_inicio_from`, `data_inicio_to` | date | — | Intervalo de `data_inicio` |
| `sort_by` | string | `data_inicio` | Coluna de ordenação (whitelist no backend) |
| `sort_order` | `asc` \| `desc` | `desc` | Direção da ordenação |

Todas as rotas de dados exigem header `Authorization: Bearer <access_token>` (obtido em `POST /auth/token`).

**Exemplos de URL** (base: `http://localhost:8000`):

```http
# Listagem — página 2, 10 itens por página, ordenado por tipo
GET /api/v1/chamados?page=2&page_size=10&sort_by=tipo&sort_order=asc

# Busca textual + filtro por secretaria
GET /api/v1/chamados?q=saude&secretaria=SMS&page=1&page_size=20

# Filtros combinados + intervalo de datas (ISO: YYYY-MM-DD)
GET /api/v1/chamados?tipo=Educacao&status=ABERTO&data_inicio_from=2024-01-01&data_inicio_to=2024-12-31

# Opções de filtro em cascata (ex.: só subtipos possíveis para SMS)
GET /api/v1/chamados/filters?secretaria=SMS

# Dashboard global (lê marts dbt — sem query params)
GET /api/v1/dashboard

# Dashboard com os mesmos filtros da listagem
GET /api/v1/dashboard?secretaria=SME&data_inicio_from=2024-06-01

# Export CSV com filtros atuais (sem page/page_size)
GET /api/v1/export?secretaria=SMAS&situacao=Resolvido
```

### Tabelas dbt consumidas

| Tabela | Endpoint |
|--------|----------|
| `main_mart.mart_chamados` | Listagem, filtros, export; base do dashboard **com** filtros |
| `main_mart.mart_dashboard_pic_kpis` | Dashboard **sem** filtros + meta `atualizado_em` |
| `main_mart.mart_dashboard_pic_temporal` | Dashboard **sem** filtros |
| `main_mart.mart_dashboard_by_secretaria` | Gráfico por secretaria (PIC) |

## Autenticação

Endpoints mock: `POST /auth/token`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/check`, `GET /api/v1/auth`. Usuários de teste, RBAC, fluxo e Keycloak: [`docs/decisoes.md`](../docs/decisoes.md).

## Atendimento aos requisitos de frontend

O frontend consome **somente** esta API (HTTP + Bearer). Os itens abaixo correspondem ao **§3 API** do enunciado do desafio.

| Requisito (enunciado) | Implementação |
|-----------------------|---------------|
| API serve dados transformados; filtragem, busca, ordenação e paginação na API — frontend não acessa banco nem opera sobre os dados | DuckDB (`data/pic.duckdb`) é lido só no backend ([`api/dependencies/database.py`](api/dependencies/database.py)). O Next.js chama REST via [`frontend/lib/api-client.ts`](../frontend/lib/api-client.ts); filtros e SQL ficam em [`api/services/chamados.py`](api/services/chamados.py) e [`api/services/chamados_query.py`](api/services/chamados_query.py). |
| Listagem paginada; frontend nunca recebe o dataset completo, exceto na exportação | `GET /api/v1/chamados` retorna `PaginatedChamados` (`page`, `page_size`, `total`, `items`) com `LIMIT`/`OFFSET` no SQL. `GET /api/v1/export` é a única rota sem paginação (CSV de todas as linhas **filtradas**). |
| Endpoint de dashboard com indicadores agregados no dbt | `GET /api/v1/dashboard` lê marts `mart_dashboard_pic_*` e `mart_dashboard_by_secretaria` materializados no pipeline ([`api/services/dashboard.py`](api/services/dashboard.py)). |
| Cache — dataset não relido da fonte a cada requisição | [`api/cache.py`](api/cache.py) (`TTLCache`, chave por prefixo + query params). Listagem, filtros em cascata e dashboard passam por `cached()`; TTL em `CACHE_TTL_SECONDS` (default 600 s). Conexão DuckDB reutilizada no mesmo processo ([`DuckDBReader`](api/dependencies/database.py)). |
| API rodando localmente com documentação de execução | Quick start na raiz do repositório: [`README.md`](../README.md#2-backend). |
