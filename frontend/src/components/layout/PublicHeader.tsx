import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { assetUrl } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';

const links = [
  { to: '/', label: 'Home' },
  { to: '/apply', label: 'Apply' },
  { to: '/status', label: 'Check status' },
];

export default function PublicHeader() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          {settings.logoUrl ? (
            <img src={assetUrl(settings.logoUrl)} alt="" className="h-10 w-10 rounded-md object-contain" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-700 text-lg font-bold text-white">
              {settings.agencyName.charAt(0)}
            </span>
          )}
          <span className="text-base font-bold text-slate-900 sm:text-lg">{settings.agencyName}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'text-brand-700' : 'text-slate-600 hover:text-slate-900'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link to="/apply" className="btn-primary ml-2">
            Start application
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-slate-600 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-slate-100 px-4 pb-4 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
