import { SignalIcon, DatabaseIcon, HourglassIcon, ClockIcon } from './Icons';

interface FaultInfo {
  active: boolean;
  reason: string | null;
  since: string | null;
}

interface Props {
  id: string;
  title: string;
  description: string;
  iconType: 'signal' | 'database' | 'hourglass' | 'clock';
  color: string;
  colorDim: string;
  fault: FaultInfo;
}

function getElapsed(since: string | null): string {
  if (!since) return '';
  const delta = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
  if (delta < 60) return `${delta}s`;
  const m = Math.floor(delta / 60);
  const s = delta % 60;
  return `${m}m ${s}s`;
}

function FaultIcon({ iconType, size = 18 }: { iconType: Props['iconType']; size?: number }) {
  switch (iconType) {
    case 'signal': return <SignalIcon size={size} />;
    case 'database': return <DatabaseIcon size={size} />;
    case 'hourglass': return <HourglassIcon size={size} />;
    case 'clock': return <ClockIcon size={size} />;
  }
}

export function FaultStateCard({ id, title, description, iconType, color, colorDim, fault }: Props) {
  const elapsed = getElapsed(fault.since);

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
        <div className="fault-card-icon">
          <FaultIcon iconType={iconType} size={18} />
        </div>
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

      {fault.active && elapsed && (
        <div className="fault-card-elapsed">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
          </svg>
          active {elapsed}
        </div>
      )}
    </div>
  );
}
