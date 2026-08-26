import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { qk } from './queryKeys'
import { useAuth } from '../context/authContext'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from '../services/notification.service'

/** Notifications for the signed-in user, kept fresh by a realtime subscription. */
export function useNotifications() {
  const { session } = useAuth()
  const userId = session?.user.id
  const qc = useQueryClient()

  const query = useSupabaseQuery(
    qk.notifications(userId),
    () => listNotifications(userId!),
    { enabled: !!userId },
  )

  useEffect(() => {
    if (!userId) return
    return subscribeNotifications(userId, () => {
      void qc.invalidateQueries({ queryKey: qk.notifications(userId) })
    })
  }, [userId, qc])

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.notifications(userId) }),
  })
  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.notifications(userId) }),
  })

  const items = query.data ?? []
  const unread = items.filter((n) => !n.is_read).length
  return { ...query, items, unread, markRead, markAllRead }
}
