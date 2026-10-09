import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminApi } from '../../api/admin';
import { assetUrl, getErrorMessage } from '../../api/client';
import type { AdminSettings } from '../../api/types';
import TextField from '../../components/form/TextField';
import { useSettings } from '../../context/SettingsContext';

type Form = Pick<
  AdminSettings,
  | 'agencyName'
  | 'heroHeadline'
  | 'heroSubheadline'
  | 'contactEmail'
  | 'contactPhone'
  | 'address'
  | 'whatsappNumber'
  | 'applicationNumberPrefix'
  | 'manifestRequired'
  | 'notifyOnSubmission'
  | 'notifyOnPaymentFailure'
> & { applicationFee: string; notificationEmails: string };

const toForm = (s: AdminSettings): Form => ({
  agencyName: s.agencyName,
  heroHeadline: s.heroHeadline,
  heroSubheadline: s.heroSubheadline,
  contactEmail: s.contactEmail,
  contactPhone: s.contactPhone,
  address: s.address,
  whatsappNumber: s.whatsappNumber,
  applicationNumberPrefix: s.applicationNumberPrefix,
  manifestRequired: s.manifestRequired,
  applicationFee: String(s.applicationFee),
  notificationEmails: s.notificationEmails.join(', '),
  notifyOnSubmission: s.notifyOnSubmission,
  notifyOnPaymentFailure: s.notifyOnPaymentFailure,
});

export default function SettingsPage() {
  const { refresh } = useSettings();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const heroInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((s) => {
        setSettings(s);
        setForm(toForm(s));
      })
      .catch((e) => setMessage({ ok: false, text: getErrorMessage(e) }));
  }, []);

  function applied(s: AdminSettings, text: string) {
    setSettings(s);
    setForm(toForm(s));
    setMessage({ ok: true, text });
    refresh();
  }

  async function run(fn: () => Promise<AdminSettings>, text: string) {
    setBusy(true);
    setMessage(null);
    try {
      applied(await fn(), text);
    } catch (e) {
      setMessage({ ok: false, text: getErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setMessage(null);
    try {
      setMessage({ ok: true, text: await adminApi.sendTestEmail() });
    } catch (e) {
      setMessage({ ok: false, text: getErrorMessage(e) });
    } finally {
      setTesting(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    run(() => adminApi.updateSettings({ ...form, applicationFee: Number(form.applicationFee) }), 'Settings saved');
  }

  if (!form || !settings) {
    return message ? <p className="text-sm text-red-600">{message.text}</p> : <p className="text-sm text-slate-500">Loading…</p>;
  }

  const set = (k: keyof Form) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const toggle = (k: 'notifyOnSubmission' | 'notifyOnPaymentFailure' | 'manifestRequired') => (checked: boolean) =>
    setForm((f) => (f ? { ...f, [k]: checked } : f));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {message && (
        <p className={`rounded-md p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>{message.text}</p>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="card space-y-4">
          <h2 className="font-semibold text-slate-900">Branding</h2>
          <TextField label="Agency name" value={form.agencyName} onChange={set('agencyName')} required maxLength={120} />
          <TextField label="Hero headline" value={form.heroHeadline} onChange={set('heroHeadline')} maxLength={200} />
          <div>
            <label className="label" htmlFor="hero-sub">Hero sub-headline</label>
            <textarea id="hero-sub" className="input" rows={3} maxLength={500} value={form.heroSubheadline} onChange={(e) => set('heroSubheadline')(e.target.value)} />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold text-slate-900">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Contact email" type="email" value={form.contactEmail} onChange={set('contactEmail')} />
            <TextField label="Contact phone" value={form.contactPhone} onChange={set('contactPhone')} maxLength={30} />
          </div>
          <TextField label="Address" value={form.address} onChange={set('address')} maxLength={300} />
          <TextField label="WhatsApp number" value={form.whatsappNumber} onChange={set('whatsappNumber')} hint="Shown as a floating chat button. Leave blank to hide it." />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold text-slate-900">Applications</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Application fee (KES)" type="number" min={1} max={150000} value={form.applicationFee} onChange={set('applicationFee')} required hint="Applies to applications reviewed after saving." />
            <TextField label="Application number prefix" value={form.applicationNumberPrefix} onChange={(v) => set('applicationNumberPrefix')(v.toUpperCase())} hint={`Example: ${form.applicationNumberPrefix || 'APP'}-${new Date().getFullYear()}-000001`} maxLength={10} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.manifestRequired} onChange={(e) => toggle('manifestRequired')(e.target.checked)} />
            Manifest number and manifest card are mandatory
          </label>
        </section>

        <section className="card space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900">Email notifications</h2>
              <p className="mt-1 text-xs text-slate-500">
                SMTP is set in server environment variables.{' '}
                {settings.email.configured ? (
                  <span className="font-semibold text-emerald-700">Configured{settings.email.host ? ` (${settings.email.host})` : ''}</span>
                ) : (
                  <span className="font-semibold text-red-700">Not configured — emails will not be sent</span>
                )}
              </p>
            </div>
            <button type="button" className="btn-secondary btn-sm shrink-0" onClick={sendTest} disabled={testing || !settings.email.configured}>
              {testing ? 'Sending…' : 'Send test email'}
            </button>
          </div>
          <div>
            <label className="label" htmlFor="notify-emails">Notification recipients</label>
            <textarea
              id="notify-emails"
              className="input"
              rows={2}
              placeholder="ops@your-domain.example, manager@your-domain.example"
              value={form.notificationEmails}
              onChange={(e) => set('notificationEmails')(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Comma-separated. Leave blank to email all active Super Admins and Application Officers. Save before sending a test.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.notifyOnSubmission} onChange={(e) => toggle('notifyOnSubmission')(e.target.checked)} />
            Email when a new application is submitted (payment confirmed)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.notifyOnPaymentFailure} onChange={(e) => toggle('notifyOnPaymentFailure')(e.target.checked)} />
            Email when a payment fails, is cancelled or expires
          </label>
        </section>

        <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>

      <section className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Logo</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            {settings.logoUrl ? <img src={assetUrl(settings.logoUrl)} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-xs text-slate-400">None</span>}
          </div>
          <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) run(() => adminApi.uploadLogo(f), 'Logo updated');
            e.target.value = '';
          }} />
          <button className="btn-secondary" disabled={busy} onClick={() => logoInput.current?.click()}>Upload logo</button>
          {settings.logoUrl && <button className="btn-secondary" disabled={busy} onClick={() => run(() => adminApi.removeLogo(), 'Logo removed')}>Remove</button>}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Hero slideshow images ({settings.heroImages.length}/6)</h2>
          <input ref={heroInput} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) run(() => adminApi.uploadHeroImages(files), 'Images added');
            e.target.value = '';
          }} />
          <button className="btn-secondary" disabled={busy || settings.heroImages.length >= 6} onClick={() => heroInput.current?.click()}>Add images</button>
        </div>
        {settings.heroImages.length === 0 && <p className="text-sm text-slate-500">No images — the landing page uses a solid colour background.</p>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {settings.heroImages.map((url) => (
            <div key={url} className="group relative overflow-hidden rounded-md border border-slate-200">
              <img src={assetUrl(url)} alt="" className="h-32 w-full object-cover" />
              <button className="btn-danger btn-sm absolute right-2 top-2" disabled={busy} onClick={() => run(() => adminApi.deleteHeroImage(url), 'Image removed')}>Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold text-slate-900">M-Pesa configuration</h2>
        <p className="mt-1 text-xs text-slate-500">Credentials are set in server environment variables and are never shown here.</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Status</dt><dd className={settings.mpesa.configured ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>{settings.mpesa.configured ? 'Configured' : 'Not configured'}</dd></div>
          <div><dt className="text-xs text-slate-500">Environment</dt><dd>{settings.mpesa.environment}</dd></div>
          <div><dt className="text-xs text-slate-500">Transaction type</dt><dd>{settings.mpesa.transactionType}</dd></div>
          <div><dt className="text-xs text-slate-500">Shortcode set</dt><dd>{settings.mpesa.shortcodeSet ? 'Yes' : 'No'}</dd></div>
          <div><dt className="text-xs text-slate-500">Callback URL</dt><dd>{settings.mpesa.callbackUrlSet ? (settings.mpesa.callbackUrlIsHttps ? 'Set (HTTPS)' : 'Set — must be HTTPS') : 'Not set'}</dd></div>
        </dl>
      </section>
    </div>
  );
}
