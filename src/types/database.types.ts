// Hand-written row/domain types mirroring supabase/migrations/0001_schema.sql.
// The browser client is untyped; services cast query results to these.

export type Role = 'student' | 'instructor' | 'admin'
export type Department = 'SOB' | 'SOT' | 'SOE'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type StudentStatus = 'active' | 'inactive' | 'graduated'
export type AppointmentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'
export type ResolutionStatus = 'resolved' | 'unresolved' | 'ongoing'
export type NotificationType = 'appointment' | 'reminder' | 'status' | 'system'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  status: UserStatus
  phone: string | null
  profile_picture_url: string | null
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface StudentProfile {
  id: string
  user_id: string
  student_id: string | null
  department: Department | null
  year_level: string | null
  major: string | null
  enrollment_date: string | null
  status: StudentStatus | null
  created_at: string
  updated_at: string
}

export interface InstructorProfile {
  id: string
  user_id: string
  department: Department | null
  category: string | null
  office_location: string | null
  bio: string | null
  specializations: string | null
  years_of_experience: number | null
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  user_id: string
  permissions: Record<string, unknown>
  created_at: string
}

export interface InstructorAvailability {
  id: string
  instructor_id: string
  day_of_week: number // 1 = Monday … 7 = Sunday
  start_time: string // "HH:MM:SS"
  end_time: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  student_id: string
  instructor_id: string
  scheduled_at: string
  reason: string | null
  status: AppointmentStatus
  mode: 'online'
  video_room_id: string | null
  rejection_reason: string | null
  instructor_notes: string | null
  created_at: string
  updated_at: string
}

export interface VideoSession {
  id: string
  appointment_id: string
  room_id: string | null
  start_time: string | null
  end_time: string | null
  duration: number | null
  participant_count: number | null
  created_at: string
}

export interface AppointmentSummary {
  id: string
  appointment_id: string
  transcript: string | null
  summary: string | null
  resolution_status: ResolutionStatus
  generated_at: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  appointment_id: string | null
  type: NotificationType | null
  title: string | null
  content: string | null
  is_read: boolean
  created_at: string
}

export interface AnalyticsMetric {
  id: string
  date: string
  total_appointments: number
  approved_appointments: number
  pending_appointments: number
  rejected_appointments: number
  completed_appointments: number
  student_activity_count: number
  instructor_activity_count: number
  avg_session_duration: number | null
  created_at: string
  updated_at: string
}

// Convenience joins used by the UI ------------------------------------------
export interface InstructorDirectoryEntry extends InstructorProfile {
  user: Pick<User, 'id' | 'name' | 'email' | 'profile_picture_url'>
}

export interface AppointmentWithParties extends Appointment {
  student?: (StudentProfile & { user?: Pick<User, 'name' | 'email'> }) | null
  instructor?: (InstructorProfile & { user?: Pick<User, 'name' | 'email'> }) | null
  summary?: AppointmentSummary | null
}
