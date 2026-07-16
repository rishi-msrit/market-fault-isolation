import { SignalIcon, LayersIcon, CpuIcon, DatabaseIcon } from './Icons';

interface FaultStates {
  feed_dead: { active: boolean };
  db_unreachable: { active: boolean };
  ingestion_lagging: { active: boolean };
  data_stale: { active: boolean };
}

interface Meta {
  queue_depth: number;
  feed_mode: string;
  db_active: string;
  last_tick_received_ago_s: number;
  primary_up: boolean;
}

interface Props {
  faults: FaultStates;
  meta: Meta;
}

interface ConnectorProps {
  topLabel: string;
  bottomLabel: string;
  broken: boolean;
  faultColor: string;
  flowing: boolean;
}

function Connector({ topLabel, bottomLabel, broken, faultColor, flowing }: ConnectorProps) {
  return (
    <div className="pipeline-connector-wrap">
      <div className="connector-label-top">{topLabel}</div>
      <div
        className={`pipeline-connector ${broken ? 'broken' : flowing ? 'flowing' : ''}`}
        style={broken ? ({ '--conn-color': faultColor } as React.CSSProperties) : {}}
      >
        {broken ? (
          <span className="connector-break-mark" style={{ color: faultColor }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
        ) : (
          <span className="connector-arrow">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" />
            </svg>
          </span>
        )}
      </div>
      <div className="connector-label-bottom">{bottomLabel}</div>
    </div>
  );
}

export function PipelineFlow({ faults, meta }: Props) {
  const anyFault = Object.values(faults).some((f) => f.active);

  const feedStatus =
    meta.feed_mode === 'NORMAL'
      ? 'active'
      : meta.feed_mode === 'STOPPED'
      ? 'stopped'
      : 'corrupt ts';

  return (
    <div className="pipeline-flow">
      <div className="pipeline-track">

        {/* Node 1 — Feed Generator */}
        <div
          id="node-feed"
          className={`pipeline-node ${faults.feed_dead.active ? 'node-fault' : 'node-ok'}`}
          style={faults.feed_dead.active ? ({ '--node-color': '#f59e0b', '--node-glow': 'rgba(245,158,11,0.2)' } as React.CSSProperties) : {}}
        >
          <div className="pipeline-node-icon">
            <SignalIcon size={20} />
          </div>
          <div className="pipeline-node-body">
            <div className="pipeline-node-label">Feed Generator</div>
            <div className={`pipeline-node-status ${meta.feed_mode !== 'NORMAL' ? 'status-warn' : ''}`}>
              {feedStatus}
            </div>
          </div>
        </div>

        {/* Connector 1 — Feed → Queue */}
        <Connector
          topLabel="price ticks · 500ms"
          bottomLabel="in-process queue"
          broken={faults.feed_dead.active}
          faultColor="#f59e0b"
          flowing={!anyFault}
        />

        {/* Node 2 — Tick Queue */}
        <div
          id="node-queue"
          className={`pipeline-node ${faults.ingestion_lagging.active ? 'node-fault' : 'node-ok'}`}
          style={faults.ingestion_lagging.active ? ({ '--node-color': '#eab308', '--node-glow': 'rgba(234,179,8,0.2)' } as React.CSSProperties) : {}}
        >
          <div className="pipeline-node-icon">
            <LayersIcon size={20} />
          </div>
          <div className="pipeline-node-body">
            <div className="pipeline-node-label">Tick Queue</div>
            <div className={`pipeline-node-status ${meta.queue_depth > 50 ? 'status-warn' : ''}`}>
              depth: {meta.queue_depth}
            </div>
          </div>
        </div>

        {/* Connector 2 — Queue → Ingestion */}
        <Connector
          topLabel="async consumer drain"
          bottomLabel="asyncio task"
          broken={faults.ingestion_lagging.active}
          faultColor="#eab308"
          flowing={!anyFault}
        />

        {/* Node 3 — Ingestion Loop */}
        <div
          id="node-ingestion"
          className={`pipeline-node ${faults.data_stale.active ? 'node-fault' : 'node-ok'}`}
          style={faults.data_stale.active ? ({ '--node-color': '#a855f7', '--node-glow': 'rgba(168,85,247,0.2)' } as React.CSSProperties) : {}}
        >
          <div className="pipeline-node-icon">
            <CpuIcon size={20} />
          </div>
          <div className="pipeline-node-body">
            <div className="pipeline-node-label">Ingestion Loop</div>
            <div className="pipeline-node-status">
              {meta.last_tick_received_ago_s.toFixed(1)}s ago
            </div>
          </div>
        </div>

        {/* Connector 3 — Ingestion → DB */}
        <Connector
          topLabel="asyncpg write + ts check"
          bottomLabel="PostgreSQL"
          broken={faults.db_unreachable.active || faults.data_stale.active}
          faultColor={faults.db_unreachable.active ? '#ef4444' : '#a855f7'}
          flowing={!anyFault}
        />

        {/* Node 4 — Database */}
        <div
          id="node-db"
          className={`pipeline-node ${faults.db_unreachable.active ? 'node-fault' : 'node-ok'}`}
          style={faults.db_unreachable.active ? ({ '--node-color': '#ef4444', '--node-glow': 'rgba(239,68,68,0.2)' } as React.CSSProperties) : {}}
        >
          <div className="pipeline-node-icon">
            <DatabaseIcon size={20} />
          </div>
          <div className="pipeline-node-body">
            <div className="pipeline-node-label">PostgreSQL</div>
            <div className={`pipeline-node-status ${!meta.primary_up ? 'status-error' : ''}`}>
              {meta.db_active} · {meta.primary_up ? 'up' : 'down'}
            </div>
          </div>
        </div>

      </div>

      {/* Legend */}
      <div className="pipeline-legend">
        <span className="legend-item">
          <span className="legend-dot legend-ok" />
          healthy — data flowing
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-fault" />
          fault at this layer
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-broken" />
          connection broken
        </span>
        <span className="legend-rule" />
        <span className="legend-note">each check is evaluated independently every 3 seconds</span>
      </div>
    </div>
  );
}
