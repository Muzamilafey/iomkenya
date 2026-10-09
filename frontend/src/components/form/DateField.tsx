interface Props {
  label: string;
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  id?: string;
}

export default function DateField({ label, value, onChange, error, required, id }: Props) {
  const inputId = id || `d-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={inputId}
        type="date"
        className={`input ${error ? 'border-red-400' : ''}`}
        value={value}
        min="1900-01-01"
        max={today}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
