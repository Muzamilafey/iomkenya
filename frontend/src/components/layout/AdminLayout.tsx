import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { AdminRole } from '../../api/types';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { CAN_VIEW_APPLICATIONS, CAN_VIEW_PAYMENTS, ROLE_LABELS, SUPER_ONLY } from '../../utils/constants';

const NAV: { to: string; label: string; roles?: AdminRole[] }[] = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/applications', label: 'Applications', roles: CAN_VIEW_APPLICATIONS },
  { to: '/admin/payments', label: 'Payments', roles: CAN_VIEW_PAYMENTS },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/settings', label: 'Settings', roles: SUPER_ONLY },
  { to: '/admin/users', label: 'Admin users', roles: SUPER_ONLY },
];

export default function AdminLayout() {
  const { admin, logout, hasRole } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.roles || hasRole(n.roles));

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  const nav = (
    <nav className="space-y-1">
      {items.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/admin'}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `block rounded-md px-3 py-2 text-sm font-medium ${
              isActive ? 'bg-brand-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          {n.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 p-4 md:flex print:hidden">
        <p className="mb-6 px-3 text-sm font-bold text-white">{settings.agencyName}</p>
        {nav}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 print:hidden">
          <button className="rounded p-1 md:hidden" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="hidden text-sm text-slate-500 md:block">Admin dashboard</span>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{admin?.name}</p>
              <p className="text-xs text-slate-500">{admin && ROLE_LABELS[admin.role]}</p>
            </div>
            <button className="btn-secondary btn-sm" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
        {open && <div className="bg-slate-900 p-3 md:hidden">{nav}</div>}
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
