import { useState } from 'react'
import type { FormEvent } from 'react'
import { signUp } from '../../services/auth.service'
import { Button, Input } from '../../components/common'
import { cn } from '../../lib/utils'
import { DEPARTMENTS } from '../../utils/constants'
import type { Department } from '../../types'

type SignupRole = 'student' | 'instructor'

export function SignupForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<SignupRole>('student')
  const [department, setDepartment] = useState<Department>('SOB')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    try {
      await signUp({
        email,
        password,
        name,
        role,
        department: role === 'instructor' ? department : undefined,
      })
      // signUp runs on a session-less client on purpose, so the browser is
      // never logged in here — routing to a dashboard would just bounce off
      // ProtectedRoute. Send them to Sign In with the credentials they chose.
      setPassword('')
      setNotice('Account created. Please sign in with your credentials.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
        {(['student', 'instructor'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              'rounded-md py-1.5 text-sm font-medium capitalize transition',
              role === r
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <Input
        label="Full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoComplete="name"
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="you@mcc.edu.ph"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        autoComplete="new-password"
      />

      {role === 'instructor' && (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Department
          </span>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notice && <p className="text-sm text-green-600">{notice}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Create account
      </Button>
    </form>
  )
}
