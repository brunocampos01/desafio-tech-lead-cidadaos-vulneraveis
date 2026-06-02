"""Cache in-memory de respostas da API (TTL configurável via CACHE_TTL_SECONDS).

Evita reler DuckDB e reprocessar Polars em requisições repetidas com os mesmos
query params. Ver backend/README.md#cache e docs/decisoes.md.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable
from typing import Any, TypeVar

from cachetools import TTLCache

from api.config import get_settings

T = TypeVar("T")

_cache: TTLCache[str, Any] = TTLCache(maxsize=256, ttl=get_settings().cache_ttl_seconds)


def cache_key(prefix: str, params: dict[str, Any] | None = None) -> str:
    payload = json.dumps(params or {}, sort_keys=True, default=str)
    digest = hashlib.md5(payload.encode()).hexdigest()
    return f"{prefix}:{digest}"


def cached(prefix: str, params: dict[str, Any] | None, factory: Callable[[], T]) -> T:
    key = cache_key(prefix, params)
    if key in _cache:
        return _cache[key]
    value = factory()
    _cache[key] = value
    return value


def clear_cache() -> None:
    _cache.clear()
