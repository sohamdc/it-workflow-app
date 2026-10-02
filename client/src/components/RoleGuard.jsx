import { usePermission } from '../hooks/usePermission';

// Wraps anything that should only render if the user has a given permission.
// Usage: <RoleGuard module="sop" action="manage"><button>...</button></RoleGuard>
function RoleGuard({ module, action, children, fallback = null }) {
  const allowed = usePermission(module, action);
  return allowed ? children : fallback;
}

export default RoleGuard;