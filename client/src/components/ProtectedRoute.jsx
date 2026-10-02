import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';

// Wraps an entire ROUTE (a whole page), not just a button or section.
// If not logged in -> redirect to login. If logged in but lacks the
// permission -> show a clear "not allowed" message instead of the page.
function ProtectedRoute({ module, action, children }) {
  const user = useSelector((state) => state.auth.user);
  const allowed = usePermission(module, action);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowed) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Not allowed</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;