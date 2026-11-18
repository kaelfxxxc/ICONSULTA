import { useState } from 'react'

const OPTIONS = ['Schedule conflict', 'Emergency', 'No longer needed', 'Other']

export function ReasonDialog({ title, onSubmit, onClose }: { title: string; onSubmit: (reason: string) => void; onClose: () => void }) {
  const [choice, setChoice] = useState(OPTIONS[0])
  const [other, setOther] = useState('')
  const reason = choice === 'Other' ? other.trim() : choice
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={(e) => { e.preventDefault(); if (reason) onSubmit(reason) }} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <label className="block text-sm font-medium text-slate-700">Reason
          <select value={choice} onChange={(e) => setChoice(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
            {OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        {choice === 'Other' && <label className="block text-sm font-medium text-slate-700">Details
          <textarea value={other} onChange={(e) => setOther(e.target.value.slice(0, 250))} maxLength={250} required rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
          <span className="text-xs text-slate-400">{other.length}/250</span>
        </label>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">Cancel</button><button type="submit" className="rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white">Submit</button></div>
      </form>
    </div>
  )
}
