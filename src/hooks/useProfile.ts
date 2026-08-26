import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/authContext'
import {
  getFullProfile,
  updateInstructorProfile,
  updateStudentProfile,
  updateUserProfile,
} from '../services/profile.service'
import { useSupabaseQuery } from './useSupabaseQuery'
import { qk } from './queryKeys'
import type { InstructorProfile, StudentProfile, User } from '../types'

/** Full profile (users row + role profile) for the signed-in user. */
export function useProfile() {
  const { session, profile } = useAuth()
  const userId = session?.user.id
  const role = profile?.role
  return useSupabaseQuery(
    qk.profile(userId),
    () => getFullProfile(userId!, role!),
    { enabled: !!userId && !!role },
  )
}

export interface ProfileUpdate {
  user?: Partial<Pick<User, 'name' | 'phone' | 'profile_picture_url'>>
  student?: Partial<
    Pick<StudentProfile, 'student_id' | 'department' | 'year_level' | 'major'>
  >
  instructor?: Partial<
    Pick<
      InstructorProfile,
      | 'department'
      | 'category'
      | 'office_location'
      | 'bio'
      | 'specializations'
      | 'years_of_experience'
    >
  >
}

export function useUpdateProfile() {
  const { session, profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const userId = session?.user.id

  return useMutation({
    mutationFn: async (input: ProfileUpdate) => {
      if (!userId) throw new Error('Not signed in.')
      if (input.user && Object.keys(input.user).length)
        await updateUserProfile(userId, input.user)
      if (input.student && Object.keys(input.student).length)
        await updateStudentProfile(userId, input.student)
      if (input.instructor && Object.keys(input.instructor).length)
        await updateInstructorProfile(userId, input.instructor)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.profile(userId) })
      if (profile) await refreshProfile()
    },
  })
}
