import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { errorText, statusOf } from './http';

export interface Loaded<T> {
  data: T | undefined;
  error: string | null;
  status: number | undefined; // HTTP status of the last failure
  loading: boolean;
  reload: () => void;
  setData: (fn: (prev: T | undefined) => T | undefined) => void;
}

interface Result<T> { depsKey: string; key: string; data?: T; error?: string; status?: number }

// Loads data when `deps` change (deps must be primitives). Changing deps hides
// the old data; reload() keeps it on screen while the new request runs.
// Responses from superseded requests are ignored.
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): Loaded<T> {
  const fnRef = useRef(fn);
  useLayoutEffect(() => { fnRef.current = fn; });

  const [tick, setTick] = useState(0);
  const depsKey = JSON.stringify(deps);
  const key = `${depsKey}#${tick}`;
  const [res, setRes] = useState<Result<T>>({ depsKey: '', key: '' });

  useEffect(() => {
    let live = true;
    fnRef.current()
      .then((data) => { if (live) setRes({ depsKey, key, data }); })
      .catch((e) => { if (live) setRes((r) => ({ depsKey, key, data: r.depsKey === depsKey ? r.data : undefined, error: errorText(e), status: statusOf(e) })); });
    return () => { live = false; };
  }, [depsKey, key]);

  const loading = res.key !== key;
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((f: (prev: T | undefined) => T | undefined) => setRes((r) => ({ ...r, data: f(r.data) })), []);

  return {
    data: res.depsKey === depsKey ? res.data : undefined,
    error: loading ? null : res.error ?? null,
    status: loading ? undefined : res.status,
    loading,
    reload,
    setData,
  };
}

// Wraps a user action: blocks double submits and captures the error message.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);

  const run = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    if (running.current) return undefined;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(errorText(e));
      return undefined;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  return { busy, error, setError, run };
}
