import { useEffect, useState, useCallback, useRef } from 'react';
import './index.css';
import { FaultStateCard } from './components/FaultStateCard';
import { PipelineFlow } from './components/PipelineFlow';
import { Timeline } from './components/Timeline';
import { ControlPanel } from './components/ControlPanel';
import {
  InfoIcon,
  SunIcon,
  MoonIcon,
  XIcon,
  ActivityIcon,
  DatabaseIcon,
  ShieldIcon,
  BoltIcon,
} from './components/Icons';

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
    description: 'No new ticks received within the 10-second timeout.',
    iconType: 'signal' as const,
    color: '#f59e0b',
    colorDim: 'rgba(245,158,11,0.12)',
  },
  {
    key: 'db_unreachable' as const,
    id: 'card-db-unreachable',
    title: 'DB Unreachable',
    description: 'Primary connection pool is down, no replica available.',
    iconType: 'database' as const,
    color: '#ef4444',
    colorDim: 'rgba(239,68,68,0.12)',
  },
  {
    key: 'ingestion_lagging' as const,
    id: 'card-ingestion-lagging',
    title: 'Ingestion Lagging',
    description: 'Queue depth exceeded 50 — consumer is falling behind.',
    iconType: 'hourglass' as const,
    color: '#eab308',
    colorDim: 'rgba(234,179,8,0.12)',
  },
  {
    key: 'data_stale' as const,
    id: 'card-data-stale',
    title: 'Data Stale',
    description: 'Last written tick timestamp is more than 30 seconds old.',
    iconType: 'clock' as const,
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
      >
        <InfoIcon size={11} />
      </button>
      {open && <div className="infotip-bubble">{text}</div>}
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
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <XIcon size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-lead">
            A simulated market data pipeline you can deliberately break. Each of the four
            panels tracks a <strong>different failure condition independently</strong> — the goal is to
            show that when a system goes dark, you can know exactly <em>which layer</em> failed.
          </p>

          <h3>The problem it solves</h3>
          <p>
            In real-time data pipelines, multiple layers can fail at the same time: the data source
            goes silent, the database crashes, the consumer falls behind under load, or data arrives
            with corrupted timestamps. A system that only shows a generic red alert is useless
            on-call. You need to know <em>which layer</em> broke and <em>why</em>.
          </p>

          <h3>What you're looking at</h3>
          <ul>
            <li>
              <strong>Feed Generator</strong> — a background thread emitting synthetic price ticks
              for 18 symbols every 500ms, simulating a real-time market feed.
            </li>
            <li>
              <strong>Tick Queue</strong> — an in-process queue between the feed and the consumer.
              Queue depth is monitored as an independent signal.
            </li>
            <li>
              <strong>Ingestion Loop</strong> — an async consumer draining the queue and writing
              each tick to PostgreSQL via asyncpg.
            </li>
            <li>
              <strong>Health Checker</strong> — runs every 3 seconds, evaluating four independent
              conditions. Each has its own threshold and reason string.
            </li>
          </ul>

          <h3>The four fault states</h3>
          <div className="modal-faults">
            {[
              { color: '#f59e0b', name: 'Feed Dead', desc: 'No tick received in 10s. The data source went silent.' },
              { color: '#ef4444', name: 'DB Unreachable', desc: 'Primary pool closed. Writes are failing.' },
              { color: '#eab308', name: 'Ingestion Lagging', desc: 'Queue > 50 items. Consumer cannot keep up.' },
              { color: '#a855f7', name: 'Data Stale', desc: 'Last tick is 30s+ old. Timestamps are corrupted.' },
            ].map(f => (
              <div className="modal-fault" key={f.name}>
                <span className="mf-dot" style={{ background: f.color }} />
                <div>
                  <strong>{f.name}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <h3>How to use it</h3>
          <p>
            Use the <strong>Fault Injection</strong> panel to trigger any scenario. Each button
            causes exactly one fault state to activate. The matching recovery button resolves
            it — no service restart required. The <strong>State Transitions</strong> log on the
            left records every event with a timestamp and the exact reason string.
          </p>

          <div className="modal-footer-note">
            FastAPI · asyncpg · PostgreSQL (Neon) · React · Vite · Render + Vercel
          </div>
        </div>
      </div>
    </div>
  );
}

// ── System Status panel ──────────────────────────────────────────────────────
function SystemStatus({ meta, fetchError }: { meta: StatusPayload['meta']; fetchError: boolean }) {
  return (
    <div className="left-panel-section">
      <div className="section-label">
        <DatabaseIcon size={11} />
        System Status
        <InfoTip text="Live backend metrics polled every 2 seconds. Queue depth and feed mode change colour when they indicate a problem." />
      </div>
      <div className="status-stack">
        {fetchError && (
          <div className="status-row status-row-error">
            <span className="status-key">backend</span>
            <span className="status-val" style={{ color: '#ef4444' }}>unreachable</span>
          </div>
        )}
        <div className="status-row">
          <span className="status-key">feed mode</span>
          <span className="status-val" style={{ color: meta.feed_mode !== 'NORMAL' ? '#f59e0b' : 'var(--color-healthy)' }}>
            {meta.feed_mode}
          </span>
        </div>
        <div className="status-row">
          <span className="status-key">queue depth</span>
          <span className="status-val" style={{ color: meta.queue_depth > 50 ? '#eab308' : 'var(--color-healthy)' }}>
            {meta.queue_depth}
          </span>
        </div>
        <div className="status-row">
          <span className="status-key">last tick</span>
          <span className="status-val">{meta.last_tick_received_ago_s.toFixed(1)}s ago</span>
        </div>
        <div className="status-row">
          <span className="status-key">db target</span>
          <span className="status-val">{meta.db_active}</span>
        </div>
        <div className="status-row">
          <span className="status-key">primary</span>
          <span className="status-val" style={{ color: meta.primary_up ? '#10b981' : '#ef4444' }}>
            {meta.primary_up ? 'up' : 'down'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-key">replica</span>
          <span className="status-val" style={{ color: meta.replica_up ? '#10b981' : 'var(--text-muted)' }}>
            {meta.replica_up ? 'up' : 'none'}
          </span>
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

  const anyFault = status ? Object.values(status.fault_states).some(f => f.active) : false;
  const activeFaultCount = status ? Object.values(status.fault_states).filter(f => f.active).length : 0;

  return (
    <div className="app">
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <ShieldIcon size={16} />
          </div>
          <div>
            <h1>Market Fault Isolation</h1>
            <div className="subtitle">Injecting and isolating failures in a live data pipeline</div>
          </div>
        </div>
        <div className="header-right">
          {anyFault && (
            <span className="active-fault-badge">
              <span className="fault-badge-dot" />
              {activeFaultCount} fault{activeFaultCount > 1 ? 's' : ''} active
            </span>
          )}
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
            <InfoIcon size={15} />
          </button>
          <button
            className="icon-btn"
            id="btn-theme"
            onClick={() => setDarkMode(d => !d)}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <SunIcon size={15} /> : <MoonIcon size={15} />}
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
          <div className="page-grid">

            {/* ── LEFT sticky panel ── */}
            <aside className="col-left">
              <SystemStatus meta={status.meta} fetchError={fetchError} />
              <div className="left-panel-section left-panel-timeline">
                <div className="section-label">
                  <ActivityIcon size={11} />
                  State Transitions
                  <InfoTip text="Every time a fault activates or clears, one entry is appended here with a UTC timestamp and the exact reason string from the health checker. Resets on service restart." />
                </div>
                <Timeline history={status.history} />
              </div>
            </aside>

            {/* ── MAIN column ── */}
            <div className="col-main">

              {/* Health Checks */}
              <section>
                <div className="section-label">
                  <ShieldIcon size={11} />
                  Health Checks
                  <InfoTip text="Four independent checks run every 3 seconds. Each has its own condition and threshold — a green card means that specific fault is not present, even if other faults are active simultaneously." />
                </div>
                <div className="fault-grid">
                  {FAULT_CONFIGS.map(cfg => (
                    <FaultStateCard
                      key={cfg.key}
                      id={cfg.id}
                      title={cfg.title}
                      description={cfg.description}
                      iconType={cfg.iconType}
                      color={cfg.color}
                      colorDim={cfg.colorDim}
                      fault={status.fault_states[cfg.key]}
                    />
                  ))}
                </div>
              </section>

              {/* Pipeline Diagram */}
              <section>
                <div className="section-label">
                  <ActivityIcon size={11} />
                  Data Flow
                  <InfoTip text="Shows the live path a price tick takes from the feed generator through the queue, ingestion loop, and into PostgreSQL. Each node and connector highlights its fault colour when that layer has an active fault." />
                </div>
                <PipelineFlow faults={status.fault_states} meta={status.meta} />
              </section>

              {/* Fault Injection */}
              <section>
                <div className="section-label">
                  <BoltIcon size={11} />
                  Fault Injection
                  <InfoTip text="Trigger any failure scenario without touching the terminal. Each destructive button causes exactly one fault state to activate. Recovery buttons resolve it — no service restart needed." />
                </div>
                <ControlPanel />
              </section>

            </div>
          </div>
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
