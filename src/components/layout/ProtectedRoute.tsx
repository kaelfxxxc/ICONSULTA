import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
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
  const { session, profile, loading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function goToLogin() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) return <Loader label="Checking your session…" />
  if (!session)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) return <Loader label="Loading your account…" />

  if (profile?.status === 'pending' && profile.role !== 'admin') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f7fb] p-5 sm:p-8">
        <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,31,58,0.10)] sm:p-10">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Application status</p>
              <h1 className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">Registration under review</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Your school credentials are being checked by an administrator.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">In review</span>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 sm:p-6">
            <div className="space-y-0">
              {[
                { label: 'Application submitted', note: 'We received your registration.', done: true },
                { label: 'Credentials under review', note: 'An administrator is verifying your details.', current: true },
                { label: 'Account approved', note: 'You will be able to access all features.', future: true },
                { label: 'Ready to use ICONSULTA', note: 'Book, request, and join consultations.', future: true },
              ].map((step, index, steps) => (
                <div key={step.label} className="flex gap-4">
                  <div className="flex w-6 shrink-0 flex-col items-center">
                    <span className={`z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step.done ? 'bg-emerald-500 text-white' : step.current ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'border-2 border-slate-300 bg-white text-slate-400'}`}>
                      {step.done ? '✓' : index + 1}
                    </span>
                    {index < steps.length - 1 && <span className={`h-12 w-px ${step.done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-bold ${step.current ? 'text-navy-950' : step.future ? 'text-slate-400' : 'text-slate-700'}`}>{step.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{step.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">We’ll notify you when an administrator makes a decision.</p>
          <button type="button" onClick={() => void goToLogin()} className="mt-5 w-full rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy-800">Back to login</button>
        </div>
      </div>
    )
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
