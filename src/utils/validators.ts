// Small, dependency-free form validators. The school-email rule is a *hint*
// (the backend does not enforce the domain), so signup/login stay usable with
// any address while nudging toward idnumber@mcce.edu.ph.

export const SCHOOL_DOMAIN = 'mcce.edu.ph'

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function isSchoolEmail(value: string): boolean {
  return new RegExp(`@${SCHOOL_DOMAIN.replace('.', '\\.')}$`, 'i').test(value.trim())
}

export function required(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0
}

/** Returns an error message, or null when valid. */
export function validateEmail(value: string): string | null {
  if (!required(value)) return 'Email is required.'
  if (!isEmail(value)) return 'Enter a valid email address.'
  return null
}

export function validatePassword(value: string, min = 6): string | null {
  if (!required(value)) return 'Password is required.'
  if (value.length < min) return `Password must be at least ${min} characters.`
  return null
}

export function validateName(value: string): string | null {
  if (!required(value)) return 'Full name is required.'
  if (value.trim().length < 2) return 'Enter your full name.'
  return null
}
