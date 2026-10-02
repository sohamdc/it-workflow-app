import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, fetchRoles, createUser, deactivateUser, reassignUser } from '../store/userSlice';
import ReassignModal from '../components/ReassignModal';

function UserManagement() {
  const dispatch = useDispatch();
  const { list: users, roles } = useSelector((state) => state.users);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  // Holds the 409 response data while the reassign modal is open.
  const [blockedDeactivation, setBlockedDeactivation] = useState(null); // { user, assignments }

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchRoles());
  }, [dispatch]);

  async function handleCreateUser(e) {
    e.preventDefault();
    await dispatch(createUser({ name, email, password, roleId: Number(roleId) }));
    setName(''); setEmail(''); setPassword(''); setRoleId('');
  }

  async function handleDeactivate(user) {
    if (!window.confirm(`Deactivate ${user.name}?`)) return;

    const result = await dispatch(deactivateUser(user.id));
    if (deactivateUser.rejected.match(result) && result.payload?.status === 409) {
      // Open the reassign modal instead of showing a plain error.
      setBlockedDeactivation({ user, assignments: result.payload.assignments });
    }
  }

  async function handleReassignAndRetry(toUserId) {
    const { user } = blockedDeactivation;
    await dispatch(reassignUser({ fromUserId: user.id, toUserId }));
    setBlockedDeactivation(null);
    // Retry deactivation now that the blocking assignments are moved.
    dispatch(deactivateUser(user.id));
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>User Management</h2>

      <form onSubmit={handleCreateUser} style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label>Name</label><br />
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label>Email</label><br />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label><br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label>Role</label><br />
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
            <option value="">Select role</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button type="submit">Create User</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Role</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{u.name}</td>
              <td style={{ padding: 8 }}>{u.email}</td>
              <td style={{ padding: 8 }}>{u.role}</td>
              <td style={{ padding: 8 }}>{u.isActive ? 'Active' : 'Inactive'}</td>
              <td style={{ padding: 8 }}>
                {u.isActive && (
                  <button onClick={() => handleDeactivate(u)}>Deactivate</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {blockedDeactivation && (
        <ReassignModal
          fromUser={blockedDeactivation.user}
          assignments={blockedDeactivation.assignments}
          users={users}
          onClose={() => setBlockedDeactivation(null)}
          onReassign={handleReassignAndRetry}
        />
      )}
    </div>
  );
}

export default UserManagement;