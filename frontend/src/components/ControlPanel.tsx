import { useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

interface FeedbackState {
  message: string;
  error: boolean;
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
        const data = await res.json();
        setFeedback({ message: JSON.stringify(data), error: false });
      }
    } catch (e) {
      setFeedback({ message: `Request failed: ${String(e)}`, error: true });
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <div className="control-panel">
      <div className="control-header">Fault Injection</div>
      <div className="control-body">

        <div className="control-group-label">Feed</div>

        <button
          id="ctrl-stop-feed"
          className="ctrl-btn destructive"
          onClick={() => post('/admin/fault', { mode: 'STOPPED' })}
        >
          <span className="icon">📡</span>
          Stop feed
        </button>

        <button
          id="ctrl-delay-feed"
          className="ctrl-btn destructive"
          onClick={() => post('/admin/slow-consumer')}
        >
          <span className="icon">⏳</span>
          Slow consumer (lag queue)
        </button>

        <button
          id="ctrl-corrupt-ts"
          className="ctrl-btn destructive"
          onClick={() => post('/admin/fault', { mode: 'CORRUPT_TIMESTAMP' })}
        >
          <span className="icon">🕰</span>
          Corrupt timestamps
        </button>

        <button
          id="ctrl-resume-feed"
          className="ctrl-btn recover"
          onClick={() => post('/admin/fault', { mode: 'NORMAL' })}
        >
          <span className="icon">✅</span>
          Resume feed (normal)
        </button>

        <button
          id="ctrl-normal-consumer"
          className="ctrl-btn recover"
          onClick={() => post('/admin/normal-consumer')}
        >
          <span className="icon">✅</span>
          Clear consumer lag
        </button>

        <div className="control-group-label" style={{ marginTop: 4 }}>Database</div>

        <button
          id="ctrl-kill-primary"
          className="ctrl-btn destructive"
          onClick={() => post('/admin/kill-primary')}
        >
          <span className="icon">🗄</span>
          Kill primary DB
        </button>

        <button
          id="ctrl-restore-primary"
          className="ctrl-btn recover"
          onClick={() => post('/admin/restore-primary')}
        >
          <span className="icon">♻️</span>
          Restore primary DB
        </button>

        {feedback && (
          <div className={`ctrl-feedback ${feedback.error ? 'error' : ''}`}>
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}
