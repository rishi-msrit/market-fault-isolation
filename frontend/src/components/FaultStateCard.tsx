interface FaultInfo {
  active: boolean;
  reason: string | null;
  since: string | null;
}

interface Props {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  colorDim: string;
  fault: FaultInfo;
}

function formatSince(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function FaultStateCard({ id, title, description, icon, color, colorDim, fault }: Props) {
  return (
    <div
      id={id}
      className={`fault-card ${fault.active ? 'active' : ''}`}
      style={{
        ['--card-color' as string]: color,
        ['--card-color-dim' as string]: colorDim,
      }}
    >
      <div className="fault-card-header">
        <div className="fault-card-icon">{icon}</div>
        <span className={`fault-badge ${fault.active ? 'active' : 'ok'}`}>
          {fault.active ? 'FAULT' : 'OK'}
        </span>
      </div>

      <div>
        <div className="fault-card-title">{title}</div>
        <div className="fault-card-description">{description}</div>
      </div>

      {fault.active && fault.reason && (
        <div className="fault-card-reason">{fault.reason}</div>
      )}

      {fault.active && fault.since && (
        <div className="fault-card-since">since {formatSince(fault.since)}</div>
      )}
    </div>
  );
}
