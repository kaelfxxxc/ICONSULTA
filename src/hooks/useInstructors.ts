import { useSupabaseQuery } from './useSupabaseQuery'
import { qk } from './queryKeys'
import type { InstructorFilters } from './queryKeys'
import { getInstructor, listInstructors } from '../services/instructor.service'
import { listAvailability } from '../services/availability.service'

export function useInstructors(filters: InstructorFilters = {}) {
  return useSupabaseQuery(qk.instructors(filters), () => listInstructors(filters))
}

export function useInstructor(id?: string) {
  return useSupabaseQuery(qk.instructor(id), () => getInstructor(id!), {
    enabled: !!id,
  })
}

/** Weekly availability for any instructor (used by the booking flow + editor). */
export function useAvailability(instructorProfileId?: string) {
  return useSupabaseQuery(
    qk.availability(instructorProfileId),
    () => listAvailability(instructorProfileId!),
    { enabled: !!instructorProfileId },
  )
}
