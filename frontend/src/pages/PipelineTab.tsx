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

      {/* ── Fault Injection ── */}
      <div className="tab-section">
        <div className="tab-section-header">
          <h2 className="tab-section-title">Fault Injection</h2>
          <p className="tab-section-desc">
            Trigger a real failure in the live backend pipeline. Each button activates exactly one fault state.
            Recovery clears it immediately — no service restart needed.
          </p>
        </div>
        <ControlPanel />
      </div>

      {/* ── Pipeline Diagram ── */}
      <div className="tab-section">
        <div className="tab-section-header">
          <h2 className="tab-section-title">Data Flow</h2>
          <p className="tab-section-desc">
            Live view of the ingestion pipeline. Green lines show active data flow.
            When you inject a fault above, the affected layer breaks and highlights the failure point.
          </p>
        </div>
        <PipelineFlow faults={status.fault_states} meta={status.meta} />
      </div>

    </div>
  );
}
