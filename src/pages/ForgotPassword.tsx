import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/utils'
import {
  ArrowRightIcon,
  GraduationCapIcon,
  MailIcon,
} from '../components/common/icons'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (err) throw err
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-dotted flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white">
            <GraduationCapIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold text-navy-900">ICONSULTA</span>
        </div>

        {sent ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">Check your inbox</h1>
            <p className="mt-2 text-sm text-slate-500">
              If an account exists for{' '}
              <span className="font-medium text-slate-700">{email}</span>, we
              sent a link to reset your password.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
            >
              Back to sign in <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your school email and we&rsquo;ll send you a link to get back
              into your account.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  School email
                </span>
                <span className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <MailIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="idnumber@mcce.edu.ph"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </span>
              </label>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800',
                  loading && 'cursor-not-allowed opacity-70',
                )}
              >
                {loading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                Send reset link
              </button>
            </form>
            <Link
              to="/login"
              className="mt-4 block text-center text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
