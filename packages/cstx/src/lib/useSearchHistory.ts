import { useState, useEffect, useCallback } from 'react';

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

const MAX_ITEMS = 20;

function loadEntries(key: string): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: unknown): item is SearchHistoryEntry =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as SearchHistoryEntry).query === 'string' &&
          (item as SearchHistoryEntry).query.trim().length > 0,
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function persist(key: string, entries: SearchHistoryEntry[]) {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // quota exceeded or unavailable
  }
}

export function useSearchHistory(
  storageKey: string,
  maxItems = MAX_ITEMS,
) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() =>
    loadEntries(storageKey),
  );
  const savedKey = `${storageKey}:saved`;
  const [saved, setSaved] = useState<SearchHistoryEntry[]>(() =>
    loadEntries(savedKey),
  );

  useEffect(() => {
    setHistory(loadEntries(storageKey));
    setSaved(loadEntries(savedKey));
  }, [storageKey, savedKey]);

  const add = useCallback(
    (query: string, meta?: Record<string, unknown>) => {
      const q = query.trim();
      if (!q) return;
      setHistory((prev) => {
        const existing = prev.find((e) => e.query === q);
        const filtered = prev.filter((e) => e.query !== q);
        const entry: SearchHistoryEntry = {
          query: q,
          timestamp: Date.now(),
          meta: meta ?? existing?.meta,
        };
        const next = [entry, ...filtered].slice(0, maxItems);
        persist(storageKey, next);
        return next;
      });
    },
    [storageKey, maxItems],
  );

  const remove = useCallback(
    (query: string) => {
      setHistory((prev) => {
        const next = prev.filter((e) => e.query !== query);
        persist(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const save = useCallback(
    (query: string, meta?: Record<string, unknown>) => {
      const q = query.trim();
      if (!q) return;
      setSaved((prev) => {
        if (prev.some((e) => e.query === q)) return prev;
        const next = [{ query: q, timestamp: Date.now(), meta }, ...prev];
        persist(savedKey, next);
        return next;
      });
    },
    [savedKey],
  );

  const unsave = useCallback(
    (query: string) => {
      setSaved((prev) => {
        const next = prev.filter((e) => e.query !== query);
        persist(savedKey, next);
        return next;
      });
    },
    [savedKey],
  );

  const isSaved = useCallback(
    (query: string) => saved.some((e) => e.query === query),
    [saved],
  );

  return { history, add, remove, clear, saved, save, unsave, isSaved } as const;
}
