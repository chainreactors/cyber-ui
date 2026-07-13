import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
}

export interface UsePollingReturn<T> {
  data: T;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  defaultValue: T,
  options: UsePollingOptions = {},
): UsePollingReturn<T> {
  const { interval = 30000, enabled = true } = options;
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const refetch = useCallback(async () => {
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (e) {
      console.error('Polling fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refetch();
    const timer = setInterval(refetch, interval);
    return () => clearInterval(timer);
  }, [refetch, interval, enabled]);

  return { data, loading, refetch };
}
