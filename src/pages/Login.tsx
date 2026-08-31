import { useState } from 'react'
import type { ComponentType, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn, signOut, signUp } from '../services/auth.service'
import { ROLE_HOME, DEPARTMENTS } from '../utils/constants'
import { cn } from '../lib/utils'
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  fieldClass,
  GraduationCapIcon,
  Input,
  LockIcon,
  Logo,
  MailIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '../components/common'
import type { Department } from '../types'

type Mode = 'signin' | 'signup'
type SignupRole = 'student' | 'instructor'

export default function Login({ variant = 'default' }: { variant?: 'default' | 'admin' }) {
  const navigate = useNavigate()
  const isAdminPortal = variant === 'admin'
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
        // Route by the account's ACTUAL role, not the Student/Instructor toggle
        // above — that picker only applies to sign-up. Admins land on /admin.
        const { role: actualRole } = await signIn({ email, password })

        // The admin portal admits admins only; anyone else is signed back out
        // so a student credential can't sit half-authenticated here.
        if (isAdminPortal && actualRole !== 'admin') {
          await signOut()
          setError(
            'That account is not an administrator. Use the main sign-in page.',
          )
          return
        }

        navigate(ROLE_HOME[actualRole ?? role], { replace: true })
      } else {
        await signUp({
          email,
          password,
          name,
          role,
          department: role === 'instructor' ? department : undefined,
        })
        // Email confirmation is bypassed: route the new account to the Sign In
        // tab to log in with the credentials they just created. signUp uses a
        // session-less client, so the browser is never auto-logged-in here.
        setMode('signin')
        setPassword('')
        setNotice('Account created. Please sign in with your credentials.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const eyebrow = isAdminPortal
    ? 'Secure administrator access'
    : mode === 'signin'
      ? 'Continue to your workspace'
      : 'Join ICONSULTA'
  const heading = isAdminPortal
    ? 'Administrator sign in.'
    : mode === 'signin'
      ? 'Welcome back.'
      : 'Create your account.'
  const subtext = isAdminPortal
    ? 'Restricted access — administrator accounts only.'
    : mode === 'signin'
      ? 'Sign in to keep your consultations moving.'
      : 'Start booking sessions with MCC faculty.'
  const ctaLabel = mode === 'signin' ? 'Sign in to ICONSULTA' : 'Create your account'

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900">
      {/* Top bar spans the full width above both columns. */}
      <header className="flex items-center justify-between border-b border-slate-200/70 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <BookOpenIcon className="h-4 w-4 text-navy-900" />
          Academic consultation portal
        </div>
        <p className="hidden text-xs font-medium uppercase tracking-[0.14em] text-slate-400 sm:block">
          MCC campus access · Secure workspace
        </p>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:px-10 lg:py-14">
        {/* Editorial column — desktop only; the card carries the brand on mobile. */}
        <section className="animate-rise hidden flex-col justify-between lg:flex">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Make your next question count
              </span>
              <span className="text-xs font-medium text-slate-300">01 / 01</span>
            </div>

            <Logo className="mt-8 h-11 w-auto" />

            <h1 className="mt-10 text-5xl font-extrabold leading-[1.04] tracking-tight xl:text-6xl">
              <span className="text-navy-900">Better questions</span>
              <br />
              <span className="text-slate-400">start with time.</span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-500">
              Book a thoughtful conversation with MCC faculty, keep the context,
              and move your learning forward with confidence.
            </p>
          </div>

          <div className="mt-12">
            <div className="grid grid-cols-2 gap-4">
              <Feature
                icon={SparklesIcon}
                title="One calm place"
                subtitle="For every consultation detail"
              />
              <Feature
                icon={ShieldCheckIcon}
                title="Built for campus"
                subtitle="Secure access for your next step"
              />
            </div>
            <div className="mt-8 flex items-center justify-between text-xs text-slate-400">
              <span>© {new Date().getFullYear()} MCC · ICONSULTA</span>
              <span className="tracking-wide">Book · Connect · Consult</span>
            </div>
          </div>
        </section>

        {/* Login card */}
        <section className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Logo className="h-9 w-auto" />
            </div>

            <div className="animate-rise relative rounded-[28px] rounded-tl-md border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-28px_rgba(15,30,60,0.35)] sm:p-8">
              {/* Small navy accent tab riding the top-left edge. */}
              <span className="absolute left-7 top-0 h-1 w-12 -translate-y-1/2 rounded-full bg-navy-900" />

              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {eyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {heading}
              </h2>
              <p className="mt-2 text-sm text-slate-500">{subtext}</p>

              {isAdminPortal && (
                <div className="mt-5 flex items-center gap-2 rounded-xl border border-navy-200 bg-navy-50 px-3 py-2.5 text-sm font-medium text-navy-900">
                  <ShieldCheckIcon className="h-4 w-4" />
                  Admin portal
                </div>
              )}

              {/* Mode tabs — admins are provisioned server-side, never self-signup. */}
              {!isAdminPortal && (
                <div className="mt-6 flex gap-6 border-b border-slate-200">
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
                        '-mb-px border-b-2 pb-3 text-sm font-semibold transition',
                        mode === m
                          ? 'border-navy-900 text-navy-900'
                          : 'border-transparent text-slate-400 hover:text-slate-600',
                      )}
                    >
                      {m === 'signin' ? 'Sign in' : 'Sign up'}
                    </button>
                  ))}
                </div>
              )}

              {/* Role cards — the picker drives sign-up; sign-in reads role from the DB. */}
              {!isAdminPortal && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {(
                    [
                      {
                        key: 'student',
                        label: 'Student',
                        sub: 'Find support',
                        icon: GraduationCapIcon,
                      },
                      {
                        key: 'instructor',
                        label: 'Instructor',
                        sub: 'Guide learners',
                        icon: BookOpenIcon,
                      },
                    ] as const
                  ).map((r) => {
                    const selected = role === r.key
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRole(r.key)}
                        className={cn(
                          'relative flex items-start gap-3 rounded-2xl border p-3.5 text-left transition',
                          selected
                            ? 'border-navy-900 bg-navy-50'
                            : 'border-slate-200 hover:border-slate-300',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                            selected
                              ? 'border-navy-200 bg-white text-navy-900'
                              : 'border-slate-200 bg-slate-50 text-slate-500',
                          )}
                        >
                          <r.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            {r.label}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {r.sub}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full border',
                            selected
                              ? 'border-navy-900 bg-navy-900 text-white'
                              : 'border-slate-300',
                          )}
                        >
                          {selected && <CheckIcon className="h-3 w-3" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {mode === 'signup' && (
                  <Input
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Juan Dela Cruz"
                  />
                )}

                <Input
                  label="School email"
                  type="email"
                  icon={<MailIcon className="h-4 w-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="idnumber@mcce.edu.ph"
                />

                <Input
                  label="Password"
                  labelRight={
                    mode === 'signin' ? (
                      <button
                        type="button"
                        onClick={() => navigate('/forgot-password')}
                        className="text-xs font-medium text-navy-700 hover:text-navy-900"
                      >
                        Forgot password?
                      </button>
                    ) : undefined
                  }
                  type={showPw ? 'text' : 'password'}
                  icon={<LockIcon className="h-4 w-4" />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  placeholder="••••••••"
                />

                {mode === 'signup' && role === 'instructor' && (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">
                      Department
                    </span>
                    <span className="relative block">
                      <select
                        value={department}
                        onChange={(e) =>
                          setDepartment(e.target.value as Department)
                        }
                        className={cn(fieldClass, 'appearance-none pr-9')}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </span>
                  </label>
                )}

                {mode === 'signin' && (
                  <label className="flex items-center gap-2.5 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-navy-900 focus:ring-navy-200"
                    />
                    Remember me on this device
                  </label>
                )}

                {error && (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                {notice && (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {notice}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 flex w-full items-center justify-between gap-3 rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-navy-900/20 transition hover:bg-navy-800 active:scale-[.99] disabled:cursor-not-allowed disabled:bg-navy-300 disabled:shadow-none"
                >
                  <span className="flex items-center gap-2">
                    {loading && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    )}
                    {ctaLabel}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">
                    <ArrowUpRightIcon className="h-4 w-4" />
                  </span>
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                Use your MCC-issued email to access all campus features.
              </div>

              <div className="mt-3 border-t border-slate-100 pt-4 text-center">
                {isAdminPortal ? (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy-900"
                  >
                    Student / instructor sign in
                    <ArrowUpRightIcon className="h-3 w-3" />
                  </Link>
                ) : (
                  <Link
                    to="/login/admin"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy-900"
                  >
                    Administrator sign in
                    <ArrowUpRightIcon className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-900">
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
    </div>
  )
}
