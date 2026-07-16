import { useState, useRef, useEffect } from 'react';
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
  threshold: string;
  fault: FaultInfo;
}

function getElapsed(since: string | null): string {
  if (!since) return '';
  const delta = Math.floor((Date.now() - new Date(since).getTime()) / 1000);
  if (delta < 60) return `${delta}s`;
  return `${Math.floor(delta / 60)}m ${delta % 60}s`;
}

function FaultIcon({ iconType }: { iconType: Props['iconType'] }) {
  switch (iconType) {
    case 'signal': return <SignalIcon size={20} />;
    case 'database': return <DatabaseIcon size={20} />;
    case 'hourglass': return <HourglassIcon size={20} />;
    case 'clock': return <ClockIcon size={20} />;
  }
}

function ThresholdTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="threshold-tip-wrap" ref={ref}>
      <button
        className="threshold-tip-btn"
        onClick={() => setOpen(o => !o)}
        aria-label="Show threshold condition"
        title="What triggers this fault?"
      >
        i
      </button>
      {open && (
        <div className="threshold-tip-bubble">
          <div className="threshold-tip-title">Trigger condition</div>
          {text}
        </div>
      )}
    </div>
  );
}

export function FaultStateCard({ id, title, description, iconType, color, colorDim, threshold, fault }: Props) {
  const elapsed = getElapsed(fault.since);

  return (
    <div
      id={id}
      className={`fault-card ${fault.active ? 'active' : ''}`}
      style={fault.active ? {
        ['--card-color' as string]: color,
        ['--card-color-dim' as string]: colorDim,
      } : {}}
    >
      <div className="fault-card-header">
        <div className={`fault-card-icon ${fault.active ? 'active' : ''}`}
          style={fault.active ? { color, background: colorDim } : {}}>
          <FaultIcon iconType={iconType} />
        </div>
        <div className="fault-card-header-right">
          <span className={`fault-badge ${fault.active ? 'active' : 'ok'}`}
            style={fault.active ? { color, background: colorDim, border: `1px solid ${color}40` } : {}}>
            {fault.active ? 'FAULT' : 'OK'}
          </span>
          <ThresholdTip text={threshold} />
        </div>
      </div>

      <div className="fault-card-body">
        <div className="fault-card-title">{title}</div>
        <div className="fault-card-description">{description}</div>
      </div>

      {fault.active && fault.reason && (
        <div className="fault-card-reason" style={{ color, borderColor: `${color}30`, background: colorDim }}>
          {fault.reason}
        </div>
      )}

      {fault.active && elapsed && (
        <div className="fault-card-elapsed">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
          </svg>
          Active for {elapsed}
        </div>
      )}
    </div>
  );
}
