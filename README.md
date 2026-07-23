# Market Data Fault Isolation & Recovery System

**[Live Demo](https://market-fault-isolation.vercel.app)** · **[Backend API](https://market-fault-isolation-backend.onrender.com/docs)** · **[GitHub](https://github.com/rishi-msrit/market-fault-isolation)**

> ⚠️ The backend runs on Render's free tier and sleeps after 15 minutes of inactivity. First load may take 30–60 seconds to wake up, this is normal. The dashboard shows a spinner while it connects.

A simulated stock-price ingestion pipeline built to demonstrate **fault isolation**: detecting and distinguishing four different failure conditions independently, rather than collapsing them into a single "system down" alert. This is the core problem in real financial data infrastructure when a dashboard goes dark, you need to know *why* immediately.

## What you see on the live site

When you open the deployed dashboard, you see a dark-themed monitoring interface with four panels across the top and a pipeline diagram below them.

**When everything is healthy**, all four panels show a green "OK" badge, the pipeline diagram shows animated flow lines connecting each stage, and the timeline at the bottom is empty (no faults have occurred).

**When you trigger a fault** using the "Fault Injection" control panel on the right, one of the four panels immediately lights up with a distinct color, shows the exact reason the fault fired, and the timeline logs the transition with a timestamp. When you resolve the fault, the panel goes back to green without restarting anything.

The point of the demo is not just to see errors. It is to show that the system *knows which error it has* and reports them separately, even when multiple faults happen at once.

## For a first-time visitor (non-technical)

Imagine a live data pipeline — prices or messages streaming continuously from an external source into a database. When something goes wrong in that pipeline, you get a red screen. But which part broke? The source stopped sending? The database is down? The system is receiving data too fast to process? The data is arriving with wrong timestamps?

This project simulates exactly that scenario at a small scale:
- A fake "market feed" generates price updates for 18 stock symbols every half second
- A backend service picks up those updates and writes them to a database
- A health checker runs every 3 seconds, checking each layer separately
- A dashboard shows you exactly which part is broken; with a reason when you deliberately break it

You can trigger four real-world failures from the control panel:
1. **Kill the feed** — the data source stops sending anything
2. **Kill the database** — writes start failing
3. **Slow the consumer** — the pipeline falls behind and a backlog builds up
4. **Corrupt timestamps** — data is arriving, but the timestamps in it are wrong

Each failure lights up a different coloured panel with a plain-English explanation of what went wrong.

## What problem this solves

In production market-data systems, multiple things can go wrong simultaneously or in sequence: the upstream feed dies, the write database becomes unavailable, the consumer falls behind under load, or data arrives but with stale timestamps (a clock-drift or corruption issue). A system that only reports "unhealthy" is operationally useless an engineer on-call needs to know within seconds which layer is the source of the fault.

This project implements exactly that separation. Each of the four states below is computed by an independent check, has its own trigger condition, its own visual indicator on the dashboard, and logs a timestamped reason when it transitions.

## Four fault states

| State | Condition | Color |
|---|---|---|
| **Feed Dead** | No tick received in the past 10 seconds | Amber |
| **DB Unreachable** | Primary connection fails and no replica is available | Red |
| **Ingestion Lagging** | Feed and DB are both healthy, but the tick queue exceeds 50 items | Yellow |
| **Data Stale** | Last written tick timestamp is older than 30 seconds (feed up, DB up) | Purple |

All four are evaluated every 3 seconds by the health checker. Each transitions independently they do not mask each other. The dashboard shows a distinct color and reason string for each one.

## Architecture

```
┌────────────────┐    queue.Queue    ┌─────────────────┐    asyncpg    ┌─────────────┐
│ Feed Generator │ ────────────────► │ Ingestion Loop  │ ────────────► │  Postgres   │
│  (thread)      │                   │  (async task)   │               │  (primary)  │
└────────────────┘                   └─────────────────┘               └──────┬──────┘
        ▲                                     │                                │ WAL stream (local only)
        │ set_mode()                          │ write_tick()           ┌──────▼──────┐
        │                             ┌───────▼───────┐               │  Postgres   │
┌───────┴───────┐    GET /status      │ Health Checker│               │  (replica)  │
│ FastAPI Admin │ ◄─────────────────  │  (async task) │               └─────────────┘
│   Endpoints   │                     └───────────────┘
└───────────────┘
        ▲
        │ POST /admin/*
┌───────┴───────┐
│   Dashboard   │
│  (React/Vite) │
└───────────────┘
```

**Local dev**: Primary and replica are separate `postgres:16` containers connected via WAL streaming replication. When the primary is killed, the health checker detects the failed connection, calls `pg_promote()` on the replica, and switches the write target.

**Deployed**: Single Postgres instance (Neon free tier). The failover logic still executes — the pool is closed and restored but there is no physical replica to promote. Documented in Known Limitations.

## Tech stack

| Component | Technology | Version |
|---|---|---|
| Feed generator | Python (threading) | 3.11 |
| Ingestion service | FastAPI, asyncpg | 0.111, 0.29 |
| ASGI server | uvicorn | 0.30 |
| Database (local) | PostgreSQL (Docker) | 16 |
| Database (deployed) | Neon (serverless Postgres) | latest |
| Frontend | React, Vite, TypeScript | 18, 8, 5 |
| Deployment (backend) | Render (free web service) | — |
| Deployment (frontend) | Vercel (free) | — |

## Local development (with Docker)

### Prerequisites
- Docker Desktop with Compose v2
- Python 3.11
- Node.js 18+

### Steps

```bash
git clone <repo-url>
cd market-fault-isolation

# Start full stack (primary + replica Postgres + backend)
docker compose up --build

# In a separate terminal — start the frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend API: http://localhost:8000
Backend docs: http://localhost:8000/docs

### Running backend without Docker (against Neon)

```bash
cd backend
# Create .env with your Neon connection string
echo "PRIMARY_DSN=postgresql://user:pass@host/db?sslmode=require" > .env
echo "REPLICA_DSN=" >> .env

pip install -r requirements.txt
PYTHONPATH=. uvicorn ingestion.main:app --reload
```

In a second terminal:
```bash
cd frontend
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm install
npm run dev
```

## Verification — all four fault states

The following verification was run against a live backend connected to Neon. All commands use the HTTP API directly; the same scenarios are triggerable via the dashboard control panel.

### State 1: Feed Dead

**Trigger**: Stop the feed generator.

```bash
curl -X POST http://localhost:8000/admin/fault \
  -H 'Content-Type: application/json' \
  -d '{"mode":"STOPPED"}'
```

**Wait 10 seconds**, then check:

```bash
curl http://localhost:8000/status | python -m json.tool
```

**Verified result**:
```json
{
  "fault_states": {
    "feed_dead": {
      "active": true,
      "reason": "no tick for 10.4s (threshold 10s)",
      "since": "2026-07-15T07:39:32Z"
    },
    "db_unreachable": { "active": false },
    "ingestion_lagging": { "active": false },
    "data_stale": { "active": false }
  }
}
```

**Recovery**: Resume the feed. State clears within the next 3-second health check cycle.

```bash
curl -X POST http://localhost:8000/admin/fault \
  -H 'Content-Type: application/json' \
  -d '{"mode":"NORMAL"}'
```

---

### State 2: DB Unreachable

**Trigger**: Close the primary connection pool.

```bash
curl -X POST http://localhost:8000/admin/kill-primary
```

**Verified result** (within 3–6 seconds):
```json
{
  "fault_states": {
    "feed_dead": { "active": false },
    "db_unreachable": {
      "active": true,
      "reason": "primary down, replica unavailable",
      "since": "2026-07-15T07:40:37Z"
    },
    "ingestion_lagging": { "active": false },
    "data_stale": { "active": false }
  }
}
```

**Recovery**: Restore the primary connection pool.

```bash
curl -X POST http://localhost:8000/admin/restore-primary
```

State clears within the next health check cycle. No restart required.

---

### State 3: Ingestion Lagging

**Trigger**: Introduce a 2-second delay per write in the ingestion loop. The feed continues at normal speed (one tick per 500ms), producing 4× faster than the consumer drains, filling the queue past the 50-item threshold.

```bash
curl -X POST http://localhost:8000/admin/slow-consumer
```

**Wait ~35 seconds**, then check:

**Verified result**:
```json
{
  "fault_states": {
    "feed_dead": { "active": false },
    "db_unreachable": { "active": false },
    "ingestion_lagging": {
      "active": true,
      "reason": "queue depth 52 exceeds threshold 50",
      "since": "2026-07-15T07:46:32Z"
    },
    "data_stale": { "active": false }
  },
  "meta": {
    "queue_depth": 53,
    "feed_mode": "NORMAL",
    "last_tick_received_ago_s": 1.0
  }
}
```

Note: feed is alive (`last_tick_received_ago_s: 1.0`), DB is up — lag is isolated to the consumer layer.

**Recovery**:

```bash
curl -X POST http://localhost:8000/admin/normal-consumer
```

Queue drains, state clears.

---

### State 4: Data Stale

**Trigger**: Enable corrupt-timestamp mode. The feed continues emitting ticks at normal rate, but each tick carries a timestamp backdated by 10 minutes.

```bash
curl -X POST http://localhost:8000/admin/fault \
  -H 'Content-Type: application/json' \
  -d '{"mode":"CORRUPT_TIMESTAMP"}'
```

**Wait ~35 seconds** for the stale threshold (30s) to fire:

**Verified result**:
```json
{
  "fault_states": {
    "feed_dead": { "active": false },
    "db_unreachable": { "active": false },
    "ingestion_lagging": { "active": false },
    "data_stale": {
      "active": true,
      "reason": "last tick ts is 600.3s old (threshold 30s)",
      "since": "2026-07-15T07:52:10Z"
    }
  }
}
```

Note: feed is alive, DB is up, queue is empty — the only problem is stale timestamps in the data itself. This is the "silent corruption" scenario: everything looks running but the data is wrong.

**Recovery**:

```bash
curl -X POST http://localhost:8000/admin/fault \
  -H 'Content-Type: application/json' \
  -d '{"mode":"NORMAL"}'
```

Fresh timestamps resume, state clears.

---

### Recovery without restart — confirmed

After each fault above, the system returned to fully healthy state (all four states `active: false`) without any service restart. This was verified for all four scenarios.

### State isolation — confirmed

Each state was triggered in isolation and did not cause false positives on the other three states. The ingestion-lagging scenario did cause a simultaneous `data_stale` during the lag period (because backed-up ticks had old timestamps), which is correct behavior — both conditions were genuinely true at the same time.

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/status` | Current fault states, metadata, transition history |
| `GET` | `/health` | Liveness check |
| `POST` | `/admin/fault` | Set feed mode: `NORMAL`, `STOPPED`, `CORRUPT_TIMESTAMP` |
| `POST` | `/admin/slow-consumer` | Add 2s write delay (triggers lag) |
| `POST` | `/admin/normal-consumer` | Clear write delay |
| `POST` | `/admin/kill-primary` | Close primary DB pool |
| `POST` | `/admin/restore-primary` | Reconnect primary DB pool |

## Deployment

### Backend (Render)

1. Push repository to GitHub
2. Create a **Web Service** on Render, connect the repo
3. Set Root Directory: `backend`
4. Set Start Command: `uvicorn ingestion.main:app --host 0.0.0.0 --port $PORT`
5. Set environment variables:
   - `PRIMARY_DSN` — Neon connection string (from neon.tech dashboard)
   - `REPLICA_DSN` — leave blank
6. Deploy

### Frontend (Vercel)

1. Create a project on Vercel, connect the repo
2. Set Root Directory: `frontend`
3. Add environment variable:
   - `VITE_API_URL` — your Render backend URL
4. Deploy

## Known limitations

- **Deployed version uses a single Postgres** (Neon free tier). Real WAL streaming replication between two Postgres instances works correctly in the local Docker Compose setup. The deployed demo exercises all four fault states, but the "DB failover" scenario is a connection-pool switch rather than a true `pg_promote()` call.

- **Render cold start**: The free web service spins down after 15 minutes of inactivity. The first request after a period of idle may take 30–60 seconds. This is expected for a portfolio demo.

- **State is in-memory**: Health state and transition history reset on service restart. Persistent storage of audit history is intentionally out of scope.

- **No split-brain protection**: Quorum-based fencing and multi-node consensus are out of scope for this project. This is documented clearly and not misrepresented.

## What this project demonstrates

This is a portfolio project targeting entry-level engineering roles at financial market infrastructure companies (exchanges, clearing houses, data vendors). The skills it demonstrates:

| Skill | Where it shows up |
|---|---|
| Reliability engineering | Independent health checks, distinct fault states, transition logging |
| Python async programming | FastAPI lifespan tasks, asyncpg connection pools, asyncio coordination |
| Database fundamentals | PostgreSQL connection pooling, failover handling, schema management |
| Distributed systems thinking | Fault isolation vs. aggregation, recovery without restart |
| Systems design | Separating feed layer, queue, ingestion, and storage into distinct observable components |
| Frontend engineering | React polling loop, conditional rendering by state, live control panel |

The specific problem it addresses — distinguishing *feed failure* from *DB failure* from *consumer lag* from *data staleness* — is a real operational problem. At companies like LSEG, CME, or ICE, on-call engineers use exactly this kind of fault categorisation to reduce mean time to resolution during market hours.
