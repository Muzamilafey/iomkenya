import { useSettings } from '../../context/SettingsContext';

export default function Privacy() {
  const { settings } = useSettings();
  const name = settings.agencyName;
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
      <p>This policy explains how {name} collects and uses personal data submitted through this portal.</p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">What we collect</h2>
      <ul className="list-inside list-disc space-y-1">
        <li>Applicant details: name, date of birth and passport photo</li>
        <li>Family member names, relationships and dates of birth</li>
        <li>Refugee ID, settlement details and manifest information</li>
        <li>Sponsor name, relationship, phone number and passport photo</li>
        <li>Payment records from M-Pesa (phone number, amount, receipt number)</li>
      </ul>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">How we use it</h2>
      <p>
        Only to process your application, confirm payment, contact you about your application, and meet legal and
        accounting obligations. We do not sell your data.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">How we protect it</h2>
      <p>
        Uploaded documents are stored privately and are only accessible to authorised staff through an authenticated
        dashboard. Access is restricted by role and every status change is logged.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">Your rights</h2>
      <p>
        In line with the Kenya Data Protection Act, 2019, you may request access to, correction of, or deletion of your
        personal data, subject to legal retention requirements. Contact us to make a request
        {settings.contactEmail ? ` at ${settings.contactEmail}` : ''}.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">Retention</h2>
      <p>We keep application records for as long as needed to provide our service and meet legal obligations.</p>
    </article>
  );
}
