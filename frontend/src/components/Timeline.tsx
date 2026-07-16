interface HistoryEvent {
  ts: string;
  fault: string;
  active: boolean;
  reason: string;
}

interface Props {
  history: HistoryEvent[];
}

const FAULT_COLORS: Record<string, string> = {
  feed_dead: '#f59e0b',
  db_unreachable: '#ef4444',
  ingestion_lagging: '#eab308',
  data_stale: '#a855f7',
};

const FAULT_LABELS: Record<string, string> = {
  feed_dead: 'Feed Dead',
  db_unreachable: 'DB Unreachable',
  ingestion_lagging: 'Ingestion Lagging',
  data_stale: 'Data Stale',
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function Timeline({ history }: Props) {
  const sorted = [...history].reverse();

  return (
    <div className="audit-timeline">
      {history.length === 0 ? (
        <div className="audit-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2 }}>
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
          </svg>
          <div className="audit-empty-title">No events recorded yet</div>
          <div className="audit-empty-sub">Go to the Pipeline tab and inject a fault. It will appear here the moment the health checker detects it.</div>
        </div>
      ) : (
        <div className="audit-table">
          <div className="audit-table-head">
            <span>Time</span>
            <span>Fault</span>
            <span>Event</span>
            <span>Reason</span>
          </div>
          {sorted.map((evt, i) => {
            const faultColor = FAULT_COLORS[evt.fault] ?? '#64748b';
            return (
              <div className={`audit-row ${evt.active ? 'triggered' : 'cleared'}`} key={i}>
                <span className="audit-ts">{formatTs(evt.ts)}</span>
                <span className="audit-fault-name">
                  <span
                    className="audit-fault-dot"
                    style={{ background: faultColor }}
                  />
                  {FAULT_LABELS[evt.fault] ?? evt.fault}
                </span>
                <span className={`audit-state-chip ${evt.active ? 'triggered' : 'cleared'}`}>
                  {evt.active ? 'TRIGGERED' : 'CLEARED'}
                </span>
                <span className="audit-reason">{evt.reason}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
