import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAnalytics } from './useAnalytics'
import { qk } from './queryKeys'
import { subscribeAdminAnalytics } from '../services/analytics.service'

/** Channel connection states surfaced by the realtime subscribe callback. */
export type LiveStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

/** A new appointment request arriving over realtime. */
export interface LiveEvent {
  id: string
  reason: string | null
  scheduledAt: string
  createdAt: string
}

const MAX_LIVE_EVENTS = 8

/**
 * Admin dashboard data kept fresh by realtime: the base analytics query
 * (analytics_metrics + users + appointments) plus a bounded feed of new
 * appointment requests and the channel connection state.
 */
export function useRealtimeAnalytics() {
  const query = useAnalytics()
  const qc = useQueryClient()
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('CLOSED')

  useEffect(() => {
    return subscribeAdminAnalytics(
      // Any analytics_metrics change → refetch the dashboard numbers.
      () => void qc.invalidateQueries({ queryKey: qk.analytics() }),
      // A new appointment request lands in the live feed + bumps the totals.
      (appointment) => {
        setLiveEvents((prev) =>
          [
            {
              id: appointment.id,
              reason: appointment.reason,
              scheduledAt: appointment.scheduled_at,
              createdAt: appointment.created_at,
            },
            ...prev,
          ].slice(0, MAX_LIVE_EVENTS),
        )
        void qc.invalidateQueries({ queryKey: qk.analytics() })
      },
      (status) => setLiveStatus(status),
    )
  }, [qc])

  return { ...query, liveEvents, liveStatus }
}
