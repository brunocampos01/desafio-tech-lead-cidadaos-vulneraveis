# Desafio Técnico - Tech Lead — Programa Pequenos Cariocas (PIC)

Sistema de monitoramento de chamados.

![Dashboard — Programa Pequenos Cariocas](docs/tela_dash.png)

Decisões técnicas detalhadas: [docs/decisoes.md](docs/decisoes.md)

## Pré-requisitos

- **Python 3.12 ou 3.13** — dependências em [requirements.txt](requirements.txt) (pipeline, backend, BigQuery, testes)
- **Node.js 20+** (frontend)

## Como rodar

Se ainda não tiver os dados em `data/raw/`, veja [Download de dados no BigQuery](#download-de-dados-no-bigquery).

**Ambiente Python (raiz do repositório):**

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 1. Pipeline

**dbt (a partir de `pipeline/`):**

```bash
source .venv/bin/activate

cd pipeline
dbt seed --full-refresh   # secretaria_tipo_mapping
dbt run
dbt test
```

**Output:** `data/pic.duckdb`

### 2. Backend
Terminal 1
```bash
source .venv/bin/activate

cd backend
DUCKDB_PATH=data/pic.duckdb uvicorn api.main:app --reload --port 8000
```

OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend
Terminal 2
```bash
source .venv/bin/activate

cd frontend
npm install
npm run dev
```

UI: [http://localhost:3000](http://localhost:3000)

### Parar e reiniciar serviços
Parar tudo (dev local — portas 8000 e 3000)

```bash
kill -9 $(lsof -ti :8000) $(lsof -ti :3000) 2>/dev/null
```

## Usuários de teste


| E-mail                                        | Senha | Role        |
| --------------------------------------------- | ----- | ----------- |
| [operador@test.com](mailto:operador@test.com) | test  | operador    |
| [admin@test.com](mailto:admin@test.com)       | test  | admin       |
| [super@test.com](mailto:super@test.com)       | test  | super_admin |


## Download de dados no BigQuery

#### 1. Projeto GCP e billing

1. [Google Cloud Console](https://console.cloud.google.com/) — criar/selecionar projeto
2. Vincular conta de faturamento

#### 2. Autenticação

A extração usa a lib `basedosdados`. Na **primeira execução** abre um fluxo OAuth no navegador ("PyData Google Auth") e salva as credenciais em `~/.config/pydata/pydata_google_credentials.json`; as próximas execuções reaproveitam o cache.

#### 3. Download

O [`extract_bigquery.py`](pipeline/scripts/extract_bigquery.py) extrai só o bruto (`data_particao >= '2023-01-01'`) para `data/raw/*.parquet`. Tabelas cujo Parquet já existe em `data/raw/` são **puladas** — a re-execução é idempotente;

```bash
source .venv/bin/activate

python pipeline/scripts/extract_bigquery.py --billing-project <PROJECT_ID>
```

### Schemas

```bash
source .venv/bin/activate

python pipeline/scripts/generate_schema_docs.py --billing-project <PROJECT_ID>
```

Gera [docs/bigquery_schemas.md](docs/bigquery_schemas.md)

## Testes (local)

```bash
# Pipeline
cd pipeline && dbt test

# Backend
cd backend && PYTHONPATH=. pytest tests/ -v

# Frontend
cd frontend && npm run lint && npm run build
```

## CI (GitHub Actions)

Dispara em **push** e **pull request** para `main` / `master`.

| Job | O que roda |
|-----|------------|
| **backend** | `ruff check backend/` + `pytest` (auth e RBAC; sem DuckDB) |
| **frontend** | `npm ci`, `npm run lint`, `npm run build` (Node 20) |

NOTE: os commits estao todos padronizados.


---

<p  align="left">
	<br/>
	<a href="mailto:brunocampos01@gmail.com" target="_blank"><img src="https://github.com/brunocampos01/brunocampos01/blob/main/images/email.png" width="30">
	</a>
	<a href="https://stackoverflow.com/users/8329698/bruno-campos" target="_blank"><img src="https://github.com/brunocampos01/brunocampos01/blob/main/images/stackoverflow.png" width="30">
	</a>
	<a href="https://www.linkedin.com/in/brunocampos01" target="_blank"><img src="https://github.com/brunocampos01/brunocampos01/blob/main/images/linkedin.png" width="30">
	</a>
	<a href="https://github.com/brunocampos01" target="_blank"><img src="https://github.com/brunocampos01/brunocampos01/blob/main/images/github.png" width="30"></a>
	<a href="https://medium.com/@brunocampos01" target="_blank"><img src="https://github.com/brunocampos01/brunocampos01/blob/main/images/medium.png" width="30">
	</a>
    <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png",  align="right" />
    </a>
    <br/>
