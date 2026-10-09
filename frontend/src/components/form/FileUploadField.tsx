import { useRef, useState } from 'react';
import { getErrorMessage } from '../../api/client';
import type { ApplicationDocument } from '../../api/types';
import { MAX_UPLOAD_MB } from '../../utils/constants';

interface Props {
  label: string;
  description?: string;
  existing?: ApplicationDocument;
  required?: boolean;
  disabled?: boolean;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<unknown>;
}

const ALLOWED = ['image/jpeg', 'image/png'];

export default function FileUploadField({ label, description, existing, required, disabled, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError('Only JPG and PNG images are allowed.');
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setProgress(0);
    try {
      await onUpload(file, setProgress);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return localUrl;
      });
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setError(getErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const uploading = progress !== null;

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
          {preview ? (
            <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : existing ? (
            <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4a3 3 0 014 0l4 4m-2-2l1-1a3 3 0 014 0l1 1M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">
            {label}
            {required && <span className="text-red-600"> *</span>}
          </p>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          {existing && !uploading && (
            <p className="mt-1 text-xs text-emerald-700">
              Uploaded{existing.originalName ? `: ${existing.originalName}` : ''} ({Math.round(existing.size / 1024)} KB)
            </p>
          )}
          {uploading && (
            <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={disabled || uploading}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? 'Uploading…' : existing ? 'Replace' : 'Choose file'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">JPG or PNG, max {MAX_UPLOAD_MB} MB.</p>
    </div>
  );
}
