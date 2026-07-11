import { useState, useCallback, useEffect, useRef } from 'react';

type SlotValue = string | number | string[];

function serializeSlot(value: SlotValue, defaultValue?: SlotValue): string | null {
  if (defaultValue !== undefined && JSON.stringify(value) === JSON.stringify(defaultValue)) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(',') : null;
  }
  if (typeof value === 'number') return String(value);
  return value || null;
}

function deserializeSlot<T extends SlotValue>(raw: string | null, fallback: T): T {
  if (raw == null) return fallback;
  if (Array.isArray(fallback)) {
    return (raw ? raw.split(',').filter(Boolean) : []) as T;
  }
  if (typeof fallback === 'number') {
    const n = Number(raw);
    return (Number.isFinite(n) ? n : fallback) as T;
  }
  return raw as T;
}

function readUrlParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URL(window.location.href).searchParams.get(key);
}

function writeUrlParam(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value == null) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }
  window.history.replaceState(null, '', url.toString());
}

export function useUrlSlot<T extends SlotValue>(
  urlKey: string | null,
  fallback: T,
  defaultValue?: T,
  debounceMs?: number,
): [T, (value: T) => void] {
  const [state, setStateRaw] = useState<T>(() => {
    if (!urlKey) return fallback;
    return deserializeSlot(readUrlParam(urlKey), fallback);
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setState = useCallback(
    (value: T) => {
      setStateRaw(value);
      if (!urlKey) return;
      const write = () => writeUrlParam(urlKey, serializeSlot(value, defaultValue));
      if (debounceMs) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(write, debounceMs);
      } else {
        write();
      }
    },
    [urlKey, defaultValue, debounceMs],
  );

  useEffect(() => {
    if (!urlKey) return;
    const handler = () => {
      setStateRaw(deserializeSlot(readUrlParam(urlKey), fallback));
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [urlKey, fallback]);

  return [state, setState];
}
