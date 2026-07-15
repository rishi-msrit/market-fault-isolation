import asyncio
import logging
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone

import asyncpg

logger = logging.getLogger(__name__)

WRITE_LATENCY_WINDOW = 200


@dataclass
class DBState:
    primary_pool: asyncpg.Pool | None = None
    replica_pool: asyncpg.Pool | None = None
    active: str = "primary"
    primary_failed_at: datetime | None = None
    replica_promoted_at: datetime | None = None
    write_latencies_ms: list[float] = field(default_factory=list)


_state = DBState()


async def init_pools(primary_dsn: str, replica_dsn: str | None) -> None:
    try:
        _state.primary_pool = await asyncpg.create_pool(primary_dsn, min_size=2, max_size=5, command_timeout=5)
        logger.info("Primary pool connected")
    except Exception as exc:
        logger.error("Primary pool failed: %s", exc)

    if replica_dsn:
        try:
            _state.replica_pool = await asyncpg.create_pool(replica_dsn, min_size=1, max_size=3, command_timeout=5)
            logger.info("Replica pool connected")
        except Exception as exc:
            logger.warning("Replica pool failed: %s", exc)


async def close_pools() -> None:
    if _state.primary_pool:
        await _state.primary_pool.close()
    if _state.replica_pool:
        await _state.replica_pool.close()


def active_pool() -> asyncpg.Pool | None:
    if _state.active == "primary":
        return _state.primary_pool
    return _state.replica_pool


async def write_tick(symbol: str, price: float, volume: int, ts: datetime) -> bool:
    pool = active_pool()
    if pool is None:
        return False

    t0 = time.monotonic()
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO ticks (symbol, price, volume, tick_ts) VALUES ($1, $2, $3, $4)",
                symbol, price, volume, ts,
            )
        elapsed = (time.monotonic() - t0) * 1000
        _record_latency(elapsed)
        return True
    except Exception as exc:
        logger.warning("Write failed (%s): %s", _state.active, exc)
        return False


def _record_latency(ms: float) -> None:
    _state.write_latencies_ms.append(ms)
    if len(_state.write_latencies_ms) > WRITE_LATENCY_WINDOW:
        _state.write_latencies_ms.pop(0)


def p99_latency_ms() -> float | None:
    samples = _state.write_latencies_ms
    if not samples:
        return None
    sorted_s = sorted(samples)
    idx = max(0, int(len(sorted_s) * 0.99) - 1)
    return round(sorted_s[idx], 2)


async def check_primary() -> bool:
    if _state.primary_pool is None:
        return False
    try:
        async with _state.primary_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception:
        return False


async def check_replica() -> bool:
    if _state.replica_pool is None:
        return False
    try:
        async with _state.replica_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception:
        return False


async def simulate_primary_failure() -> None:
    if _state.primary_pool:
        await _state.primary_pool.close()
        _state.primary_pool = None
    _state.primary_failed_at = datetime.now(timezone.utc)
    logger.warning("Primary pool closed (fault injection)")


async def promote_replica(reason: str) -> bool:
    if _state.replica_pool is None:
        logger.error("Cannot promote: no replica pool")
        return False

    # In a real Docker-based setup this calls pg_promote() on the replica.
    # On deployed single-Postgres (Neon), this is a no-op since there is no
    # separate replica — we just switch the write target and log the event.
    try:
        async with _state.replica_pool.acquire() as conn:
            in_recovery = await conn.fetchval("SELECT pg_is_in_recovery()")
            if in_recovery:
                await conn.execute("SELECT pg_promote()")
                logger.info("pg_promote() issued on replica")
            else:
                logger.info("Replica already primary (or single-DB mode), switching write target")
    except Exception as exc:
        logger.warning("pg_promote attempt: %s", exc)

    _state.active = "replica"
    _state.replica_promoted_at = datetime.now(timezone.utc)
    logger.info("Write target switched to replica. Reason: %s", reason)
    return True


async def restore_primary(primary_dsn: str) -> bool:
    try:
        pool = await asyncpg.create_pool(primary_dsn, min_size=2, max_size=5, command_timeout=5)
        _state.primary_pool = pool
        _state.active = "primary"
        _state.primary_failed_at = None
        logger.info("Primary restored, write target switched back")
        return True
    except Exception as exc:
        logger.error("Primary restore failed: %s", exc)
        return False


def get_db_state() -> dict:
    return {
        "active": _state.active,
        "primary_up": _state.primary_pool is not None,
        "replica_up": _state.replica_pool is not None,
        "primary_failed_at": _state.primary_failed_at.isoformat() if _state.primary_failed_at else None,
        "replica_promoted_at": _state.replica_promoted_at.isoformat() if _state.replica_promoted_at else None,
    }
