import { Timeline } from '../components/Timeline';

interface HistoryEvent { ts: string; fault: string; active: boolean; reason: string; }

interface StatusPayload {
  history: HistoryEvent[];
}

interface Props {
  status: StatusPayload | null;
}

export function AuditTab({ status }: Props) {
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
    <div className="audit-tab">
      <div className="tab-section-header">
        <h2 className="tab-section-title">
          System Audit Log <span className="tab-section-subtitle">Real-time log of state transitions and failure reasons.</span>
        </h2>
      </div>
      <Timeline history={status.history} />
    </div>
  );
}
