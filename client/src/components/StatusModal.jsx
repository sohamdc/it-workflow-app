import { useState } from 'react';

const STATUSES = ['NotStarted', 'InProgress', 'Blocked', 'OnHold', 'Completed'];

// A pure form component — it doesn't know about Redux or the API at all,
// it just collects the right fields and calls onSave with a clean payload.
// This keeps the conditional-field logic in one obvious place.
function StatusModal({ stage, onClose, onSave }) {
  const [status, setStatus] = useState(stage.status);
  const [blocker, setBlocker] = useState(stage.blocker || '');
  const [reason, setReason] = useState(stage.reason || '');
  const [completionDate, setCompletionDate] = useState(
    stage.completionDate ? stage.completionDate.slice(0, 10) : ''
  );
  const [dueDate, setDueDate] = useState(stage.dueDate ? stage.dueDate.slice(0, 10) : '');
  const [localError, setLocalError] = useState('');

  function handleSave() {
    // Client-side pre-check so the user gets instant feedback before
    // even hitting the server (the server re-validates too, as the real guard).
    if (status === 'Blocked' && !blocker.trim()) {
      return setLocalError('Blocker reason is required when status is Blocked');
    }
    if (status === 'OnHold' && !reason.trim()) {
      return setLocalError('Reason is required when status is OnHold');
    }
    if (status === 'Completed' && !completionDate) {
      return setLocalError('Completion date is required when status is Completed');
    }
    setLocalError('');

    onSave({
      status,
      blocker: status === 'Blocked' ? blocker : undefined,
      reason: status === 'OnHold' ? reason : undefined,
      completionDate: status === 'Completed' ? completionDate : undefined,
      dueDate: dueDate || undefined,
    });
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: 'white', padding: 24, width: 360, borderRadius: 4 }}>
        <h3>{stage.name}</h3>

        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', marginBottom: 12 }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <label>Due date</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />

        {status === 'Blocked' && (
          <div style={{ marginBottom: 12 }}>
            <label>Blocker (required)</label>
            <input value={blocker} onChange={(e) => setBlocker(e.target.value)} style={{ width: '100%' }} />
          </div>
        )}

        {status === 'OnHold' && (
          <div style={{ marginBottom: 12 }}>
            <label>Reason (required)</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%' }} />
          </div>
        )}

        {status === 'Completed' && (
          <div style={{ marginBottom: 12 }}>
            <label>Completion date (required)</label>
            <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} style={{ width: '100%' }} />
          </div>
        )}

        {localError && <p style={{ color: 'red' }}>{localError}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default StatusModal;