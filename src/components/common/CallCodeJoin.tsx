import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useFindAppointmentByCallCode, useMyJoinedCalls } from '../../hooks/useAppointments'
import { SectionCard } from './Section'
import { formatDateTime } from '../../lib/utils'

export function CallCodeJoin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const findByCode = useFindAppointmentByCallCode()
  const { data: joinedCalls } = useMyJoinedCalls()
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
      void queryClient.invalidateQueries({ queryKey: ['joined-call-rooms'] })
      navigate(`/session/${appointmentId}`)
      setCode('')
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
      {!!joinedCalls?.length && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your joined calls</h3>
          <div className="space-y-2">
            {joinedCalls.map((call) => (
              <div key={call.appointment_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{call.reason || 'Consultation call'}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(call.scheduled_at)} · Code {call.call_code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/session/${call.appointment_id}`)}
                  className="rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800"
                >
                  Rejoin
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}
