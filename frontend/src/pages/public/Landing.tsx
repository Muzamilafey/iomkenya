import { Link } from 'react-router-dom';
import HeroSlideshow from '../../components/public/HeroSlideshow';
import { useSettings } from '../../context/SettingsContext';
import { formatKES } from '../../utils/format';

const STEPS = [
  { title: 'Fill in your details', text: 'Applicant, family, refugee stay and sponsor information. Your progress saves automatically.' },
  { title: 'Upload documents', text: 'Passport photos for the applicant and sponsor, plus your manifest card if you have one.' },
  { title: 'Pay with M-Pesa', text: 'Approve the payment prompt on your phone. Your application is submitted once payment is confirmed.' },
  { title: 'Track your progress', text: 'Use your application number and sponsor phone number to check your status any time.' },
];

export default function Landing() {
  const { settings } = useSettings();
  const hasImages = settings.heroImages.length > 0;

  return (
    <>
      <section className={`relative overflow-hidden ${hasImages ? 'text-white' : 'bg-gradient-to-br from-brand-800 to-brand-900 text-white'}`}>
        <HeroSlideshow images={settings.heroImages} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{settings.heroHeadline}</h1>
            <p className="mt-4 text-base text-blue-100 sm:text-lg">{settings.heroSubheadline}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/apply" className="btn bg-white px-6 py-3 text-base text-brand-800 hover:bg-blue-50">
                Start application
              </Link>
              <Link to="/status" className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10">
                Check application status
              </Link>
            </div>
            {settings.applicationFee > 0 && (
              <p className="mt-6 text-sm text-blue-100">Application fee: {formatKES(settings.applicationFee)}, paid via M-Pesa.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">How it works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="card flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">What you'll need</h2>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
              <li>Applicant and sponsor passport-style photos (JPG or PNG)</li>
              <li>Refugee ID and camp / settlement details</li>
              <li>{settings.manifestRequired ? 'Manifest number and manifest card photo' : 'Manifest card (if you have one)'}</li>
              <li>An M-Pesa registered Safaricom line for payment</li>
            </ul>
          </div>
          <Link to="/apply" className="btn-primary">
            Begin now
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">
          {settings.agencyName} is an independent agency and is not affiliated with IOM, UNHCR, any embassy or any government.
        </p>
      </section>
    </>
  );
}
