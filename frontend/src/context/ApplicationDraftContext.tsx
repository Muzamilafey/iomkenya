import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as appApi from '../api/applications';
import type { ApplicationPatch } from '../api/applications';
import { getErrorMessage } from '../api/client';
import type { Application, DocumentType } from '../api/types';

const STORAGE_KEY = 'hta_application_draft';

interface StoredDraft {
  id: string;
  token: string;
}

function readStored(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    return parsed?.id && parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(value: StoredDraft | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — draft lives for this page only */
  }
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface DraftContextValue {
  application: Application | null;
  loading: boolean;
  error: string | null;
  saveState: SaveState;
  hasStoredDraft: boolean;
  start: () => Promise<Application>;
  save: (patch: ApplicationPatch) => Promise<Application>;
  upload: (type: DocumentType, file: File, onProgress?: (pct: number) => void) => Promise<Application>;
  review: () => Promise<Application>;
  reload: () => Promise<Application | null>;
  setApplication: (app: Application) => void;
  clear: () => void;
  token: string | null;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function ApplicationDraftProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredDraft | null>(() => readStored());
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(Boolean(stored));
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Saves are chained so responses can't arrive out of order.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const reload = useCallback(async () => {
    const s = readStored();
    if (!s) {
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const app = await appApi.fetchApplication(s.id, s.token);
      setApplication(app);
      setError(null);
      return app;
    } catch (err) {
      // Draft no longer accessible — forget it so the client can start over.
      writeStored(null);
      setStored(null);
      setApplication(null);
      setError(getErrorMessage(err, 'Could not load your saved application.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (stored) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    const { application: app, draftToken } = await appApi.createApplication();
    const s = { id: app.id, token: draftToken };
    writeStored(s);
    setStored(s);
    setApplication(app);
    setError(null);
    return app;
  }, []);

  const requireStored = useCallback(() => {
    const s = stored ?? readStored();
    if (!s) throw new Error('No application in progress');
    return s;
  }, [stored]);

  const enqueue = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(fn, fn);
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  const save = useCallback(
    (patch: ApplicationPatch) =>
      enqueue(async () => {
        const s = requireStored();
        setSaveState('saving');
        try {
          const app = await appApi.patchApplication(s.id, s.token, patch);
          setApplication(app);
          setSaveState('saved');
          return app;
        } catch (err) {
          setSaveState('error');
          throw err;
        }
      }),
    [enqueue, requireStored]
  );

  const upload = useCallback(
    (type: DocumentType, file: File, onProgress?: (pct: number) => void) =>
      enqueue(async () => {
        const s = requireStored();
        const app = await appApi.uploadDocument(s.id, s.token, type, file, onProgress);
        setApplication(app);
        return app;
      }),
    [enqueue, requireStored]
  );

  const review = useCallback(
    () =>
      enqueue(async () => {
        const s = requireStored();
        const app = await appApi.reviewApplication(s.id, s.token);
        setApplication(app);
        return app;
      }),
    [enqueue, requireStored]
  );

  const clear = useCallback(() => {
    writeStored(null);
    setStored(null);
    setApplication(null);
    setSaveState('idle');
    setError(null);
  }, []);

  return (
    <DraftContext.Provider
      value={{
        application,
        loading,
        error,
        saveState,
        hasStoredDraft: Boolean(stored),
        start,
        save,
        upload,
        review,
        reload,
        setApplication,
        clear,
        token: stored?.token ?? null,
      }}
    >
      {children}
    </DraftContext.Provider>
  );
}

export function useApplicationDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useApplicationDraft must be used inside ApplicationDraftProvider');
  return ctx;
}
