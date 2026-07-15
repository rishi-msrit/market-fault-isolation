import queue
import random
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum


class FaultMode(str, Enum):
    NORMAL = "NORMAL"
    STOPPED = "STOPPED"
    DELAYED = "DELAYED"
    CORRUPT_TIMESTAMP = "CORRUPT_TIMESTAMP"


SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "JPM", "GS", "MS",
    "BAC", "C", "WFC", "BLK", "SCHW",
    "ICE", "CME", "NDAQ", "CBOE", "LSEG",
]

BASE_PRICES: dict[str, float] = {s: random.uniform(50, 500) for s in SYMBOLS}


@dataclass
class Tick:
    symbol: str
    price: float
    volume: int
    ts: datetime
    generated_at: datetime


class FeedGenerator:
    def __init__(self, tick_queue: queue.Queue, emit_interval: float = 0.5):
        self._queue = tick_queue
        self._interval = emit_interval
        self._mode = FaultMode.NORMAL
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._running = False

    def set_mode(self, mode: FaultMode) -> None:
        with self._lock:
            self._mode = mode

    def get_mode(self) -> FaultMode:
        with self._lock:
            return self._mode

    def start(self) -> None:
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False

    def _next_price(self, symbol: str) -> float:
        current = BASE_PRICES[symbol]
        change = current * random.uniform(-0.002, 0.002)
        BASE_PRICES[symbol] = round(current + change, 2)
        return BASE_PRICES[symbol]

    def _emit_tick(self, symbol: str) -> Tick:
        now = datetime.now(timezone.utc)
        with self._lock:
            mode = self._mode

        if mode == FaultMode.CORRUPT_TIMESTAMP:
            ts = datetime.fromtimestamp(now.timestamp() - 600, tz=timezone.utc)
        else:
            ts = now

        return Tick(
            symbol=symbol,
            price=self._next_price(symbol),
            volume=random.randint(100, 10000),
            ts=ts,
            generated_at=now,
        )

    def _run(self) -> None:
        while self._running:
            with self._lock:
                mode = self._mode

            if mode == FaultMode.STOPPED:
                time.sleep(0.1)
                continue

            if mode == FaultMode.DELAYED:
                time.sleep(5)

            symbol = random.choice(SYMBOLS)
            tick = self._emit_tick(symbol)
            try:
                self._queue.put_nowait(tick)
            except queue.Full:
                pass

            time.sleep(self._interval)
