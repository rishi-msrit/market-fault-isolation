import asyncio
import logging
import os
import queue

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from feed.generator import FaultMode, FeedGenerator
from ingestion import db, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

PRIMARY_DSN = os.environ.get("PRIMARY_DSN", "")
REPLICA_DSN = os.environ.get("REPLICA_DSN", "")
HEALTH_CHECK_INTERVAL_S = 3

tick_queue: queue.Queue = queue.Queue(maxsize=500)
feed = FeedGenerator(tick_queue)
_consumer_delay_s: float = 0.0


async def _ingestion_loop() -> None:
    while True:
        try:
            tick = tick_queue.get_nowait()
            health.record_tick_received()
            if _consumer_delay_s > 0:
                await asyncio.sleep(_consumer_delay_s)
            ok = await db.write_tick(tick.symbol, tick.price, tick.volume, tick.ts)
            if ok:
                health.record_tick_written(tick.ts)
        except queue.Empty:
            await asyncio.sleep(0.05)
        except Exception as exc:
            logger.error("Ingestion loop error: %s", exc)
            await asyncio.sleep(0.1)


async def _health_loop() -> None:
    while True:
        try:
            primary_up = await db.check_primary()
            replica_up = await db.check_replica()
            db_meta = db.get_db_state()

            health.evaluate_feed_dead()
            health.evaluate_db_unreachable(primary_up, replica_up, db_meta["active"])
            health.evaluate_ingestion_lagging(tick_queue)
            health.evaluate_data_stale()

            if not primary_up and db_meta["active"] == "primary" and replica_up:
                logger.warning("Primary down — promoting replica")
                await db.promote_replica("primary health check failed")

        except Exception as exc:
            logger.error("Health loop error: %s", exc)

        await asyncio.sleep(HEALTH_CHECK_INTERVAL_S)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not PRIMARY_DSN:
        logger.warning("PRIMARY_DSN not set — running without DB (fault states still computed)")
    else:
        await db.init_pools(PRIMARY_DSN, REPLICA_DSN or None)
        await _ensure_schema()

    feed.start()
    asyncio.create_task(_ingestion_loop())
    asyncio.create_task(_health_loop())

    logger.info("Service started")
    yield

    feed.stop()
    await db.close_pools()
    logger.info("Service stopped")


async def _ensure_schema() -> None:
    pool = db.active_pool()
    if pool is None:
        return
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS ticks (
                id        BIGSERIAL PRIMARY KEY,
                symbol    TEXT NOT NULL,
                price     NUMERIC(12, 4) NOT NULL,
                volume    INT NOT NULL,
                tick_ts   TIMESTAMPTZ NOT NULL,
                ingested_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
    logger.info("Schema ready")


app = FastAPI(title="Market Fault Isolation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/status")
async def status():
    return health.get_status_snapshot(tick_queue, db.get_db_state(), feed.get_mode())


@app.get("/health")
async def liveness():
    return {"ok": True}


class FaultRequest(BaseModel):
    mode: FaultMode


@app.post("/admin/fault")
async def set_fault_mode(req: FaultRequest):
    feed.set_mode(req.mode)
    logger.info("Feed mode set to %s via admin endpoint", req.mode)
    return {"mode": req.mode}


@app.post("/admin/kill-primary")
async def kill_primary():
    await db.simulate_primary_failure()
    return {"status": "primary pool closed"}


@app.post("/admin/restore-primary")
async def restore_primary():
    if not PRIMARY_DSN:
        raise HTTPException(status_code=400, detail="PRIMARY_DSN not configured")
    ok = await db.restore_primary(PRIMARY_DSN)
    return {"restored": ok}


@app.post("/admin/slow-consumer")
async def slow_consumer():
    global _consumer_delay_s
    _consumer_delay_s = 2.0
    logger.info("Consumer delay set to 2s (lag simulation active)")
    return {"consumer_delay_s": _consumer_delay_s}


@app.post("/admin/normal-consumer")
async def normal_consumer():
    global _consumer_delay_s
    _consumer_delay_s = 0.0
    logger.info("Consumer delay cleared")
    return {"consumer_delay_s": _consumer_delay_s}
