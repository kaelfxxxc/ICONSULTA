import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { useAppointment } from '../../hooks/useAppointments'
import {
  useAppointmentSummary,
  useEndSession,
} from '../../hooks/useAppointmentSummary'
import { AiSummaryPanel } from '../../components/dashboard'
import { Avatar, Loader } from '../../components/common'
import { Brand } from '../../components/layout/Sidebar'
import {
  ChevronLeftIcon,
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  ScreenShareIcon,
  SparklesIcon,
  VideoIcon,
  VideoOffIcon,
} from '../../components/common/icons'
import { cn } from '../../lib/utils'
import { ROLE_HOME } from '../../utils/constants'

function useElapsed(active: boolean) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [active])
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export default function VideoSession() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const { data: appt, isLoading } = useAppointment(appointmentId)
  const { data: summary } = useAppointmentSummary(appointmentId)
  const endSession = useEndSession(appointmentId)

  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [sharing, setSharing] = useState(false)

  const ended = appt?.status === 'completed'
  const elapsed = useElapsed(!ended)

  const home = profile ? ROLE_HOME[profile.role] : '/'
  const isInstructor = profile?.role === 'instructor'
  const selfName = profile?.name ?? 'You'
  const counterpartName = isInstructor
    ? (appt?.student?.user?.name ?? 'Student')
    : (appt?.instructor?.user?.name ?? 'Instructor')

  async function handleEnd() {
    try {
      await endSession.mutateAsync()
    } catch {
      // Even if summary generation is unavailable, the appointment is completed.
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-navy-950">
        <Loader label="Joining session…" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-navy-950 text-white">
      {/* Slim topbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(home)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10"
            aria-label="Leave session"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <Brand compact />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold">
              {appt?.reason ?? 'Consultation'}
            </div>
            <div className="text-xs text-white/50">with {counterpartName}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!ended ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              LIVE · {elapsed}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300">
              Session ended
            </span>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="grid flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-3">
        {/* Video area */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <VideoTile name={counterpartName} muted={false} camOff={false} />
            <VideoTile name={`${selfName} (You)`} muted={!micOn} camOff={!camOn} />
          </div>

          {/* Control bar */}
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white/5 p-3">
            <ControlButton
              active={micOn}
              onClick={() => setMicOn((v) => !v)}
              label={micOn ? 'Mute' : 'Unmute'}
              disabled={ended}
            >
              {micOn ? (
                <MicIcon className="h-5 w-5" />
              ) : (
                <MicOffIcon className="h-5 w-5" />
              )}
            </ControlButton>
            <ControlButton
              active={camOn}
              onClick={() => setCamOn((v) => !v)}
              label={camOn ? 'Stop video' : 'Start video'}
              disabled={ended}
            >
              {camOn ? (
                <VideoIcon className="h-5 w-5" />
              ) : (
                <VideoOffIcon className="h-5 w-5" />
              )}
            </ControlButton>
            <ControlButton
              active={sharing}
              onClick={() => setSharing((v) => !v)}
              label="Share screen"
              disabled={ended}
            >
              <ScreenShareIcon className="h-5 w-5" />
            </ControlButton>

            {!ended && (
              <button
                onClick={handleEnd}
                disabled={endSession.isPending}
                className="ml-2 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                <PhoneOffIcon className="h-5 w-5" />
                {endSession.isPending ? 'Ending…' : 'End Session & Summarize'}
              </button>
            )}
          </div>
        </div>

        {/* Side panel: transcript + summary */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/80">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Live Transcript
            </div>
            {summary?.transcript ? (
              <p className="max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-white/70">
                {summary.transcript}
              </p>
            ) : (
              <p className="text-sm text-white/40">
                {ended
                  ? 'No transcript was captured for this session.'
                  : 'Transcript will be captured during the consultation…'}
              </p>
            )}
          </div>

          {ended ? (
            <AiSummaryPanel
              title="AI Summary"
              summary={summary?.summary}
              pending={!summary?.summary}
            />
          ) : (
            <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-5">
              <div className="flex items-center gap-2 text-violet-200">
                <SparklesIcon className="h-4 w-4" />
                <span className="text-sm font-semibold">AI Summary Preview</span>
              </div>
              <p className="mt-3 text-sm text-violet-200/70">
                Insights will be compiled automatically when you end the session.
              </p>
            </div>
          )}

          {ended && (
            <button
              onClick={() => navigate(home)}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-white/90"
            >
              Back to dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function VideoTile({
  name,
  muted,
  camOff,
}: {
  name: string
  muted: boolean
  camOff: boolean
}) {
  return (
    <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 ring-1 ring-white/10">
      <div className="flex flex-col items-center gap-3">
        <Avatar name={name} size="lg" />
        {camOff && <span className="text-xs text-white/50">Camera off</span>}
      </div>
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/40 px-2.5 py-1 text-xs font-medium backdrop-blur">
        {muted && <MicOffIcon className="h-3.5 w-3.5 text-red-400" />}
        {name}
      </div>
    </div>
  )
}

function ControlButton({
  active,
  onClick,
  label,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full transition disabled:opacity-40',
        active ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-red-600 text-white hover:bg-red-700',
      )}
    >
      {children}
    </button>
  )
}
