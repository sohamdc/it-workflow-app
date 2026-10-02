import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSopList, fetchSopDetail, createSop,
  addStage, updateStage, deleteStage, reorderStages, publishSop,
} from '../store/sopSlice';

function SopBuilder() {
  const dispatch = useDispatch();
  const { list, current } = useSelector((state) => state.sop);
  const [newSopName, setNewSopName] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [newStageVisible, setNewStageVisible] = useState(false);

  useEffect(() => {
    dispatch(fetchSopList());
  }, [dispatch]);

  function openSop(id) {
    dispatch(fetchSopDetail(id));
  }

  async function handleCreateSop(e) {
    e.preventDefault();
    if (!newSopName.trim()) return;
    const result = await dispatch(createSop(newSopName));
    setNewSopName('');
    dispatch(fetchSopDetail(result.payload.id)); // open it right away
  }

  async function handleAddStage(e) {
    e.preventDefault();
    if (!newStageName.trim()) return;
    await dispatch(addStage({ sopId: current.id, name: newStageName, clientVisible: newStageVisible }));
    setNewStageName('');
    setNewStageVisible(false);
  }

  function toggleVisible(stage) {
    dispatch(updateStage({ sopId: current.id, stageId: stage.id, data: { clientVisible: !stage.clientVisible } }));
  }

  function removeStage(stageId) {
    dispatch(deleteStage({ sopId: current.id, stageId }));
  }

  function moveStage(index, direction) {
    const stages = [...current.stages].sort((a, b) => a.order - b.order);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    // Swap the two stages' positions in the array, then send the full new order.
    [stages[index], stages[targetIndex]] = [stages[targetIndex], stages[index]];
    const orderedStageIds = stages.map((s) => s.id);
    dispatch(reorderStages({ sopId: current.id, orderedStageIds })).then(() => {
      dispatch(fetchSopDetail(current.id)); // refresh to show the server's confirmed order
    });
  }

  function handlePublish() {
    if (window.confirm('Publishing locks this SOP forever. Continue?')) {
      dispatch(publishSop(current.id));
    }
  }

  function handleNewDraftFrom() {
    // Simple reuse of the create+copy backend endpoint via a direct call,
    // since this is a rare action — just refetch the list after.
    import('../api/axios').then(({ default: api }) => {
      api.post(`/sop/${current.id}/new-draft`).then((res) => {
        dispatch(fetchSopList());
        dispatch(fetchSopDetail(res.data.id));
      });
    });
  }

  const isDraft = current?.status === 'draft';
  const sortedStages = current ? [...current.stages].sort((a, b) => a.order - b.order) : [];

  return (
    <div style={{ padding: 24, display: 'flex', gap: 32 }}>
      {/* Left: list of all SOP versions */}
      <div style={{ width: 280 }}>
        <h3>SOP Versions</h3>
        <form onSubmit={handleCreateSop} style={{ marginBottom: 16 }}>
          <input
            placeholder="New SOP name"
            value={newSopName}
            onChange={(e) => setNewSopName(e.target.value)}
            style={{ width: '100%', padding: 6 }}
          />
          <button type="submit" style={{ marginTop: 6, width: '100%' }}>+ New Draft</button>
        </form>

        {list.map((sop) => (
          <div
            key={sop.id}
            onClick={() => openSop(sop.id)}
            style={{
              padding: 10, marginBottom: 6, cursor: 'pointer',
              border: current?.id === sop.id ? '2px solid #333' : '1px solid #ddd',
            }}
          >
            <strong>{sop.name}</strong>
            <div style={{ fontSize: 12, color: '#666' }}>
              {sop.status === 'published' ? `Published v${sop.versionNumber}` : 'Draft'} — {sop.stageCount} stages
            </div>
          </div>
        ))}
      </div>

      {/* Right: editor for whichever SOP is open */}
      <div style={{ flex: 1 }}>
        {!current && <p>Select an SOP on the left, or create a new draft.</p>}

        {current && (
          <div>
            <h3>
              {current.name}{' '}
              <span style={{ fontSize: 14, color: '#666' }}>
                ({current.status === 'published' ? `Published v${current.versionNumber}` : 'Draft'})
              </span>
            </h3>

            {!isDraft && (
              <button onClick={handleNewDraftFrom} style={{ marginBottom: 12 }}>
                Create new draft from this version
              </button>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                  <th>Order</th><th>Stage name</th><th>Client visible</th><th></th>
                </tr>
              </thead>
              <tbody>
                {sortedStages.map((stage, index) => (
                  <tr key={stage.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td>
                      {stage.order}{' '}
                      {isDraft && (
                        <>
                          <button onClick={() => moveStage(index, -1)} disabled={index === 0}>↑</button>
                          <button onClick={() => moveStage(index, 1)} disabled={index === sortedStages.length - 1}>↓</button>
                        </>
                      )}
                    </td>
                    <td>{stage.name}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={stage.clientVisible}
                        disabled={!isDraft}
                        onChange={() => toggleVisible(stage)}
                      />
                    </td>
                    <td>
                      {isDraft && <button onClick={() => removeStage(stage.id)}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isDraft && (
              <form onSubmit={handleAddStage} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <input
                  placeholder="New stage name"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={newStageVisible}
                    onChange={(e) => setNewStageVisible(e.target.checked)}
                  />{' '}
                  Client visible
                </label>
                <button type="submit">+ Add Stage</button>
              </form>
            )}

            {isDraft && (
              <button
                onClick={handlePublish}
                disabled={sortedStages.length === 0}
                style={{ marginTop: 20, padding: '8px 16px' }}
              >
                Publish this SOP
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SopBuilder;