import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import PublicLayout from './components/layout/PublicLayout';
import ProtectedRoute from './components/admin/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ApplicationDraftProvider } from './context/ApplicationDraftContext';
import ApplicationDetail from './pages/admin/ApplicationDetail';
import ApplicationsList from './pages/admin/ApplicationsList';
import AdminUsers from './pages/admin/AdminUsers';
import Dashboard from './pages/admin/Dashboard';
import Login from './pages/admin/Login';
import Payments from './pages/admin/Payments';
import Reports from './pages/admin/Reports';
import SettingsPage from './pages/admin/Settings';
import ApplyWizard from './pages/apply/ApplyWizard';
import Landing from './pages/public/Landing';
import Privacy from './pages/public/Privacy';
import StatusChecker from './pages/public/StatusChecker';
import Terms from './pages/public/Terms';
import { CAN_VIEW_APPLICATIONS, CAN_VIEW_PAYMENTS, SUPER_ONLY } from './utils/constants';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route
          path="apply"
          element={
            <ApplicationDraftProvider>
              <ApplyWizard />
            </ApplicationDraftProvider>
          }
        />
        <Route path="status" element={<StatusChecker />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
      </Route>

      <Route
        element={
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        }
      >
        <Route path="admin/login" element={<Login />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="applications" element={<ProtectedRoute roles={CAN_VIEW_APPLICATIONS}><ApplicationsList /></ProtectedRoute>} />
          <Route path="applications/:id" element={<ProtectedRoute roles={CAN_VIEW_APPLICATIONS}><ApplicationDetail /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute roles={CAN_VIEW_PAYMENTS}><Payments /></ProtectedRoute>} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<ProtectedRoute roles={SUPER_ONLY}><SettingsPage /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute roles={SUPER_ONLY}><AdminUsers /></ProtectedRoute>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
