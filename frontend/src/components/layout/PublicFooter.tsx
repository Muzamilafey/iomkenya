import { Link } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

export default function PublicFooter() {
  const { settings } = useSettings();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-slate-600 md:grid-cols-3">
        <div>
          <p className="font-semibold text-slate-900">{settings.agencyName}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            An independent travel assistance agency. We are not affiliated with IOM, UNHCR, any embassy or any
            government.
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Contact</p>
          <ul className="mt-2 space-y-1">
            {settings.contactPhone && <li>Phone: {settings.contactPhone}</li>}
            {settings.contactEmail && (
              <li>
                Email:{' '}
                <a className="text-brand-700 hover:underline" href={`mailto:${settings.contactEmail}`}>
                  {settings.contactEmail}
                </a>
              </li>
            )}
            {settings.address && <li>{settings.address}</li>}
            {!settings.contactPhone && !settings.contactEmail && !settings.address && <li>Contact details coming soon.</li>}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Links</p>
          <ul className="mt-2 space-y-1">
            <li><Link className="hover:text-slate-900" to="/apply">Start application</Link></li>
            <li><Link className="hover:text-slate-900" to="/status">Check application status</Link></li>
            <li><Link className="hover:text-slate-900" to="/terms">Terms of Service</Link></li>
            <li><Link className="hover:text-slate-900" to="/privacy">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {settings.agencyName}. All rights reserved.
      </div>
    </footer>
  );
}
