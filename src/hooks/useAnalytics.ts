import { useSupabaseQuery } from './useSupabaseQuery'
import { qk } from './queryKeys'
import { getAdminOverview } from '../services/analytics.service'

/** Admin dashboard KPIs + volume-by-department + month-to-date metrics. */
export function useAnalytics() {
  return useSupabaseQuery(qk.analytics(), getAdminOverview)
}
