import { useSettings } from '../../context/SettingsContext';

export default function Terms() {
  const { settings } = useSettings();
  const name = settings.agencyName;
  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-4 px-4 py-12 text-slate-700">
      <h1 className="text-2xl font-bold text-slate-900">Terms of Service</h1>
      <p>
        These terms govern your use of the {name} client application portal. By submitting an application you agree to
        these terms.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">1. Who we are</h2>
      <p>
        {name} is an independent travel assistance agency. We are <strong>not</strong> affiliated with, endorsed by, or
        acting on behalf of the International Organization for Migration (IOM), UNHCR, any embassy, or any government.
        We cannot guarantee any decision by a third party, including resettlement, visa or travel outcomes.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">2. Your application</h2>
      <p>
        You confirm that the information and documents you provide are true, accurate and your own (or provided with
        the consent of the people concerned). Providing false information may result in your application being
        declined without refund.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">3. Fees</h2>
      <p>
        The application fee shown before payment is a service fee for processing your application with our agency. It
        is charged via M-Pesa and your application is only submitted once payment is confirmed. Fees are
        non-refundable once processing has started, except where required by law.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">4. Communication</h2>
      <p>
        We may contact you or your sponsor using the phone number provided about the status of your application. We
        will never ask for your M-Pesa PIN.
      </p>
      <h2 className="pt-2 text-lg font-semibold text-slate-900">5. Changes</h2>
      <p>We may update these terms from time to time. The version shown here applies to new applications.</p>
      {(settings.contactEmail || settings.contactPhone) && (
        <p>
          Questions? Contact us at {settings.contactEmail}
          {settings.contactEmail && settings.contactPhone ? ' or ' : ''}
          {settings.contactPhone}.
        </p>
      )}
    </article>
  );
}
