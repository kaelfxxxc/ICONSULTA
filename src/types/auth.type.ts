import type { Department, Role, User } from './database.types'

/** The public.users row for the signed-in user. */
export type Profile = User

export interface SignInInput {
  email: string
  password: string
}

export interface SignUpInput {
  email: string
  password: string
  name: string
  role: Exclude<Role, 'admin'> // admins are provisioned server-side, never self-signup
  department?: Department
}
