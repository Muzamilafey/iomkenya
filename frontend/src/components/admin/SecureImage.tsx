import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Props {
  src: string; // API path, e.g. /admin/applications/:id/documents/:type
  alt: string;
  className?: string;
}

/** Loads a private document through the authenticated API and shows it as a blob URL. */
export default function SecureImage({ src, alt, className }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setFailed(false);
    setUrl(null);
    api
      .get(src, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed) {
    return <div className={`flex items-center justify-center bg-slate-100 text-xs text-slate-400 ${className}`}>Unavailable</div>;
  }
  if (!url) {
    return <div className={`animate-pulse bg-slate-100 ${className}`} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" title="Open full size">
      <img src={url} alt={alt} className={className} />
    </a>
  );
}
