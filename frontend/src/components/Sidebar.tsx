interface Meta {
  queue_depth: number;
  feed_mode: string;
  db_active: string;
  primary_up: boolean;
  replica_up: boolean;
  last_tick_received_ago_s: number;
}

interface Props {
  open: boolean;
  onToggle: () => void;
  meta: Meta | null;
  fetchError: boolean;
}

interface MetricRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function MetricRow({ label, value, valueColor }: MetricRowProps) {
  return (
    <div className="sidebar-metric-row">
      <span className="sidebar-metric-label">{label}</span>
      <span className="sidebar-metric-value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </span>
    </div>
  );
}

export function Sidebar({ open, onToggle, meta, fetchError }: Props) {
  return (
    <aside className={`sidebar ${open ? 'open' : 'collapsed'}`}>
      <button className="sidebar-toggle" onClick={onToggle} title={open ? 'Collapse sidebar' : 'Expand sidebar'}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 200ms ease' }}
        >
          <polyline points="15,18 9,12 15,6" />
        </svg>
      </button>

      {open && (
        <div className="sidebar-content">
          <div className="sidebar-section-label">System Metrics</div>

          {fetchError && (
            <div className="sidebar-error-row">
              <span className="sidebar-error-dot" />
              Backend unreachable
            </div>
          )}

          {meta ? (
            <>
              <MetricRow
                label="Feed Mode"
                value={meta.feed_mode}
                valueColor={meta.feed_mode !== 'NORMAL' ? '#f59e0b' : '#10b981'}
              />
              <MetricRow
                label="Queue Depth"
                value={String(meta.queue_depth)}
                valueColor={meta.queue_depth > 50 ? '#eab308' : '#10b981'}
              />
              <MetricRow
                label="Last Tick"
                value={`${meta.last_tick_received_ago_s.toFixed(1)}s ago`}
              />
              <MetricRow
                label="DB Target"
                value={meta.db_active}
              />
              <MetricRow
                label="Primary"
                value={meta.primary_up ? 'up' : 'down'}
                valueColor={meta.primary_up ? '#10b981' : '#ef4444'}
              />
              <MetricRow
                label="Replica"
                value={meta.replica_up ? 'up' : 'none'}
                valueColor={meta.replica_up ? '#10b981' : '#475569'}
              />
            </>
          ) : (
            <div className="sidebar-loading">Connecting...</div>
          )}

          <div className="sidebar-poll-note">Polled every 2s</div>
        </div>
      )}

      {!open && meta && (
        <div className="sidebar-mini-status">
          <div
            className="sidebar-mini-dot"
            style={{ background: meta.primary_up && meta.feed_mode === 'NORMAL' ? '#10b981' : '#ef4444' }}
            title={meta.primary_up ? 'System healthy' : 'Fault active'}
          />
        </div>
      )}
    </aside>
  );
}
