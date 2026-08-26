import { useQuery } from '@tanstack/react-query'
import type { QueryKey, UseQueryOptions } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Unwrap a Supabase `{ data, error }` response, throwing on error so React
 * Query surfaces it. Use inside service functions:
 *   return unwrap(await supabase.from('users').select('*'))
 */
export function unwrap<T>({
  data,
  error,
}: {
  data: T | null
  error: PostgrestError | null
}): T {
  if (error) throw error
  return data as T
}

/** Thin, typed passthrough over useQuery for consistency across hooks. */
export function useSupabaseQuery<T>(
  key: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, Error>({ queryKey: key, queryFn, ...options })
}
