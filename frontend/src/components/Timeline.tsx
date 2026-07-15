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
  return (
    <div className="timeline-panel">
      <div className="timeline-header">State Transition Log</div>
      <div className="timeline-list">
        {history.length === 0 ? (
          <div className="timeline-empty">No transitions yet — system is initialising</div>
        ) : (
          history.map((evt, i) => {
            const color = evt.active
              ? (FAULT_COLORS[evt.fault] ?? '#8a90a0')
              : '#10b981';

            return (
              <div className="timeline-item" key={i}>
                <div
                  className="timeline-dot"
                  style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                />
                <div className="timeline-content">
                  <div className="timeline-fault-name">
                    {evt.active ? '▲' : '▼'} {FAULT_LABELS[evt.fault] ?? evt.fault}
                  </div>
                  <div className="timeline-reason">{evt.reason}</div>
                </div>
                <div className="timeline-ts">{formatTs(evt.ts)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
