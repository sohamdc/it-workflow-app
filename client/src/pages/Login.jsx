import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../store/authSlice';

// Where each role lands right after logging in.
const ROLE_LANDING_PAGE = {
  SuperAdmin: '/sop',
  Admin: '/users',
  ITMember: '/projects',
  Client: '/client',
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);

  async function handleSubmit(e) {
    e.preventDefault();
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      const role = result.payload.user.role;
      navigate(ROLE_LANDING_PAGE[role] || '/');
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>IT Workflow Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={status === 'loading'} style={{ width: '100%', padding: 10 }}>
          {status === 'loading' ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </div>
  );
}

export default Login;