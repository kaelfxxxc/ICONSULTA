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

  if (profile?.status === 'pending' && profile.role !== 'admin') {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-bold text-slate-900">Registration under review</h1><p className="mt-2 text-sm text-slate-600">An administrator must verify your school credentials before you can book, request, or join a conference.</p></div></div>
  }

  // profile can be briefly null right after signup while the DB trigger runs.
  if (role && profile) {
    const allowed = Array.isArray(role) ? role : [role]
    if (!allowed.includes(profile.role)) {
      return <Navigate to={ROLE_HOME[profile.role]} replace />
    }
  }

  return <>{children}</>
}
