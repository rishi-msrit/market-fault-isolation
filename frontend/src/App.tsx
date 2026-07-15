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
    description: 'Primary is down and replica is not yet promoted.',
    icon: '🗄',
    color: '#ef4444',
    colorDim: 'rgba(239,68,68,0.12)',
  },
  {
    key: 'ingestion_lagging' as const,
    id: 'card-ingestion-lagging',
    title: 'Ingestion Lagging',
    description: 'Feed and DB healthy, but tick queue exceeds threshold.',
    icon: '⏳',
    color: '#eab308',
    colorDim: 'rgba(234,179,8,0.12)',
  },
  {
    key: 'data_stale' as const,
    id: 'card-data-stale',
    title: 'Data Stale',
    description: 'Last written tick is older than the 30-second freshness threshold.',
    icon: '🕰',
    color: '#a855f7',
    colorDim: 'rgba(168,85,247,0.12)',
  },
];

export default function App() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
      <header className="app-header">
        <div>
          <h1>Market Data Fault Isolation</h1>
          <div className="subtitle">ingestion pipeline · health monitor</div>
        </div>
        <div className="header-right">
          {fetchError && (
            <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
              backend unreachable
            </span>
          )}
          <div className={`status-dot ${fetchError || anyFault ? 'error' : ''}`} />
        </div>
      </header>

      <main className="app-body">
        {!status ? (
          <div className="loading-screen">
            <div>Connecting to backend…</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{API}</div>
          </div>
        ) : (
          <>
            <div className="intro-banner">
              <div className="intro-text">
                <span className="intro-highlight">What this is:</span> A simulated market-data pipeline that can be deliberately broken. The four panels below track four independent failure conditions — each computed separately, each with its own color and reason. Use the control panel to trigger a fault and watch the system identify exactly which layer failed.
              </div>
              <div className="intro-tags">
                <span className="tag">Python / FastAPI</span>
                <span className="tag">PostgreSQL</span>
                <span className="tag">React / Vite</span>
                <span className="tag">Reliability Engineering</span>
              </div>
            </div>

            <div>
              <div className="section-label">Fault States
                <span className="section-hint">— each state is computed independently. A green card means that specific condition is not present, even if others are active.</span>
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

            <div className="meta-bar" title="Live system stats polled every 2 seconds from the backend">
              <div className="meta-bar-item">
                <span className="label">queue</span>
                <span className="value">{status.meta.queue_depth}</span>
              </div>
              <div className="meta-bar-item">
                <span className="label">feed</span>
                <span className="value">{status.meta.feed_mode}</span>
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
                <span className="value" style={{ color: status.meta.replica_up ? '#10b981' : '#6b7280' }}>
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
                <div className="section-label">State Transition Log
                  <span className="section-hint">— every time a fault activates or clears, it is logged here with a timestamp and the exact reason string from the health checker.</span>
                </div>
                <Timeline history={status.history} />
              </div>
              <div>
                <div className="section-label">Fault Injection
                  <span className="section-hint">— trigger each scenario without touching the terminal. Resolve it with the matching green button.</span>
                </div>
                <ControlPanel />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
