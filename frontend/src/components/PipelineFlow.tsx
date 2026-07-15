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
}

interface Props {
  faults: FaultStates;
  meta: Meta;
}

interface NodeConfig {
  id: string;
  label: string;
  icon: string;
  statusText: (meta: Meta) => string;
  fault: boolean;
  faultColor?: string;
  faultGlow?: string;
}

export function PipelineFlow({ faults, meta }: Props) {
  const nodes: NodeConfig[] = [
    {
      id: 'node-feed',
      label: 'Feed Generator',
      icon: '📡',
      statusText: (m) => m.feed_mode,
      fault: faults.feed_dead.active,
      faultColor: '#f59e0b',
      faultGlow: 'rgba(245,158,11,0.3)',
    },
    {
      id: 'node-queue',
      label: 'Tick Queue',
      icon: '🗂',
      statusText: (m) => `depth: ${m.queue_depth}`,
      fault: faults.ingestion_lagging.active,
      faultColor: '#eab308',
      faultGlow: 'rgba(234,179,8,0.3)',
    },
    {
      id: 'node-ingestion',
      label: 'Ingestion',
      icon: '⚙️',
      statusText: (m) => `last tick ${m.last_tick_received_ago_s}s ago`,
      fault: faults.data_stale.active,
      faultColor: '#a855f7',
      faultGlow: 'rgba(168,85,247,0.3)',
    },
    {
      id: 'node-db',
      label: `DB (${meta.db_active})`,
      icon: '🗄',
      statusText: (m) => m.db_active,
      fault: faults.db_unreachable.active,
      faultColor: '#ef4444',
      faultGlow: 'rgba(239,68,68,0.3)',
    },
  ];

  const anyFault = Object.values(faults).some((f) => f.active);

  return (
    <div className="pipeline-flow">
      <div className="section-label" style={{ marginBottom: 16 }}>Pipeline State</div>
      <div className="pipeline-nodes">
        {nodes.map((node, i) => (
          <>
            <div className="pipeline-node" key={node.id} id={node.id}>
              <div
                className={`pipeline-node-icon ${node.fault ? 'fault' : 'ok'}`}
                style={node.fault ? {
                  ['--node-fault-color' as string]: node.faultColor,
                  ['--node-fault-glow' as string]: node.faultGlow,
                } : {}}
              >
                {node.icon}
              </div>
              <div className="pipeline-node-label">{node.label}</div>
              <div className="pipeline-node-status">{node.statusText(meta)}</div>
            </div>

            {i < nodes.length - 1 && (
              <div
                key={`conn-${i}`}
                className={`pipeline-connector ${node.fault ? 'broken' : anyFault ? '' : 'flowing'}`}
              />
            )}
          </>
        ))}
      </div>
    </div>
  );
}
