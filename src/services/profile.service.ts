import { supabase } from '../lib/supabase'
import type {
  Department,
  InstructorProfile,
  Role,
  StudentProfile,
  User,
} from '../types'

export interface FullProfile {
  user: User
  student: StudentProfile | null
  instructor: InstructorProfile | null
}

/** The users row plus the role-specific profile row for a settings screen. */
export async function getFullProfile(
  userId: string,
  role: Role,
): Promise<FullProfile> {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error

  let student: StudentProfile | null = null
  let instructor: InstructorProfile | null = null

  if (role === 'student') {
    const { data } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    student = (data as StudentProfile | null) ?? null
  } else if (role === 'instructor') {
    const { data } = await supabase
      .from('instructor_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    instructor = (data as InstructorProfile | null) ?? null
  }

  return { user: user as User, student, instructor }
}

export async function updateUserProfile(
  userId: string,
  patch: Partial<Pick<User, 'name' | 'phone' | 'profile_picture_url'>>,
) {
  const { error } = await supabase.from('users').update(patch).eq('id', userId)
  if (error) throw error
}

export async function updateStudentProfile(
  userId: string,
  patch: Partial<
    Pick<StudentProfile, 'student_id' | 'department' | 'year_level' | 'major'>
  >,
) {
  const { error } = await supabase
    .from('student_profiles')
    .update(patch)
    .eq('user_id', userId)
  if (error) throw error
}

export async function updateInstructorProfile(
  userId: string,
  patch: Partial<
    Pick<
      InstructorProfile,
      | 'department'
      | 'category'
      | 'office_location'
      | 'bio'
      | 'specializations'
      | 'years_of_experience'
    >
  > & { department?: Department | null },
) {
  const { error } = await supabase
    .from('instructor_profiles')
    .update(patch)
    .eq('user_id', userId)
  if (error) throw error
}
