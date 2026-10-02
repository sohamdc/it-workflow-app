import { useDispatch, useSelector } from 'react-redux';
import { Link, Outlet } from 'react-router-dom';
import { logoutUser } from '../store/authSlice';
import { usePermission } from '../hooks/usePermission';

// Shared shell around every logged-in page: top nav + whichever page is active (via <Outlet />).
// Each nav link only renders if the user actually has the matching permission —
// so a Client, for example, never even sees a "Users" link to begin with.
function Layout() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();

  const canManageSop = usePermission('sop', 'manage') || usePermission('sop', 'view');
  const canManageUsers = usePermission('users', 'manage');
  const canViewProjects = usePermission('projects', 'view');
  const canViewAudit = usePermission('audit', 'view');

  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: 16, borderBottom: '1px solid #ccc', alignItems: 'center' }}>
        {canManageSop && <Link to="/sop">SOP Builder</Link>}
        {canManageUsers && <Link to="/users">Users</Link>}
        {canViewProjects && <Link to="/projects">Projects</Link>}
        {user?.role === 'Client' && <Link to="/client">My Projects</Link>}
        {canViewAudit && <Link to="/audit">Audit Log</Link>}

        <span style={{ marginLeft: 'auto' }}>
          {user?.name} ({user?.role})
        </span>
        <button onClick={() => dispatch(logoutUser())}>Logout</button>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;