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
  listInstructorBusySlots,
  findAppointmentByCallCode,
  listStudentAppointments,
  rejectAppointment,
} from '../services/appointment.service'

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

export function useInstructorBusySlots(instructorProfileId?: string, date?: string) {
  return useSupabaseQuery(
    ['instructor-busy-slots', instructorProfileId, date],
    () => listInstructorBusySlots(instructorProfileId!, date!),
    { enabled: !!instructorProfileId && !!date },
  )
}

export function useFindAppointmentByCallCode() {
  return useMutation({ mutationFn: findAppointmentByCallCode })
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
      void qc.invalidateQueries({ queryKey: ['instructor-busy-slots', vars.instructor_id] })
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
