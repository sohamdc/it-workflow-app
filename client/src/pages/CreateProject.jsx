import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../store/userSlice';
import { fetchSopList, fetchSopDetail } from '../store/sopSlice';
import { createProject, assignStage } from '../store/projectSlice';

function CreateProject() {
  const dispatch = useDispatch();
  const { list: users } = useSelector((state) => state.users);
  const { list: sopList } = useSelector((state) => state.sop);
  const { current: createdProject } = useSelector((state) => state.projects);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [members, setMembers] = useState([]);
  const [clientUsers, setClientUsers] = useState([]);

  // Find the latest published SOP, to preview its stages before creating.
  const latestPublished = [...sopList]
    .filter((s) => s.status === 'published')
    .sort((a, b) => b.versionNumber - a.versionNumber)[0];
  const { current: previewSop } = useSelector((state) => state.sop);

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchSopList());
  }, [dispatch]);

  useEffect(() => {
    if (latestPublished) {
      dispatch(fetchSopDetail(latestPublished.id));
    }
  }, [latestPublished?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleInList(list, setList, userId) {
    setList(list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !owner) return alert('Name and owner are required');

    await dispatch(createProject({
      name,
      description,
      owner: Number(owner),
      members: members.map(Number),
      clientUsers: clientUsers.map(Number),
    }));
  }

  function handleAssignStage(stageId, assigneeId) {
    dispatch(assignStage({ projectId: createdProject.id, stageId, assigneeId: Number(assigneeId) }));
  }

  const previewStages = previewSop?.stages ? [...previewSop.stages].sort((a, b) => a.order - b.order) : [];

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h2>Create Project</h2>

      {!latestPublished && (
        <p style={{ color: 'red' }}>No published SOP exists yet. Publish one first in SOP Builder.</p>
      )}

      {!createdProject && latestPublished && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>Project name</label><br />
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: 6 }} required />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Description</label><br />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: 6 }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Owner</label><br />
            <select value={owner} onChange={(e) => setOwner(e.target.value)} required>
              <option value="">Select owner</option>
              {users.filter((u) => u.isActive).map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Members (internal team, e.g. IT Members)</label><br />
            {users.filter((u) => u.isActive && u.role !== 'Client').map((u) => (
              <label key={u.id} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={members.includes(u.id)}
                  onChange={() => toggleInList(members, setMembers, u.id)}
                />{' '}
                {u.name} ({u.role})
              </label>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Client users</label><br />
            {users.filter((u) => u.isActive && u.role === 'Client').map((u) => (
              <label key={u.id} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={clientUsers.includes(u.id)}
                  onChange={() => toggleInList(clientUsers, setClientUsers, u.id)}
                />{' '}
                {u.name}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5' }}>
            <strong>Preview — stages that will be created (from "{latestPublished.name}" v{latestPublished.versionNumber}):</strong>
            <ul>
              {previewStages.map((s) => (
                <li key={s.id}>{s.order}. {s.name} {s.clientVisible ? '(client visible)' : '(internal only)'}</li>
              ))}
            </ul>
          </div>

          <button type="submit">Create Project</button>
        </form>
      )}

      {createdProject && (
        <div>
          <h3>✅ Project "{createdProject.name}" created</h3>
          <p>Assign each stage to a team member:</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th>Order</th><th>Stage</th><th>Assign to</th></tr>
            </thead>
            <tbody>
              {[...createdProject.stages].sort((a, b) => a.order - b.order).map((stage) => (
                <tr key={stage.id}>
                  <td>{stage.order}</td>
                  <td>{stage.name}</td>
                  <td>
                    <select
                      defaultValue={stage.assigneeId || ''}
                      onChange={(e) => handleAssignStage(stage.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {users.filter((u) => u.isActive && u.role !== 'Client').map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CreateProject;