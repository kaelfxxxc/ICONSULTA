import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { Loader } from '../common'
import { ROLE_HOME } from '../../utils/constants'
import type { Role } from '../../types'

export function ProtectedRoute({
  role,
  children,
}: {
  role?: Role | Role[]
  children: ReactNode
}) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loader label="Checking your session…" />
  if (!session)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // profile can be briefly null right after signup while the DB trigger runs.
  if (role && profile) {
    const allowed = Array.isArray(role) ? role : [role]
    if (!allowed.includes(profile.role)) {
      return <Navigate to={ROLE_HOME[profile.role]} replace />
    }
  }

  return <>{children}</>
}
