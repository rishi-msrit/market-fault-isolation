import { useEffect, useState, useCallback } from 'react';
import './index.css';
import { TabNav } from './components/TabNav';
import { Sidebar } from './components/Sidebar';
import { InfoIcon, SunIcon, MoonIcon, XIcon, ShieldIcon } from './components/Icons';
import { PipelineTab } from './pages/PipelineTab';
import { HealthTab } from './pages/HealthTab';
import { AuditTab } from './pages/AuditTab';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const POLL_INTERVAL_MS = 2000;

type TabId = 'pipeline' | 'health' | 'audit';

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
  history: Array<{ ts: string; fault: string; active: boolean; reason: string }>;
}

// ── About Modal ─────────────────────────────────────────────────────────────
function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>About this project</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <XIcon size={15} />
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-lead">
            A simulated market data pipeline designed to test fault isolation. Trigger failures to see how independent checks detect issues at specific layers.
          </p>

          <h3>How it works</h3>
          <p>
            Real-time data feeds fail in different ways. Data sources go silent, databases crash, or queue lag grows. This dashboard isolates each failure mode so you know the exact layer that broke.
          </p>

          <h3>Getting Started</h3>
          <p>
            Use the <strong>Interactive Pipeline</strong> tab to inject failures and watch the diagram break. Monitor active conditions under <strong>Health Monitoring</strong>, and view history in the <strong>System Audit Log</strong>.
          </p>

          <div className="modal-faults">
            {[
              { color: '#f59e0b', name: 'Feed Dead', desc: 'No tick received in 10 seconds.' },
              { color: '#ef4444', name: 'DB Unreachable', desc: 'PostgreSQL connection pool is down.' },
              { color: '#eab308', name: 'Ingestion Lagging', desc: 'Consumer queue exceeds 50 items.' },
              { color: '#a855f7', name: 'Data Stale', desc: 'Silent corruption: ticks arrive backdated.' },
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

          <div className="modal-footer-note">
            FastAPI · asyncpg · PostgreSQL · React · Vite
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('pipeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  return (
    <div className="app">
      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}

      {/* ── Fixed global header ── */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <ShieldIcon size={16} />
          </div>
          <div className="header-title-group">
            <h1 className="header-title">Market Fault Isolation</h1>
            <span className="header-sub">Fault detection · real-time ingestion pipeline demo</span>
          </div>
        </div>
        <div className="header-right">
          {anyFault && (
            <span className="header-fault-badge">
              <span className="fault-pulse-dot" />
              Fault active
            </span>
          )}
          {fetchError && (
            <span className="header-error-badge">backend unreachable</span>
          )}
          <button id="btn-info" className="icon-btn" onClick={() => setShowInfo(true)} title="About this project" aria-label="About">
            <InfoIcon size={15} />
          </button>
          <button id="btn-theme" className="icon-btn" onClick={() => setDarkMode(d => !d)} title="Toggle theme" aria-label="Toggle theme">
            {darkMode ? <SunIcon size={15} /> : <MoonIcon size={15} />}
          </button>
        </div>
      </header>

      {/* ── Tab navigation ── */}
      <TabNav active={activeTab} onChange={setActiveTab} anyFault={anyFault} />

      {/* ── Workspace: sidebar + tab content ── */}
      <div className="app-workspace">
        <Sidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
          meta={status?.meta ?? null}
          fetchError={fetchError}
        />

        <main className="tab-content">
          {activeTab === 'pipeline' && <PipelineTab status={status} />}
          {activeTab === 'health' && <HealthTab status={status} />}
          {activeTab === 'audit' && <AuditTab status={status} />}
        </main>
      </div>

      <footer className="app-footer">
        <span>Market Data Fault Isolation</span>
        <span className="footer-sep">·</span>
        <a href="https://github.com/rishi-msrit/market-fault-isolation" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span className="footer-sep">·</span>
        <span>FastAPI · PostgreSQL · React</span>
      </footer>
    </div>
  );
}
