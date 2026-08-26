import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { qk } from './queryKeys'
import {
  endSession,
  getSummary,
  getVideoSession,
  updateResolution,
} from '../services/session.service'
import type { ResolutionStatus } from '../types'

export function useAppointmentSummary(appointmentId?: string) {
  return useSupabaseQuery(
    qk.summary(appointmentId),
    () => getSummary(appointmentId!),
    { enabled: !!appointmentId },
  )
}

export function useVideoSession(appointmentId?: string) {
  return useSupabaseQuery(
    qk.videoSession(appointmentId),
    () => getVideoSession(appointmentId!),
    { enabled: !!appointmentId },
  )
}

/** End & summarize the live session; refreshes summary/session/appointment. */
export function useEndSession(appointmentId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => endSession(appointmentId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.summary(appointmentId) })
      void qc.invalidateQueries({ queryKey: qk.videoSession(appointmentId) })
      void qc.invalidateQueries({ queryKey: qk.appointment(appointmentId) })
      void qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export function useUpdateResolution(appointmentId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: ResolutionStatus) =>
      updateResolution(appointmentId!, status),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: qk.summary(appointmentId) }),
  })
}
