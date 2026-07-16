import { ControlPanel } from '../components/ControlPanel';
import { PipelineFlow } from '../components/PipelineFlow';

interface FaultInfo { active: boolean; reason: string | null; since: string | null; }

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
  };
}

interface Props {
  status: StatusPayload | null;
}

export function PipelineTab({ status }: Props) {
  if (!status) {
    return (
      <div className="tab-loading">
        <div className="loading-spinner" />
        <div className="loading-title">Connecting to backend</div>
        <div className="loading-note">Free tier may take 30–60s to wake up.</div>
      </div>
    );
  }

  return (
    <div className="pipeline-tab">

      {/* ── Data Flow first ── */}
      <div className="tab-section">
        <div className="tab-section-header">
          <h2 className="tab-section-title">
            Data Flow <span className="tab-section-subtitle">Green line = active flow. Broken connectors highlight failures.</span>
          </h2>
        </div>
        <PipelineFlow faults={status.fault_states} meta={status.meta} />
      </div>

      {/* ── Fault Injection below ── */}
      <div className="tab-section">
        <div className="tab-section-header">
          <h2 className="tab-section-title">
            Fault Injection <span className="tab-section-subtitle">Trigger live backend failures to test pipeline resilience.</span>
          </h2>
        </div>
        <ControlPanel />
      </div>

    </div>
  );
}
