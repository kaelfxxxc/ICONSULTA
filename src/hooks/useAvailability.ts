import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addAvailability, removeAvailability } from '../services/availability.service'
import { qk } from './queryKeys'

/** Owner-side availability editor mutations (RLS availability_write_owner). */
export function useAvailabilityEditor(instructorProfileId?: string) {
  const qc = useQueryClient()
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: qk.availability(instructorProfileId) })

  const add = useMutation({ mutationFn: addAvailability, onSuccess: invalidate })
  const remove = useMutation({
    mutationFn: removeAvailability,
    onSuccess: invalidate,
  })
  return { add, remove }
}
