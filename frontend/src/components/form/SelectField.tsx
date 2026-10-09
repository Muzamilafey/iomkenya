interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  id?: string;
}

export default function SelectField({ label, value, onChange, options, placeholder = 'Select…', error, required, id }: Props) {
  const inputId = id || `s-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div>
      <label htmlFor={inputId} className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <select
        id={inputId}
        className={`input ${error ? 'border-red-400' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
      >
        <option value="">{placeholder}</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
