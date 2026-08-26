import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp } from '../services/auth.service'
import { ROLE_HOME } from '../utils/constants'
import { DEPARTMENTS } from '../utils/constants'
import { cn } from '../lib/utils'
import {
  EyeIcon,
  EyeOffIcon,
  GraduationCapIcon,
  IdCardIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
  SparklesIcon,
  VideoIcon,
} from '../components/common/icons'
import type { Department } from '../types'
import hero from '../assets/hero.png'

type Mode = 'signin' | 'signup'
type SignupRole = 'student' | 'instructor'

const FEATURES = [
  { icon: VideoIcon, text: 'Face-to-face video consultations with your faculty' },
  { icon: SparklesIcon, text: 'AI-generated summaries after every session' },
  { icon: ShieldCheckIcon, text: 'Secure, role-based access for your campus' },
]

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [role, setRole] = useState<SignupRole>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState<Department>('SOT')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn({ email, password })
        navigate(ROLE_HOME[role], { replace: true })
      } else {
        const { session } = await signUp({
          email,
          password,
          name,
          role,
          department: role === 'instructor' ? department : undefined,
        })
        if (session) navigate(ROLE_HOME[role], { replace: true })
        else
          setNotice(
            'Account created. If email confirmation is enabled, confirm via the emailed link, then sign in.',
          )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-stretch bg-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden shadow-xl md:my-8 md:flex-row md:rounded-3xl">
        {/* Hero panel */}
        <div className="relative hidden w-full bg-navy-900 md:block md:w-[46%]">
          <img
            src={hero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900/80 via-navy-900/85 to-navy-950/95" />
          <div className="relative flex h-full flex-col justify-between p-10 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <GraduationCapIcon className="h-6 w-6" />
              </span>
              <span className="text-xl font-bold tracking-tight">ICONSULTA</span>
            </div>

            <div>
              <h1 className="text-3xl font-bold leading-tight">
                Academic consultations,
                <br />
                thoughtfully scheduled.
              </h1>
              <p className="mt-3 max-w-sm text-sm text-navy-200">
                Book, meet, and follow up with MCC faculty — all in one place.
              </p>
              <ul className="mt-8 space-y-4">
                {FEATURES.map((f) => (
                  <li key={f.text} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-navy-100">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-navy-300">
              © {new Date().getFullYear()} MCC · ICONSULTA
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex w-full items-center justify-center bg-white p-8 md:w-[54%] md:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex items-center gap-2.5 md:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
                <GraduationCapIcon className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold text-navy-900">ICONSULTA</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'signin'
                ? 'Sign in to manage your consultations.'
                : 'Join ICONSULTA to start booking sessions.'}
            </p>

            {/* Mode tabs */}
            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(['signin', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m)
                    setError(null)
                    setNotice(null)
                  }}
                  className={cn(
                    'rounded-lg py-2 text-sm font-semibold transition',
                    mode === m
                      ? 'bg-white text-navy-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Role cards */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {(
                [
                  { key: 'student', label: 'Student', icon: IdCardIcon },
                  { key: 'instructor', label: 'Instructor', icon: GraduationCapIcon },
                ] as const
              ).map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition',
                    role === r.key
                      ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300',
                  )}
                >
                  <r.icon className="h-5 w-5" />
                  {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === 'signup' && (
                <Field label="Full name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Juan Dela Cruz"
                    className={inputClass}
                  />
                </Field>
              )}

              <Field label="School email">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <MailIcon className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="idnumber@mcce.edu.ph"
                  className={cn(inputClass, 'pl-10')}
                />
              </Field>

              <Field label="Password">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LockIcon className="h-4 w-4" />
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  placeholder="••••••••"
                  className={cn(inputClass, 'pl-10 pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </Field>

              {mode === 'signup' && role === 'instructor' && (
                <Field label="Department">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className={cn(inputClass, 'appearance-none')}
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {mode === 'signin' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="font-medium text-brand-600 hover:text-brand-700"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-300"
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {mode === 'signin' ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Use your MCC-issued email to access all campus features.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <span className="relative block">{children}</span>
    </label>
  )
}
