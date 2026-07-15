import logging
import queue
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

FEED_DEAD_TIMEOUT_S = 10
LAG_QUEUE_THRESHOLD = 50
STALE_DATA_THRESHOLD_S = 30
MAX_HISTORY = 100


@dataclass
class FaultState:
    active: bool = False
    reason: Optional[str] = None
    since: Optional[str] = None


@dataclass
class SystemStatus:
    feed_dead: FaultState = field(default_factory=FaultState)
    db_unreachable: FaultState = field(default_factory=FaultState)
    ingestion_lagging: FaultState = field(default_factory=FaultState)
    data_stale: FaultState = field(default_factory=FaultState)


@dataclass
class TransitionEvent:
    ts: str
    fault: str
    active: bool
    reason: str


_status = SystemStatus()
_history: list[TransitionEvent] = []
_last_tick_received_at: float = time.monotonic()
_last_written_tick_ts: Optional[datetime] = None


def record_tick_received() -> None:
    global _last_tick_received_at
    _last_tick_received_at = time.monotonic()


def record_tick_written(tick_ts: datetime) -> None:
    global _last_written_tick_ts
    _last_written_tick_ts = tick_ts


def _transition(fault: str, active: bool, reason: str) -> None:
    state: FaultState = getattr(_status, fault)
    if state.active == active:
        return

    state.active = active
    state.reason = reason if active else None
    state.since = datetime.now(timezone.utc).isoformat() if active else None

    event = TransitionEvent(
        ts=datetime.now(timezone.utc).isoformat(),
        fault=fault,
        active=active,
        reason=reason,
    )
    _history.append(event)
    if len(_history) > MAX_HISTORY:
        _history.pop(0)

    verb = "RAISED" if active else "CLEARED"
    logger.info("[%s] %s — %s", verb, fault.upper(), reason)


def evaluate_feed_dead() -> None:
    elapsed = time.monotonic() - _last_tick_received_at
    if elapsed > FEED_DEAD_TIMEOUT_S:
        _transition("feed_dead", True, f"no tick for {elapsed:.1f}s (threshold {FEED_DEAD_TIMEOUT_S}s)")
    else:
        _transition("feed_dead", False, "feed resumed")


def evaluate_db_unreachable(primary_up: bool, replica_up: bool, active_target: str) -> None:
    if not primary_up and not replica_up:
        _transition("db_unreachable", True, "primary down, replica unavailable")
    elif not primary_up and active_target == "primary":
        _transition("db_unreachable", True, "primary down, promotion pending")
    else:
        _transition("db_unreachable", False, "write target is reachable")


def evaluate_ingestion_lagging(tick_queue: queue.Queue) -> None:
    depth = tick_queue.qsize()
    if not _status.feed_dead.active and not _status.db_unreachable.active and depth > LAG_QUEUE_THRESHOLD:
        _transition("ingestion_lagging", True, f"queue depth {depth} exceeds threshold {LAG_QUEUE_THRESHOLD}")
    else:
        _transition("ingestion_lagging", False, f"queue depth {depth}")


def evaluate_data_stale() -> None:
    if _last_written_tick_ts is None:
        return

    now = datetime.now(timezone.utc)
    age_s = (now - _last_written_tick_ts).total_seconds()

    if (
        not _status.feed_dead.active
        and not _status.db_unreachable.active
        and age_s > STALE_DATA_THRESHOLD_S
    ):
        _transition("data_stale", True, f"last tick ts is {age_s:.1f}s old (threshold {STALE_DATA_THRESHOLD_S}s)")
    else:
        _transition("data_stale", False, "data is fresh")


def get_status_snapshot(tick_queue: queue.Queue, db_meta: dict, feed_mode: str) -> dict:
    def _fault_dict(f: FaultState) -> dict:
        return {"active": f.active, "reason": f.reason, "since": f.since}

    return {
        "fault_states": {
            "feed_dead": _fault_dict(_status.feed_dead),
            "db_unreachable": _fault_dict(_status.db_unreachable),
            "ingestion_lagging": _fault_dict(_status.ingestion_lagging),
            "data_stale": _fault_dict(_status.data_stale),
        },
        "meta": {
            "queue_depth": tick_queue.qsize(),
            "feed_mode": feed_mode,
            "db_active": db_meta.get("active"),
            "primary_up": db_meta.get("primary_up"),
            "replica_up": db_meta.get("replica_up"),
            "last_tick_received_ago_s": round(time.monotonic() - _last_tick_received_at, 1),
            "last_written_tick_ts": _last_written_tick_ts.isoformat() if _last_written_tick_ts else None,
        },
        "history": [
            {"ts": e.ts, "fault": e.fault, "active": e.active, "reason": e.reason}
            for e in reversed(_history)
        ],
    }
