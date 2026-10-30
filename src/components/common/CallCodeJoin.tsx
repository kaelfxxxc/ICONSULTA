import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFindAppointmentByCallCode } from '../../hooks/useAppointments'
import { SectionCard } from './Section'

export function CallCodeJoin() {
  const navigate = useNavigate()
  const findByCode = useFindAppointmentByCallCode()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    try {
      const appointmentId = await findByCode.mutateAsync(code)
      if (!appointmentId) {
        setError('No approved call matches that code. Check it and try again.')
        return
      }
      navigate(`/session/${appointmentId}`)
    } catch {
      setError('Could not join this call. Please check the code and try again.')
    }
  }

  return (
    <SectionCard title="Join a call">
      <form className="flex flex-wrap gap-2" onSubmit={join}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={16}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Enter call code"
          aria-label="Call code"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase tracking-wider"
        />
        <button
          disabled={findByCode.isPending || code.trim().length < 4}
          className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {findByCode.isPending ? 'Joining…' : 'Join call'}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">Enter the code shared by the meeting host. You must be signed in.</p>
    </SectionCard>
  )
}
