interface Props {
  steps: string[];
  current: number; // 1-based
}

export default function ProgressBar({ steps, current }: Props) {
  const pct = Math.round(((current - 1) / (steps.length - 1)) * 100);
  return (
    <div aria-label={`Step ${current} of ${steps.length}`}>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>
          Step {current} of {steps.length}: <span className="text-slate-800">{steps[current - 1]}</span>
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-3 hidden grid-cols-8 gap-1 text-center text-[11px] md:grid">
        {steps.map((s, i) => (
          <li key={s} className={i + 1 <= current ? 'font-semibold text-brand-700' : 'text-slate-400'}>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
