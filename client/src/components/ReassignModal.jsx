import { useState } from 'react';

// Shown when deactivation hits a 409. Lists exactly which stages are
// blocking it (from the server's error response) and lets the admin
// pick someone else to take them over.
function ReassignModal({ fromUser, assignments, users, onClose, onReassign }) {
  const [toUserId, setToUserId] = useState('');

  const eligibleUsers = users.filter((u) => u.isActive && u.id !== fromUser.id);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: 'white', padding: 24, width: 420, borderRadius: 4 }}>
        <h3>Cannot deactivate {fromUser.name}</h3>
        <p>They have {assignments.length} active stage assignment(s):</p>
        <ul style={{ fontSize: 13, maxHeight: 150, overflowY: 'auto' }}>
          {assignments.map((a) => (
            <li key={a.stageId}>{a.projectName} — {a.stageName}</li>
          ))}
        </ul>

        <label>Reassign all of these to:</label>
        <select value={toUserId} onChange={(e) => setToUserId(e.target.value)} style={{ width: '100%', margin: '8px 0' }}>
          <option value="">Select a user</option>
          {eligibleUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button disabled={!toUserId} onClick={() => onReassign(Number(toUserId))}>
            Reassign and deactivate
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default ReassignModal;