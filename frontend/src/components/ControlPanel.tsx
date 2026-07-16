import { useState } from 'react';
import {
  StopSquareIcon,
  HourglassIcon,
  AlertTriangleIcon,
  PlayIcon,
  SkipForwardIcon,
  PowerIcon,
  RefreshIcon,
} from './Icons';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface FeedbackState {
  message: string;
  error: boolean;
}

interface BtnProps {
  id: string;
  className: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  trigger?: string;
  triggerColor?: string;
}

function CtrlBtn({ id, className, onClick, icon, label, description, trigger, triggerColor }: BtnProps) {
  return (
    <button id={id} className={`ctrl-btn ${className}`} onClick={onClick}>
      <span className="ctrl-btn-icon">{icon}</span>
      <span className="ctrl-btn-content">
        <span className="ctrl-btn-label">{label}</span>
        <span className="ctrl-btn-desc">{description}</span>
      </span>
      {trigger && (
        <span className="ctrl-btn-trigger" style={{ color: triggerColor, borderColor: triggerColor, background: `${triggerColor}18` }}>
          {trigger}
        </span>
      )}
    </button>
  );
}

export function ControlPanel() {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  async function post(path: string, body?: object): Promise<void> {
    try {
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text();
        setFeedback({ message: `Error: ${text}`, error: true });
      } else {
        setFeedback({ message: 'Command sent — health check updates in 3s', error: false });
      }
    } catch (e) {
      setFeedback({ message: `Request failed: ${String(e)}`, error: true });
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="injection-panel">
      <div className="injection-groups">

        {/* Feed group */}
        <div className="injection-group">
          <div className="injection-group-label">Feed Controls</div>
          <div className="injection-group-buttons">
            <CtrlBtn
              id="ctrl-stop-feed"
              className="destructive"
              onClick={() => post('/admin/fault', { mode: 'STOPPED' })}
              icon={<StopSquareIcon size={15} />}
              label="Stop Feed"
              description="Halts tick generation — triggers Feed Dead after 10s"
              trigger="Feed Dead"
              triggerColor="#f59e0b"
            />
            <CtrlBtn
              id="ctrl-slow-consumer"
              className="destructive"
              onClick={() => post('/admin/slow-consumer')}
              icon={<HourglassIcon size={15} />}
              label="Slow Consumer"
              description="Adds 2s write delay — fills queue past 50, triggers Ingestion Lagging"
              trigger="Ingestion Lagging"
              triggerColor="#eab308"
            />
            <CtrlBtn
              id="ctrl-corrupt-ts"
              className="destructive"
              onClick={() => post('/admin/fault', { mode: 'CORRUPT_TIMESTAMP' })}
              icon={<AlertTriangleIcon size={15} />}
              label="Corrupt Timestamps"
              description="Backdates each tick 10 min — triggers Data Stale after 30s"
              trigger="Data Stale"
              triggerColor="#a855f7"
            />
            <div className="injection-divider" />
            <CtrlBtn
              id="ctrl-resume-feed"
              className="recover"
              onClick={() => post('/admin/fault', { mode: 'NORMAL' })}
              icon={<PlayIcon size={15} />}
              label="Resume Feed"
              description="Returns feed to normal mode — clears Feed Dead and Data Stale"
            />
            <CtrlBtn
              id="ctrl-clear-lag"
              className="recover"
              onClick={() => post('/admin/normal-consumer')}
              icon={<SkipForwardIcon size={15} />}
              label="Clear Consumer Lag"
              description="Removes write delay — queue drains, Ingestion Lagging clears"
            />
          </div>
        </div>

        {/* Database group */}
        <div className="injection-group">
          <div className="injection-group-label">Database Controls</div>
          <div className="injection-group-buttons">
            <CtrlBtn
              id="ctrl-kill-primary"
              className="destructive"
              onClick={() => post('/admin/kill-primary')}
              icon={<PowerIcon size={15} />}
              label="Kill Primary DB"
              description="Closes the asyncpg connection pool — triggers DB Unreachable"
              trigger="DB Unreachable"
              triggerColor="#ef4444"
            />
            <div className="injection-divider" />
            <CtrlBtn
              id="ctrl-restore-primary"
              className="recover"
              onClick={() => post('/admin/restore-primary')}
              icon={<RefreshIcon size={15} />}
              label="Restore Primary DB"
              description="Re-opens the connection pool — DB Unreachable clears on next check"
            />
          </div>
        </div>

      </div>

      {feedback && (
        <div className={`ctrl-feedback ${feedback.error ? 'error' : ''}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}
