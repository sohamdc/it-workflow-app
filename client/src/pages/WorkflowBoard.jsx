import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchProjects, fetchProjectDetail, updateStageStatus,
  fetchStatusHistory, addRemark, optimisticStatusUpdate, rollbackStage,
} from '../store/projectSlice';
import StatusModal from '../components/StatusModal';
import Toast from '../components/Toast';
import { usePermission } from '../hooks/usePermission';

const STATUS_COLORS = {
  NotStarted: '#999', InProgress: '#1976d2', Blocked: '#d32f2f', OnHold: '#f57c00', Completed: '#2e7d32',
};

function WorkflowBoard() {
  const dispatch = useDispatch();
  const { list, current, history, toast } = useSelector((state) => state.projects);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [historyStageId, setHistoryStageId] = useState(null);
  const [remarkText, setRemarkText] = useState('');
  const canUpdateStages = usePermission('stages', 'update');

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    if (selectedProjectId) dispatch(fetchProjectDetail(selectedProjectId));
  }, [selectedProjectId, dispatch]);

  async function handleSaveStatus(stage, data) {
    const previousStage = { ...stage }; // snapshot, for rollback if the server rejects
    dispatch(optimisticStatusUpdate({ stageId: stage.id, data })); // instant UI feedback
    setEditingStage(null);

    const result = await dispatch(updateStageStatus({ projectId: selectedProjectId, stageId: stage.id, data }));
    if (updateStageStatus.rejected.match(result)) {
      dispatch(rollbackStage({ stageId: stage.id, previousStage })); // undo on failure
    }
  }

  function toggleHistory(stageId) {
    if (historyStageId === stageId) {
      setHistoryStageId(null);
    } else {
      setHistoryStageId(stageId);
      dispatch(fetchStatusHistory({ projectId: selectedProjectId, stageId }));
    }
  }

  function handleAddRemark(stageId) {
    if (!remarkText.trim()) return;
    dispatch(addRemark({ projectId: selectedProjectId, stageId, text: remarkText }));
    setRemarkText('');
  }

  const sortedStages = current ? [...current.stages].sort((a, b) => a.order - b.order) : [];
  const completedCount = sortedStages.filter((s) => s.status === 'Completed').length;

  return (
    <div style={{ padding: 24, display: 'flex', gap: 32 }}>
      <Toast toast={toast} />

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
      </div>

      <div style={{ flex: 1 }}>
        {!current && <p>Select a project.</p>}

        {current && (
          <div>
            <h3>{current.name}</h3>
            <p>Progress: {completedCount} of {sortedStages.length} completed</p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {sortedStages.map((stage) => (
                <div key={stage.id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 16, width: 260 }}>
                  <strong>{stage.name}</strong>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ background: STATUS_COLORS[stage.status], color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                      {stage.status}
                    </span>
                  </div>
                  {stage.dueDate && <p style={{ fontSize: 12 }}>Due: {stage.dueDate.slice(0, 10)}</p>}
                  {stage.blocker && <p style={{ fontSize: 12, color: '#d32f2f' }}>Blocker: {stage.blocker}</p>}
                  {stage.reason && <p style={{ fontSize: 12, color: '#f57c00' }}>On hold: {stage.reason}</p>}

                  {canUpdateStages && (
                    <button onClick={() => setEditingStage(stage)} style={{ marginTop: 8 }}>Update status</button>
                  )}
                  <button onClick={() => toggleHistory(stage.id)} style={{ marginTop: 8, marginLeft: 6 }}>History</button>

                  {historyStageId === stage.id && (
                    <div style={{ marginTop: 8, fontSize: 12, background: '#f9f9f9', padding: 8 }}>
                      {(history[stage.id] || []).length === 0 && <p>No history yet.</p>}
                      {(history[stage.id] || []).map((h) => (
                        <div key={h.id}>{h.oldStatus} → {h.newStatus} ({new Date(h.at).toLocaleString()})</div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 8 }}>
                    {(stage.remarks || []).map((r) => (
                      <p key={r.id} style={{ fontSize: 12, fontStyle: 'italic' }}>"{r.text}"</p>
                    ))}
                    {canUpdateStages && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <input
                          placeholder="Add remark"
                          value={editingStage?.id === stage.id ? remarkText : remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          style={{ flex: 1, fontSize: 12 }}
                        />
                        <button onClick={() => handleAddRemark(stage.id)} style={{ fontSize: 12 }}>Add</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editingStage && (
        <StatusModal
          stage={editingStage}
          onClose={() => setEditingStage(null)}
          onSave={(data) => handleSaveStatus(editingStage, data)}
        />
      )}
    </div>
  );
}

export default WorkflowBoard;