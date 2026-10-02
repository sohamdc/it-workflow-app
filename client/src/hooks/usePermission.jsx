import { useSelector } from 'react-redux';

// Usage: const canPublishSop = usePermission('sop', 'publish');
// Returns true/false. Components should NEVER check user.role directly —
// always go through this hook, so permission logic stays DB-driven.
export function usePermission(module, action) {
  const permissions = useSelector((state) => state.auth.user?.permissions || []);
  return permissions.includes(`${module}:${action}`);
}