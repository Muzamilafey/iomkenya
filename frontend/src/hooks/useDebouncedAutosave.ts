import { useCallback, useEffect, useRef } from 'react';

/**
 * Calls `save(value)` `delay` ms after `value` last changed. The first render
 * is skipped (nothing has changed yet). `flush()` saves immediately if there
 * are unsaved changes and resolves when the save completes; pending changes
 * are also flushed on unmount.
 */
export function useDebouncedAutosave<T>(value: T, save: (value: T) => Promise<unknown>, delay = 1000) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  const dirty = useRef(false);
  const first = useRef(true);
  const saveRef = useRef(save);
  saveRef.current = save;

  const run = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return;
    dirty.current = false;
    try {
      await saveRef.current(latest.current);
    } catch {
      dirty.current = true; // retry on next change or flush
      throw new Error('Autosave failed');
    }
  }, []);

  useEffect(() => {
    latest.current = value;
    if (first.current) {
      first.current = false;
      return;
    }
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      run().catch(() => {});
    }, delay);
  }, [value, delay, run]);

  useEffect(
    () => () => {
      if (dirty.current) run().catch(() => {});
    },
    [run]
  );

  return { flush: run };
}
