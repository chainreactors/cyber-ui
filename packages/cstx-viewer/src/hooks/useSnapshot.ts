import { useState, useCallback, useMemo } from 'react';
import { unwrapSnapshot } from '@cyber/cstx';
import type { CstxGraphPayload } from '@cyber/cstx';
import { computeStats, type GraphStats } from '../lib/stats';

export interface SnapshotState {
  payload: CstxGraphPayload | null;
  stats: GraphStats | null;
  filename: string | null;
  error: string | null;
  loading: boolean;
}

export interface UseSnapshotReturn extends SnapshotState {
  loadFromFile: (file: File) => Promise<void>;
  loadFromJson: (json: unknown, name?: string) => void;
  loadFromUrl: (url: string) => Promise<void>;
  clear: () => void;
}

function parseAndLoad(raw: unknown, name: string): Omit<SnapshotState, 'loading'> {
  try {
    const payload = unwrapSnapshot(raw);
    if (!payload.nodes.length && !payload.edges.length) {
      return { payload: null, stats: null, filename: name, error: 'Snapshot is empty (no nodes or edges)' };
    }
    const stats = computeStats(payload.nodes, payload.edges);
    return { payload, stats, filename: name, error: null };
  } catch (e) {
    return { payload: null, stats: null, filename: name, error: String(e) };
  }
}

export function useSnapshot(): UseSnapshotReturn {
  const [state, setState] = useState<SnapshotState>({
    payload: null,
    stats: null,
    filename: null,
    error: null,
    loading: false,
  });

  const loadFromFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = parseAndLoad(json, file.name);
      setState({ ...result, loading: false });
    } catch (e) {
      setState({ payload: null, stats: null, filename: file.name, error: `Failed to parse: ${e}`, loading: false });
    }
  }, []);

  const loadFromJson = useCallback((json: unknown, name = 'embedded') => {
    const result = parseAndLoad(json, name);
    setState({ ...result, loading: false });
  }, []);

  const loadFromUrl = useCallback(async (url: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const name = url.split('/').pop() ?? url;
      const result = parseAndLoad(json, name);
      setState({ ...result, loading: false });
    } catch (e) {
      setState({ payload: null, stats: null, filename: url, error: `Failed to load: ${e}`, loading: false });
    }
  }, []);

  const clear = useCallback(() => {
    setState({ payload: null, stats: null, filename: null, error: null, loading: false });
  }, []);

  return useMemo(() => ({
    ...state,
    loadFromFile,
    loadFromJson,
    loadFromUrl,
    clear,
  }), [state, loadFromFile, loadFromJson, loadFromUrl, clear]);
}
