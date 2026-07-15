import { useEffect, useState, useCallback, useRef } from 'react';
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

// ── Inline tooltip ──────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="infotip-wrap" ref={ref}>
      <button
        className="infotip-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="More info"
        title="What does this section do?"
      >
        ℹ
      </button>
      {open && (
        <div className="infotip-bubble">
          {text}
        </div>
      )}
    </div>
  );
}

// ── About Modal ─────────────────────────────────────────────────────────────
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
            that shows how a monitoring system can tell apart four completely different
            failure conditions that would otherwise all look like "the system is down."
          </p>

          <h3>The problem it solves</h3>
          <p>
            In any real-time data pipeline — financial or otherwise — multiple layers
            can fail independently: the data source goes silent, the database crashes,
            the consumer falls behind under load, or the data arrives but with corrupted
            timestamps. A system that only shows a generic red alert is useless on-call.
            You need to know <em>which layer</em> broke and <em>why</em>.
          </p>

          <h3>What you're looking at</h3>
          <ul>
            <li>
              <strong>Feed Generator</strong> — a background thread emitting synthetic
              price ticks for 18 symbols every 500ms, simulating a real-time market feed.
            </li>
            <li>
              <strong>Ingestion Loop</strong> — an async consumer that drains the tick
              queue and writes each tick to a PostgreSQL database.
            </li>
            <li>
              <strong>Health Checker</strong> — runs every 3 seconds, evaluating four
              independent conditions. Each has its own trigger threshold and reason string.
            </li>
            <li>
              <strong>This dashboard</strong> — polls the backend every 2 seconds and
              renders the current state with a colour-coded card per fault type.
            </li>
          </ul>

          <h3>The four fault states</h3>
          <div className="modal-faults">
            <div className="modal-fault">
              <span className="mf-dot" style={{ background: '#f59e0b' }} />
              <div>
                <strong>Feed Dead</strong>
                <span>No tick received in 10 seconds. The data source went silent.</span>
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
                <span>Last written tick is 30s+ old. Data is arriving but timestamps are corrupted.</span>
              </div>
            </div>
          </div>

          <h3>How to use it</h3>
          <p>
            Use the <strong>Fault Injection</strong> panel on the right to trigger any
            scenario. Each button causes exactly one fault state to activate. The matching
            green button resolves it — no service restart required. The{' '}
            <strong>State Transition Log</strong> records every event with a timestamp
            and the exact reason string from the health checker.
          </p>

          <div className="modal-footer-note">
            FastAPI · asyncpg · PostgreSQL (Neon) · React · Vite · Deployed on Render + Vercel
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
            <span>◈</span>
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
          <div
            className={`status-dot ${fetchError || anyFault ? 'error' : ''}`}
            title={anyFault ? 'Active fault detected' : 'All systems healthy'}
          />
        </div>
      </header>

      <main className="app-body">
        {!status ? (
          <div className="loading-screen">
            <div className="loading-spinner" />
            <div className="loading-title">Connecting to backend</div>
            <div className="loading-sub">{API}</div>
            <div className="loading-note">
              First load on the free tier may take 30–60 seconds to wake up.
            </div>
          </div>
        ) : (
          <>
            {/* ── Intro banner ── */}
            <div className="intro-banner">
              <div className="intro-text">
                <span className="intro-highlight">What this is:</span> A simulated
                data pipeline you can deliberately break. Each panel tracks a different
                failure condition independently — trigger one from the right panel and
                watch the system identify exactly which layer failed.
              </div>
              <div className="intro-tags">
                <span className="tag">Python / FastAPI</span>
                <span className="tag">PostgreSQL</span>
                <span className="tag">React / Vite</span>
                <span className="tag">Reliability Engineering</span>
              </div>
            </div>

            {/* ── Two-column layout ── */}
            <div className="page-columns">

              {/* LEFT — fault cards, pipeline, timeline */}
              <div className="col-main">

                <div>
                  <div className="section-label">
                    Fault States
                    <InfoTip text="Four independent health checks run every 3 seconds. Each has its own condition — a green card means that specific fault is not present, even if other faults are active at the same time." />
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

                <div>
                  <div className="section-label">
                    Pipeline Flow
                    <InfoTip text="Shows the live path a price tick takes from the market feed through the queue, ingestion loop, and into the database. Each node highlights its fault colour when that layer has an active fault." />
                  </div>
                  <PipelineFlow
                    faults={status.fault_states}
                    meta={status.meta}
                  />
                </div>

                <div>
                  <div className="section-label">
                    State Transition Log
                    <InfoTip text="Every time a fault activates or clears, one entry is appended here with a UTC timestamp and the exact reason string from the health checker. Resets on service restart." />
                  </div>
                  <Timeline history={status.history} />
                </div>

              </div>

              {/* RIGHT SIDEBAR — system status + fault injection */}
              <div className="col-sidebar">

                <div className="sidebar-section">
                  <div className="section-label">
                    System Status
                    <InfoTip text="Live stats polled from the backend every 2 seconds. Queue depth and feed mode change colour when they indicate a problem." />
                  </div>
                  <div className="status-stack">
                    <div className="status-row">
                      <span className="status-key">queue depth</span>
                      <span
                        className="status-val"
                        style={{ color: status.meta.queue_depth > 50 ? '#eab308' : 'var(--color-healthy)' }}
                      >
                        {status.meta.queue_depth}
                      </span>
                    </div>
                    <div className="status-row">
                      <span className="status-key">feed mode</span>
                      <span
                        className="status-val"
                        style={{ color: status.meta.feed_mode !== 'NORMAL' ? '#f59e0b' : 'var(--color-healthy)' }}
                      >
                        {status.meta.feed_mode}
                      </span>
                    </div>
                    <div className="status-row">
                      <span className="status-key">db write target</span>
                      <span className="status-val">{status.meta.db_active}</span>
                    </div>
                    <div className="status-row">
                      <span className="status-key">primary</span>
                      <span
                        className="status-val"
                        style={{ color: status.meta.primary_up ? '#10b981' : '#ef4444' }}
                      >
                        {status.meta.primary_up ? 'up' : 'down'}
                      </span>
                    </div>
                    <div className="status-row">
                      <span className="status-key">replica</span>
                      <span
                        className="status-val"
                        style={{ color: status.meta.replica_up ? '#10b981' : 'var(--text-muted)' }}
                      >
                        {status.meta.replica_up ? 'up' : 'none'}
                      </span>
                    </div>
                    <div className="status-row">
                      <span className="status-key">last tick</span>
                      <span className="status-val">{status.meta.last_tick_received_ago_s}s ago</span>
                    </div>
                  </div>
                </div>

                <div className="sidebar-section">
                  <div className="section-label">
                    Fault Injection
                    <InfoTip text="Trigger any failure scenario without touching the terminal. Red buttons cause exactly one fault state to activate. Green buttons resolve it — no service restart needed." />
                  </div>
                  <ControlPanel />
                </div>

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
