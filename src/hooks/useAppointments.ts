import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { qk } from './queryKeys'
import {
  approveAppointment,
  cancelAppointment,
  completeAppointment,
  createAppointment,
  getAppointment,
  listInstructorAppointments,
  listStudentAppointments,
  rejectAppointment,
} from '../services/appointment.service'
import type { Appointment } from '../types'

/**
 * Local calendar day (`YYYY-MM-DD`) for a timestamptz. `scheduled_at` is a UTC
 * instant, so slicing the raw string files evening bookings under the wrong day
 * for anyone east of UTC — always convert first.
 */
export function localDayKey(iso: string): string {
  const d = new Date(iso)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * A student may book a given instructor only once per day. This returns the
 * booking that already claims that instructor's day, or undefined when the day
 * is free. Cancelled and rejected requests do not count, so they free the day.
 */
export function findInstructorBookingOnDay(
  list: Appointment[] | undefined,
  instructorId: string,
  day: string,
): Appointment | undefined {
  return (list ?? []).find(
    (a) =>
      a.instructor_id === instructorId &&
      (a.status === 'pending' || a.status === 'approved') &&
      localDayKey(a.scheduled_at) === day,
  )
}

export function useStudentAppointments(studentProfileId?: string) {
  return useSupabaseQuery(
    qk.appointmentsStudent(studentProfileId),
    () => listStudentAppointments(studentProfileId!),
    { enabled: !!studentProfileId },
  )
}

export function useInstructorAppointments(instructorProfileId?: string) {
  return useSupabaseQuery(
    qk.appointmentsInstructor(instructorProfileId),
    () => listInstructorAppointments(instructorProfileId!),
    { enabled: !!instructorProfileId },
  )
}

export function useAppointment(id?: string) {
  return useSupabaseQuery(qk.appointment(id), () => getAppointment(id!), {
    enabled: !!id,
  })
}

export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: qk.appointmentsStudent(vars.student_id),
      })
    },
  })
}

/** Instructor decision mutations for a Requests / Appointments screen. */
export function useAppointmentActions(instructorProfileId?: string) {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({
      queryKey: qk.appointmentsInstructor(instructorProfileId),
    })
    void qc.invalidateQueries({ queryKey: ['appointments'] })
  }

  const approve = useMutation({
    mutationFn: approveAppointment,
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: (v: { id: string; reason?: string }) =>
      rejectAppointment(v.id, v.reason),
    onSuccess: invalidate,
  })
  const complete = useMutation({
    mutationFn: completeAppointment,
    onSuccess: invalidate,
  })
  return { approve, reject, complete }
}

export function useCancelAppointment(studentProfileId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: qk.appointmentsStudent(studentProfileId),
      })
      void qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
