import { FaultStateCard } from '../components/FaultStateCard';

interface FaultInfo { active: boolean; reason: string | null; since: string | null; }

interface StatusPayload {
  fault_states: {
    feed_dead: FaultInfo;
    db_unreachable: FaultInfo;
    ingestion_lagging: FaultInfo;
    data_stale: FaultInfo;
  };
}

interface Props {
  status: StatusPayload | null;
}

const FAULT_CONFIGS = [
  {
    key: 'feed_dead' as const,
    id: 'card-feed-dead',
    title: 'Feed Dead',
    description: 'The market feed generator has gone silent.',
    iconType: 'signal' as const,
    color: '#f59e0b',
    colorDim: 'rgba(245,158,11,0.1)',
    threshold: 'No new price tick received in the past 10 seconds. The health checker evaluates this every 3 seconds. The feed generator thread runs at 500ms intervals — 10s silence means it has stopped or stalled.',
  },
  {
    key: 'db_unreachable' as const,
    id: 'card-db-unreachable',
    title: 'DB Unreachable',
    description: 'Primary write database is unavailable.',
    iconType: 'database' as const,
    color: '#ef4444',
    colorDim: 'rgba(239,68,68,0.1)',
    threshold: 'The asyncpg primary connection pool is down and no replica is available. The health checker issues a simple SELECT 1 probe — if it throws, the state activates. Cleared when the pool reconnects successfully.',
  },
  {
    key: 'ingestion_lagging' as const,
    id: 'card-ingestion-lagging',
    title: 'Ingestion Lagging',
    description: 'Consumer is falling behind the feed rate.',
    iconType: 'hourglass' as const,
    color: '#eab308',
    colorDim: 'rgba(234,179,8,0.1)',
    threshold: 'The in-process tick queue has exceeded 50 items. At normal speed the feed produces 2 ticks/second. If the consumer write delay is ≥ 2s, the queue fills at 2 items/second and crosses 50 in ~25 seconds.',
  },
  {
    key: 'data_stale' as const,
    id: 'card-data-stale',
    title: 'Data Stale',
    description: 'Written timestamps are corrupted — silent data error.',
    iconType: 'clock' as const,
    color: '#a855f7',
    colorDim: 'rgba(168,85,247,0.1)',
    threshold: 'The timestamp of the last successfully written tick is older than 30 seconds. Feed may be running and DB may be up — but each tick carries a backdated timestamp (10 min in the past). This is the silent corruption scenario.',
  },
];

export function HealthTab({ status }: Props) {
  if (!status) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner" />
        <div className="loading-title">Connecting to backend</div>
        <div className="loading-note">Free tier may take 30–60s to wake up.</div>
      </div>
    );
  }

  const activeFaults = FAULT_CONFIGS.filter(c => status.fault_states[c.key].active);

  return (
    <div className="health-tab">
      <div className="tab-section-header">
        <h2 className="tab-section-title">
          Health Monitoring Matrix <span className="tab-section-subtitle">Four independent checks evaluated every 3s. Click (i) for details.</span>
        </h2>
        {activeFaults.length > 0 && (
          <div className="health-alert-banner">
            {activeFaults.length} fault{activeFaults.length > 1 ? 's' : ''} currently active:{' '}
            {activeFaults.map(f => f.title).join(', ')}
          </div>
        )}
      </div>

      <div className="health-grid">
        {FAULT_CONFIGS.map(cfg => (
          <FaultStateCard
            key={cfg.key}
            id={cfg.id}
            title={cfg.title}
            description={cfg.description}
            iconType={cfg.iconType}
            color={cfg.color}
            colorDim={cfg.colorDim}
            threshold={cfg.threshold}
            fault={status.fault_states[cfg.key]}
          />
        ))}
      </div>
    </div>
  );
}
