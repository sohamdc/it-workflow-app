import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditLog } from '../store/auditSlice';

const LIMIT = 20;

function AuditLog() {
  const dispatch = useDispatch();
  const { items, total, page } = useSelector((state) => state.audit);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    dispatch(fetchAuditLog({ page: 1, limit: LIMIT, entityType: entityType || undefined, action: action || undefined }));
  }, [dispatch, entityType, action]);

  function goToPage(newPage) {
    dispatch(fetchAuditLog({ page: newPage, limit: LIMIT, entityType: entityType || undefined, action: action || undefined }));
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: 24 }}>
      <h2>Audit Log</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="">All entity types</option>
          <option value="Project">Project</option>
          <option value="ProjectStage">ProjectStage</option>
          <option value="SopVersion">SopVersion</option>
          <option value="User">User</option>
        </select>

        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="UPDATE_STATUS">UPDATE_STATUS</option>
          <option value="PUBLISH">PUBLISH</option>
          <option value="DEACTIVATE">DEACTIVATE</option>
          <option value="REASSIGN">REASSIGN</option>
          <option value="ASSIGN">ASSIGN</option>
          <option value="ADD_REMARK">ADD_REMARK</option>
          <option value="ADD_DOCUMENT">ADD_DOCUMENT</option>
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th style={{ padding: 8 }}>Time</th>
            <th style={{ padding: 8 }}>Actor</th>
            <th style={{ padding: 8 }}>Action</th>
            <th style={{ padding: 8 }}>Entity</th>
            <th style={{ padding: 8 }}>Old value</th>
            <th style={{ padding: 8 }}>New value</th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry) => (
            <tr key={entry.id} style={{ borderBottom: '1px solid #eee', fontSize: 13 }}>
              <td style={{ padding: 8 }}>{new Date(entry.at).toLocaleString()}</td>
              <td style={{ padding: 8 }}>{entry.actor?.name || `User #${entry.actorId}`}</td>
              <td style={{ padding: 8 }}>{entry.action}</td>
              <td style={{ padding: 8 }}>{entry.entityType} #{entry.entityId}</td>
              <td style={{ padding: 8, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {entry.oldValue ? JSON.stringify(entry.oldValue) : '—'}
              </td>
              <td style={{ padding: 8, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {entry.newValue ? JSON.stringify(entry.newValue) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && <p>No audit entries match these filters.</p>}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>Previous</button>
        <span>Page {page} of {totalPages || 1}</span>
        <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export default AuditLog;