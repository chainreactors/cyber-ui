import type { JsonObject } from './common';

export interface DataResult<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch?: () => void;
}

export type UseDataQuery = <T = unknown>(
  queryKey: string,
  params?: JsonObject,
) => DataResult<T>;
