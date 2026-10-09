import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { AdminRole } from '../../api/types';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: ReactNode;
  roles?: AdminRole[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { admin, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading…</div>;
  }
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (roles && !hasRole(roles)) {
    return (
      <div className="card mx-auto mt-10 max-w-md text-center">
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="mt-2 text-sm text-slate-500">Your role does not have access to this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
