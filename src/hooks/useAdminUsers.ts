import {
  keepPreviousData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useSupabaseQuery } from './useSupabaseQuery'
import { qk } from './queryKeys'
import type { AdminUserFilters } from './queryKeys'
import {
  listAdminUsers,
  updateUserRole,
  updateUserStatus,
} from '../services/analytics.service'
import type { Role, UserStatus } from '../types'

export function useAdminUsers(filters: AdminUserFilters = {}) {
  return useSupabaseQuery(
    qk.adminUsers(filters),
    () => listAdminUsers(filters),
    { placeholderData: keepPreviousData },
  )
}

export function useUpdateUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; status: UserStatus }) =>
      updateUserStatus(v.id, v.status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['adminUsers'] })
      void qc.invalidateQueries({ queryKey: qk.analytics() })
    },
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; role: Role }) => updateUserRole(v.id, v.role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['adminUsers'] })
      void qc.invalidateQueries({ queryKey: qk.analytics() })
    },
  })
}
