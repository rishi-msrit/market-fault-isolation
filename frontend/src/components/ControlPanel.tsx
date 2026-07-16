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
        setFeedback({ message: 'Command sent successfully', error: false });
      }
    } catch (e) {
      setFeedback({ message: `Request failed: ${String(e)}`, error: true });
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="injection-panel-flat">
      <div className="injection-grid-6">
        
        {/* Tile 1: Stop Feed */}
        <CtrlBtn
          id="ctrl-stop-feed"
          className="destructive"
          onClick={() => post('/admin/fault', { mode: 'STOPPED' })}
          icon={<StopSquareIcon size={14} />}
          label="Stop Feed"
          description="Halts real-time price tick generation."
          trigger="Feed Dead"
          triggerColor="#f59e0b"
        />

        {/* Tile 2: Slow Consumer */}
        <CtrlBtn
          id="ctrl-slow-consumer"
          className="destructive"
          onClick={() => post('/admin/slow-consumer')}
          icon={<HourglassIcon size={14} />}
          label="Slow Consumer"
          description="Adds 2s database write delay."
          trigger="Ingestion Lagging"
          triggerColor="#eab308"
        />

        {/* Tile 3: Corrupt Timestamps */}
        <CtrlBtn
          id="ctrl-corrupt-ts"
          className="destructive"
          onClick={() => post('/admin/fault', { mode: 'CORRUPT_TIMESTAMP' })}
          icon={<AlertTriangleIcon size={14} />}
          label="Corrupt Timestamps"
          description="Backdates ticks by 10 minutes."
          trigger="Data Stale"
          triggerColor="#a855f7"
        />

        {/* Tile 4: Resume Feed */}
        <CtrlBtn
          id="ctrl-resume-feed"
          className="recover"
          onClick={() => post('/admin/fault', { mode: 'NORMAL' })}
          icon={<PlayIcon size={14} />}
          label="Resume Feed"
          description="Restores normal feed generation rate."
        />

        {/* Tile 5: Clear Consumer Lag */}
        <CtrlBtn
          id="ctrl-clear-lag"
          className="recover"
          onClick={() => post('/admin/normal-consumer')}
          icon={<SkipForwardIcon size={14} />}
          label="Clear Consumer Lag"
          description="Removes database write delay."
        />

        {/* Tile 6: Database Controls (Combined) */}
        <div className="db-controls-tile">
          <div className="db-tile-header">
            <span className="db-tile-title">Database Pool</span>
            <span className="ctrl-btn-trigger db-trigger" style={{ color: '#ef4444', borderColor: '#ef4444', background: '#ef444418' }}>
              DB Unreachable
            </span>
          </div>
          <div className="db-tile-buttons">
            <button
              id="ctrl-kill-primary"
              className="db-sub-btn destructive"
              onClick={() => post('/admin/kill-primary')}
            >
              <PowerIcon size={13} />
              Kill
            </button>
            <button
              id="ctrl-restore-primary"
              className="db-sub-btn recover"
              onClick={() => post('/admin/restore-primary')}
            >
              <RefreshIcon size={13} />
              Restore
            </button>
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
