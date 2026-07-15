import { useEffect, useState, useCallback } from 'react';
import './index.css';
import { FaultStateCard } from './components/FaultStateCard';
import { PipelineFlow } from './components/PipelineFlow';
import { Timeline } from './components/Timeline';
import { ControlPanel } from './components/ControlPanel';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const POLL_INTERVAL_MS = 2000;

interface FaultInfo {
  active: boolean;
  reason: string | null;
  since: string | null;
}

interface StatusPayload {
  fault_states: {
    feed_dead: FaultInfo;
    db_unreachable: FaultInfo;
    ingestion_lagging: FaultInfo;
    data_stale: FaultInfo;
  };
  meta: {
    queue_depth: number;
    feed_mode: string;
    db_active: string;
    primary_up: boolean;
    replica_up: boolean;
    last_tick_received_ago_s: number;
    last_written_tick_ts: string | null;
  };
  history: Array<{
    ts: string;
    fault: string;
    active: boolean;
    reason: string;
  }>;
}

const FAULT_CONFIGS = [
  {
    key: 'feed_dead' as const,
    id: 'card-feed-dead',
    title: 'Feed Dead',
    description: 'No new ticks received past the 10-second timeout.',
    icon: '📡',
    color: '#f59e0b',
    colorDim: 'rgba(245,158,11,0.12)',
  },
  {
    key: 'db_unreachable' as const,
    id: 'card-db-unreachable',
    title: 'DB Unreachable',
    description: 'Primary connection pool is down and no replica is available.',
    icon: '🗄️',
    color: '#ef4444',
    colorDim: 'rgba(239,68,68,0.12)',
  },
  {
    key: 'ingestion_lagging' as const,
    id: 'card-ingestion-lagging',
    title: 'Ingestion Lagging',
    description: 'Queue depth exceeded 50 — consumer is falling behind the feed.',
    icon: '⏱️',
    color: '#eab308',
    colorDim: 'rgba(234,179,8,0.12)',
  },
  {
    key: 'data_stale' as const,
    id: 'card-data-stale',
    title: 'Data Stale',
    description: 'Latest written tick timestamp is more than 30 seconds old.',
    icon: '🕰️',
    color: '#a855f7',
    colorDim: 'rgba(168,85,247,0.12)',
  },
];

// ── Info Modal ─────────────────────────────────────────────────────────────
function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>About this project</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <p className="modal-lead">
            This is a <strong>market data fault isolation system</strong> — a live demo
            of a pattern used inside stock exchanges and financial data vendors to tell
            apart four distinct failure conditions that would otherwise all look like
            "the system is down."
          </p>

          <h3>The real-world problem</h3>
          <p>
            At companies like NSE, BSE, LSEG, or CME, price feeds from brokers stream
            thousands of ticks per second into databases. When the monitoring dashboard
            goes dark, an on-call engineer needs to know within seconds whether the
            upstream data vendor stopped sending, the database crashed, the consumer
            fell behind under load, or timestamps got corrupted — because each of those
            has a completely different fix.
          </p>

          <h3>What you're looking at</h3>
          <ul>
            <li>
              <strong>Feed Generator</strong> — a background thread emitting synthetic
              price ticks for 18 symbols every 500ms, simulating a real market feed.
            </li>
            <li>
              <strong>Ingestion Loop</strong> — an async consumer that drains the tick
              queue and writes each tick to a PostgreSQL database.
            </li>
            <li>
              <strong>Health Checker</strong> — runs every 3 seconds, evaluating four
              independent conditions. Each has its own trigger and reason string.
            </li>
            <li>
              <strong>This dashboard</strong> — polls the backend every 2 seconds and
              renders the current state with a color-coded card per fault type.
            </li>
          </ul>

          <h3>The four fault states</h3>
          <div className="modal-faults">
            <div className="modal-fault">
              <span className="mf-dot" style={{ background: '#f59e0b' }} />
              <div>
                <strong>Feed Dead</strong>
                <span>No tick received in 10s. The data vendor went silent.</span>
              </div>
            </div>
            <div className="modal-fault">
              <span className="mf-dot" style={{ background: '#ef4444' }} />
              <div>
                <strong>DB Unreachable</strong>
                <span>Primary connection closed. Writes are failing.</span>
              </div>
            </div>
            <div className="modal-fault">
              <span className="mf-dot" style={{ background: '#eab308' }} />
              <div>
                <strong>Ingestion Lagging</strong>
                <span>Queue &gt; 50 items. Consumer can't keep up with the feed rate.</span>
              </div>
            </div>
            <div className="modal-fault">
              <span className="mf-dot" style={{ background: '#a855f7' }} />
              <div>
                <strong>Data Stale</strong>
                <span>Last written tick is 30s+ old. Feed is up, but timestamps are corrupted.</span>
              </div>
            </div>
          </div>

          <h3>How to use the control panel</h3>
          <p>
            Use the <strong>Fault Injection</strong> panel on the right to trigger any
            failure scenario. Each red button causes exactly one fault state to activate.
            The matching green button resolves it — no service restart needed. Watch the
            State Transition Log record each event with a timestamp and reason.
          </p>

          <div className="modal-footer-note">
            Built with FastAPI · asyncpg · PostgreSQL (Neon) · React · Vite
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/status`);
      if (!res.ok) throw new Error('not ok');
      const data: StatusPayload = await res.json();
      setStatus(data);
      setFetchError(false);
    } catch {
      setFetchError(true);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const anyFault = status
    ? Object.values(status.fault_states).some((f) => f.active)
    : false;

  return (
    <div className="app">
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <span className="logo-mark">◈</span>
          </div>
          <div>
            <h1>Market Fault Isolation</h1>
            <div className="subtitle">live ingestion pipeline · fault detection demo</div>
          </div>
        </div>
        <div className="header-right">
          {fetchError && (
            <span className="backend-error-badge">backend unreachable</span>
          )}
          <button
            className="icon-btn"
            id="btn-info"
            onClick={() => setShowInfo(true)}
            title="About this project"
            aria-label="About"
          >
            ℹ
          </button>
          <button
            className="icon-btn"
            id="btn-theme"
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <div className={`status-dot ${fetchError || anyFault ? 'error' : ''}`} title={anyFault ? 'Active fault detected' : 'All systems healthy'} />
        </div>
      </header>

      <main className="app-body">
        {!status ? (
          <div className="loading-screen">
            <div className="loading-spinner" />
            <div className="loading-title">Connecting to backend</div>
            <div className="loading-sub">{API}</div>
            <div className="loading-note">First load on the free tier may take 30–60 seconds to warm up.</div>
          </div>
        ) : (
          <>
            <div className="intro-banner">
              <div className="intro-text">
                <span className="intro-highlight">What this is:</span> A simulated stock-price pipeline you can deliberately break. Each panel below tracks a different failure condition independently — use the Fault Injection panel to trigger one and watch the system identify exactly which layer failed.
              </div>
              <div className="intro-tags">
                <span className="tag">Python / FastAPI</span>
                <span className="tag">PostgreSQL</span>
                <span className="tag">React / Vite</span>
                <span className="tag">Reliability Engineering</span>
              </div>
            </div>

            <div>
              <div className="section-label">
                Fault States
                <span className="section-hint"> — each is computed independently. A green card means that condition is not present, even if others are active.</span>
              </div>
              <div className="fault-grid">
                {FAULT_CONFIGS.map((cfg) => (
                  <FaultStateCard
                    key={cfg.key}
                    id={cfg.id}
                    title={cfg.title}
                    description={cfg.description}
                    icon={cfg.icon}
                    color={cfg.color}
                    colorDim={cfg.colorDim}
                    fault={status.fault_states[cfg.key]}
                  />
                ))}
              </div>
            </div>

            <PipelineFlow
              faults={status.fault_states}
              meta={status.meta}
            />

            <div className="meta-bar" title="Live system stats, polled every 2 seconds">
              <div className="meta-bar-item">
                <span className="label">queue depth</span>
                <span className="value" style={{ color: status.meta.queue_depth > 50 ? '#eab308' : 'inherit' }}>
                  {status.meta.queue_depth}
                </span>
              </div>
              <div className="meta-bar-item">
                <span className="label">feed mode</span>
                <span className="value" style={{ color: status.meta.feed_mode !== 'NORMAL' ? '#f59e0b' : 'inherit' }}>
                  {status.meta.feed_mode}
                </span>
              </div>
              <div className="meta-bar-item">
                <span className="label">db write target</span>
                <span className="value">{status.meta.db_active}</span>
              </div>
              <div className="meta-bar-item">
                <span className="label">primary</span>
                <span className="value" style={{ color: status.meta.primary_up ? '#10b981' : '#ef4444' }}>
                  {status.meta.primary_up ? 'up' : 'down'}
                </span>
              </div>
              <div className="meta-bar-item">
                <span className="label">replica</span>
                <span className="value" style={{ color: status.meta.replica_up ? '#10b981' : 'var(--text-muted)' }}>
                  {status.meta.replica_up ? 'up' : 'none'}
                </span>
              </div>
              <div className="meta-bar-item">
                <span className="label">last tick</span>
                <span className="value">{status.meta.last_tick_received_ago_s}s ago</span>
              </div>
            </div>

            <div className="bottom-row">
              <div>
                <div className="section-label">
                  State Transition Log
                  <span className="section-hint"> — every fault activation and recovery is logged here with the exact reason from the health checker.</span>
                </div>
                <Timeline history={status.history} />
              </div>
              <div>
                <div className="section-label">
                  Fault Injection
                  <span className="section-hint"> — trigger each scenario without touching the terminal.</span>
                </div>
                <ControlPanel />
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <span>Market Data Fault Isolation</span>
        <span className="footer-sep">·</span>
        <a href="https://github.com/rishi-msrit/market-fault-isolation" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <span className="footer-sep">·</span>
        <span>FastAPI · PostgreSQL · React</span>
      </footer>
    </div>
  );
}
