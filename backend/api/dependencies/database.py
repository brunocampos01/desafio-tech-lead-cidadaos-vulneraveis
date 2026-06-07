from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import duckdb
import polars as pl

from api.config import Settings


class DuckDBReader:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._conn: duckdb.DuckDBPyConnection | None = None
        # DuckDBPyConnection não é thread-safe; uvicorn atende requests em paralelo.
        # shared DuckDB connection to avoid race conditions
        # Only one thread can execute SQL 
        # Can a dashboard execute multiple queries? Yes, but in serial
        self._lock = threading.Lock()

    @property
    def path(self) -> Path:
        return self.settings.duckdb_file

    def connect(self) -> duckdb.DuckDBPyConnection:
        """Abre ou reutiliza a conexão read-only ao DuckDB.

        Returns:
            Conexão ativa para executar SQL.
        """
        if self._conn is None:
            if not self.path.exists():
                raise FileNotFoundError(f"DuckDB not found at {self.path}. Run dbt first.")
            self._conn = duckdb.connect(str(self.path), read_only=True)
        return self._conn

    def read_table(self, table: str) -> pl.DataFrame:
        """``SELECT *`` de main_mart.{table}"""
        return self.fetch_df(f"select * from main_mart.{table}")

    def fetch_df(self, sql: str, params: list[Any] | None = None) -> pl.DataFrame:
        """Executa SQL parametrizado e retorna um DataFrame Polars."""
        with self._lock:
            conn = self.connect()
            result = conn.execute(sql, params or [])
            return pl.from_pandas(result.df())

    def fetch_scalar(self, sql: str, params: list[Any] | None = None) -> Any:
        """Executa SQL e retorna a primeira célula da primeira linha (ex.: ``COUNT(*)``)."""
        with self._lock:
            conn = self.connect()
            row = conn.execute(sql, params or []).fetchone()
            return row[0] if row else None

# Precisa ficar no MÓDULO (fora da função); 
# NOTE: antes estava dentro da função o q fazia toda chamada recria o reader.
_reader: DuckDBReader | None = None

def get_reader(settings: Settings) -> DuckDBReader:
    """Retorna o ``DuckDBReader`` compartilhado do processo (cria na primeira chamada).

    ``_reader`` no módulo:
      - Uma instância por worker uvicorn (evita ``duckdb.connect()`` a cada request).
      - O mesmo ``DuckDBReader`` e o mesmo ``_conn`` servem listagem, dashboard e export.
      - SQL serializado por ``DuckDBReader._lock`` (conexão não é thread-safe).

    Returns:
        Instância compartilhada de ``DuckDBReader``.
    """
    global _reader
    if _reader is None:
        _reader = DuckDBReader(settings)
    return _reader
