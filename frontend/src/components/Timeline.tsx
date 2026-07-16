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
      <div className="timeline-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
        </svg>
        State Transitions
      </div>
      <div className="timeline-list">
        {history.length === 0 ? (
          <div className="timeline-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, marginBottom: 8 }}>
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
            </svg>
            Waiting for first event
          </div>
        ) : (
          [...history].reverse().map((evt, i) => {
            const faultColor = FAULT_COLORS[evt.fault] ?? '#8a90a0';
            const eventColor = evt.active ? faultColor : '#10b981';
            return (
              <div className="timeline-item" key={i}>
                <div
                  className="timeline-dot"
                  style={{ background: eventColor, boxShadow: `0 0 5px ${eventColor}` }}
                />
                <div className="timeline-content">
                  <div className="timeline-top-row">
                    <span
                      className="timeline-badge"
                      style={{
                        color: faultColor,
                        background: `${faultColor}18`,
                        borderColor: `${faultColor}40`,
                      }}
                    >
                      {FAULT_LABELS[evt.fault] ?? evt.fault}
                    </span>
                    <span className={`timeline-state-chip ${evt.active ? 'fault' : 'cleared'}`}>
                      {evt.active ? 'TRIGGERED' : 'CLEARED'}
                    </span>
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
