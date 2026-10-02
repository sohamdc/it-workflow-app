import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjects, fetchProjectDetail } from '../store/projectSlice';

const STATUS_COLORS = {
  NotStarted: '#999', InProgress: '#1976d2', Blocked: '#d32f2f', OnHold: '#f57c00', Completed: '#2e7d32',
};

// Deliberately simple and "dumb" — this component does NOT filter anything
// itself. Whatever the API sends in `current.stages` is rendered as-is.
// The real security boundary is the backend's filterClientData middleware (B9);
// this page just trusts it, which is the correct architecture (R4).
function ClientView() {
  const dispatch = useDispatch();
  const { list, current } = useSelector((state) => state.projects);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    if (selectedProjectId) dispatch(fetchProjectDetail(selectedProjectId));
  }, [selectedProjectId, dispatch]);

  const sortedStages = current ? [...current.stages].sort((a, b) => a.order - b.order) : [];
  const completedCount = sortedStages.filter((s) => s.status === 'Completed').length;

  return (
    <div style={{ padding: 24, display: 'flex', gap: 32 }}>
      <div style={{ width: 240 }}>
        <h3>My Projects</h3>
        {list.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelectedProjectId(p.id)}
            style={{ padding: 10, marginBottom: 6, cursor: 'pointer', border: selectedProjectId === p.id ? '2px solid #333' : '1px solid #ddd' }}
          >
            {p.name}
          </div>
        ))}
        {list.length === 0 && <p style={{ fontSize: 13, color: '#666' }}>No projects assigned yet.</p>}
      </div>

      <div style={{ flex: 1 }}>
        {!current && <p>Select a project to view its progress.</p>}

        {current && (
          <div>
            <h3>{current.name}</h3>
            {current.description && <p style={{ color: '#666' }}>{current.description}</p>}
            <p>Progress: {completedCount} of {sortedStages.length} stages completed</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                  <th style={{ padding: 8 }}>Stage</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Due date</th>
                  <th style={{ padding: 8 }}>Completed on</th>
                </tr>
              </thead>
              <tbody>
                {sortedStages.map((stage) => (
                  <tr key={stage.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{stage.name}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{ background: STATUS_COLORS[stage.status], color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                        {stage.status}
                      </span>
                    </td>
                    <td style={{ padding: 8 }}>{stage.dueDate ? stage.dueDate.slice(0, 10) : '—'}</td>
                    <td style={{ padding: 8 }}>{stage.completionDate ? stage.completionDate.slice(0, 10) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClientView;