import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { useAppointment } from '../../hooks/useAppointments'
import {
  useGenerateAppointmentSummary,
  useAppointmentSummary,
  useEndSession,
} from '../../hooks/useAppointmentSummary'
import { startAppointmentCall } from '../../services/session.service'
import { useWebRTC } from '../../hooks/useWebRTC'
import { useLiveTranscript } from '../../hooks/useLiveTranscript'
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

function useElapsed(active: boolean, startedAt: string | null) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  const seconds = startedAt ? Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000)) : 0
  const hours = Math.floor(seconds / 3600)
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return { seconds, label: `${hours ? `${hours}:` : ''}${mm}:${ss}` }
}

export default function VideoSession() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const { data: appt, isLoading } = useAppointment(appointmentId)
  const { data: summary } = useAppointmentSummary(appointmentId)
  const endSession = useEndSession(appointmentId)
  const retrySummary = useGenerateAppointmentSummary(appointmentId)
  const liveTranscript = useLiveTranscript()
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [callStartedAt, setCallStartedAt] = useState<string | null>(null)
  const [callLimitSetupError, setCallLimitSetupError] = useState<string | null>(null)
  const [endedByLimit, setEndedByLimit] = useState(false)
  const autoEndStarted = useRef(false)

  const ended = appt?.status === 'completed'

  useEffect(() => {
    if (!appointmentId || ended) return
    let active = true
    const localStart = new Date().toISOString()
    void startAppointmentCall(appointmentId)
      .then((startedAt) => { if (active) setCallStartedAt(startedAt) })
      .catch((error: unknown) => {
        if (!active) return
        setCallStartedAt(localStart)
        setCallLimitSetupError(error instanceof Error ? error.message : 'Could not sync the shared call timer.')
      })
    return () => { active = false }
  }, [appointmentId, ended])

  // Real camera/mic + peer connection. Signaling rides Supabase Realtime on a
  // channel keyed by   the appointment, so both parties meet in the same room.
  const {
    phase,
    mediaError,
    micOn,
    camOn,
    sharing,
    remoteCamOff,
    remoteVideoLive,
    setLocalVideoEl,
    setRemoteVideoEl,
    participants,
    toggleMic,
    toggleCam,
    toggleShare,
    stopAll,
  } = useWebRTC(
    ended ? undefined : appointmentId,
    profile?.id,
    profile?.name || profile?.email?.split('@')[0] || 'Participant',
  )

  const elapsed = useElapsed(!ended, callStartedAt)

  const home = profile ? ROLE_HOME[profile.role] : '/'
  const isInstructor = profile?.role === 'instructor'
  const selfName = profile?.name ?? 'You'
  const counterpartName = isInstructor
    ? (appt?.student?.user?.name ?? 'Student')
    : (appt?.instructor?.user?.name ?? 'Instructor')

  async function handleEnd() {
    liveTranscript.stop()
    stopAll()
    try {
      await endSession.mutateAsync(liveTranscript.getTranscript())
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : 'The session ended, but the transcript or summary could not be saved.')
    }
  }

  useEffect(() => {
    if (elapsed.seconds < 60 * 60 || ended || autoEndStarted.current) return
    autoEndStarted.current = true
    setEndedByLimit(true)
    void handleEnd()
  }, [elapsed.seconds, ended])

  const retryableSummary = Boolean(
    summary?.summary?.includes('once the AI summary has been generated') ||
    summary?.summary?.includes('Gemini could not generate the summary'),
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-navy-950">
        <Loader label="Joining session…" />
      </div>
    )
  }

  const connectionLabel =
    phase === 'requesting-media'
      ? 'Starting camera…'
      : phase === 'waiting'
        ? `Waiting for ${counterpartName} to join…`
        : phase === 'connecting' && !remoteVideoLive
          ? 'Connecting…'
          : remoteCamOff
            ? `${counterpartName}'s camera is off`
            : !remoteVideoLive
              ? `Waiting for ${counterpartName}'s camera…`
              : null

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-navy-950 text-white">
      {/* Slim topbar */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-white/10 px-2 py-2 sm:min-h-14 sm:flex-nowrap sm:justify-between sm:px-4 sm:py-0">
        <div className="flex min-w-0 items-center gap-1 sm:gap-3">
          <button
            onClick={() => navigate(home)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10"
            aria-label="Leave session"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          {/* The mark carries no size of its own, and `max-w-full` resolves against
              this box — so the width here is what actually scales the logo down
              from its 500px natural width to fit the slim topbar. */}
          <div className="w-24 shrink-0 rounded-lg bg-slate-50 px-2 sm:m-2 sm:w-52 sm:rounded-2xl">
            <Brand compact />
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <div className="max-w-48 truncate text-center text-sm font-semibold">
              {appt?.reason ?? 'Consultation'}
            </div>
            <div className="text-xs text-white/50">with {counterpartName}</div>
          </div>
          {appt?.call_code && !ended && (
            <div className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 text-[10px] text-white/70 sm:flex sm:gap-2 sm:px-3 sm:text-xs">
              <span className="hidden sm:inline">Code</span>
              <span className="font-mono font-bold tracking-wider text-white">{appt.call_code}</span>
            </div>
          )}
          {!ended ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1.5 text-[10px] font-medium sm:gap-2 sm:px-3 sm:text-xs">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  phase === 'connected'
                    ? 'animate-pulse bg-green-500'
                    : 'bg-red-500',
                )}
              />
              <span className={phase === 'connected' ? 'text-green-400' : 'text-red-400'}>
                {phase === 'connected' ? `LIVE · ${elapsed.label}` : 'Connecting'}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-1.5 text-[10px] font-medium text-emerald-300 sm:gap-2 sm:px-3 sm:text-xs">
              Session ended
            </span>
          )}
        </div>
        {appt?.call_code && !ended && (
          <div className="flex basis-full justify-center sm:hidden">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 text-[10px] text-white/70">
              <span>Code</span>
              <span className="font-mono font-bold tracking-wider text-white">{appt.call_code}</span>
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:p-4 lg:grid lg:grid-cols-3 xl:grid-cols-4 xl:grid-rows-[minmax(0,1fr)] xl:overflow-hidden">
        {/* Video area */}
        <div className="flex min-w-0 flex-col gap-2 sm:gap-4 lg:col-span-2 xl:col-span-3 xl:min-h-0">
          {!ended && elapsed.seconds >= 50 * 60 && (
            <div role="alert" className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
              {elapsed.seconds < 60 * 60
                ? '10 minutes remain. This call ends automatically at 60 minutes; start a new call to continue.'
                : 'The 60-minute limit was reached. Ending this call…'}
            </div>
          )}
          {callLimitSetupError && !ended && (
            <div role="status" className="rounded-xl border border-amber-300/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
              Shared call timer unavailable; this device is using a local timer. Apply the call limit SQL migration to synchronize the one-hour limit across participants.
            </div>
          )}
          {mediaError && !ended && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              <span className="font-semibold">Camera / microphone unavailable. </span>
              {mediaError.message}
            </div>
          )}

          <div className="grid max-h-[52dvh] min-h-0 flex-none content-start auto-rows-min grid-cols-2 gap-2 overflow-y-auto overscroll-contain sm:max-h-[62dvh] sm:gap-4 xl:my-auto xl:max-h-[calc(100dvh-10rem)] xl:grid-cols-2 xl:gap-4">
            <VideoTile
              name={`${selfName} (You)`}
              videoRef={setLocalVideoEl}
              muted={!micOn}
              camOff={!camOn}
              isSelf
              placeholder={ended ? 'Camera off' : null}
              showPlaceholder={ended || !camOn}
            />
            {participants.map((participant) => (
              <VideoTile
                key={participant.id}
                name={participant.name || 'Guest'}
                videoRef={(el) => setRemoteVideoEl(participant.id, el)}
                muted={!participant.micOn}
                camOff={participant.camOff}
                placeholder="Waiting for video…"
                showPlaceholder={participant.stream.getVideoTracks().length === 0 || participant.camOff}
              />
            ))}
            {participants.length === 0 && !ended && (
              <div className="flex aspect-video min-h-0 items-center justify-center rounded-2xl border border-dashed border-white/15 px-2 text-center text-[10px] text-white/45 sm:px-3 sm:text-sm xl:aspect-video 2xl:aspect-[4/3]">
                {connectionLabel ?? 'Share the call code to invite participants.'}
              </div>
            )}
          </div>

          {/* Control bar */}
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-navy-900/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:gap-3 sm:p-3 xl:mt-auto">
            <ControlButton
              active={micOn}
              onClick={toggleMic}
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
              onClick={toggleCam}
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
              onClick={() => void toggleShare()}
              label={sharing ? 'Stop sharing' : 'Share screen'}
              disabled={ended}
              activeTone="brand"
            >
              <ScreenShareIcon className="h-5 w-5" />
            </ControlButton>

            {!ended && (
              <button
                onClick={handleEnd}
                disabled={endSession.isPending}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-red-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:ml-2 sm:px-5 sm:py-3 sm:text-sm"
              >
                <PhoneOffIcon className="h-5 w-5" />
                {endSession.isPending ? 'Ending…' : <><span className="sm:hidden">End call</span><span className="hidden sm:inline">End Session &amp; Summarize</span></>}
              </button>
            )}
          </div>
        </div>

        {/* Side panel: transcript + summary */}
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row lg:flex-col xl:col-span-1 xl:max-h-full xl:overflow-y-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <span className={cn('h-2 w-2 rounded-full', liveTranscript.listening ? 'animate-pulse bg-red-400' : 'bg-emerald-400')} />
                Live Transcript
              </div>
              {!ended && liveTranscript.supported && (
                <button
                  type="button"
                  onClick={liveTranscript.listening ? liveTranscript.stop : liveTranscript.start}
                  className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
                >
                  {liveTranscript.listening ? 'Pause transcript' : liveTranscript.transcript ? 'Resume transcript' : 'Start transcript'}
                </button>
              )}
            </div>
            {summary?.transcript || liveTranscript.transcript || liveTranscript.interim ? (
              <p className="max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-white/70">
                {summary?.transcript ?? liveTranscript.transcript}
                {liveTranscript.interim && <span className="text-white/40"> {liveTranscript.interim}</span>}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-white/50">
                  {ended
                    ? summary?.transcript ?? 'No transcript was captured for this session.'
                    : liveTranscript.supported
                      ? 'Start transcription when everyone is ready. Captions will appear here as you speak.'
                      : 'Live transcription is not supported by this browser. Try Chrome or Edge on a supported device.'}
                </p>
                {!ended && liveTranscript.supported && (
                  <p className="text-xs text-white/35">Transcription uses this device’s speech recognition. Let other participants know before starting.</p>
                )}
              </div>
            )}
            {liveTranscript.error && <p className="mt-2 text-xs text-amber-300">{liveTranscript.error}</p>}
            {summaryError && <p className="mt-2 text-xs text-amber-300">{summaryError}</p>}
          </div>

          {ended ? (
            <div className="space-y-2">
              <AiSummaryPanel
                title="AI Summary"
                summary={summary?.summary}
                pending={!summary?.summary || retrySummary.isPending}
              />
              {retryableSummary && (
                <button
                  type="button"
                  disabled={retrySummary.isPending}
                  onClick={() => retrySummary.mutate()}
                  className="rounded-lg border border-violet-300/30 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/20 disabled:opacity-50"
                >
                  {retrySummary.isPending ? 'Generating summary…' : 'Generate AI summary'}
                </button>
              )}
              {endedByLimit && <p className="text-sm text-amber-200">This call ended at the 60-minute limit. Start a new call to continue.</p>}
              {summaryError && <p role="alert" className="text-sm text-red-300">{summaryError}</p>}
              {retrySummary.error && <p role="alert" className="text-sm text-red-300">{retrySummary.error.message}</p>}
            </div>
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
  videoRef,
  muted,
  camOff,
  isSelf,
  placeholder,
  showPlaceholder,
}: {
  name: string
  videoRef: (el: HTMLVideoElement | null) => void
  muted: boolean
  camOff: boolean
  isSelf?: boolean
  placeholder?: string | null
  showPlaceholder?: boolean
}) {
  return (
    <div className="relative flex aspect-video min-h-0 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-navy-800 to-navy-950 ring-1 ring-white/10 sm:rounded-2xl xl:aspect-video 2xl:aspect-[4/3]">
      {/* Real media. `muted` on self is required or the room echoes. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={cn(
          'h-full w-full object-cover',
          // Mirror your own preview, like every other conferencing app.
          isSelf && 'scale-x-[-1]',
          showPlaceholder && 'invisible',
        )}
      />

      {showPlaceholder && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Avatar name={name} size="lg" />
          {(placeholder ?? (camOff ? 'Camera off' : null)) && (
            <span className="px-4 text-center text-xs text-white/50">
              {placeholder ?? 'Camera off'}
            </span>
          )}
        </div>
      )}

      <div className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-0.75rem)] items-center gap-1 rounded-lg bg-black/50 px-1.5 py-1 text-[10px] font-medium backdrop-blur sm:bottom-3 sm:left-3 sm:max-w-[calc(100%-1.5rem)] sm:gap-2 sm:px-2.5 sm:text-xs">
        {muted && <MicOffIcon className="h-3.5 w-3.5 text-red-400" />}
        <span className="truncate">{name}</span>
      </div>
    </div>
  )
}

function ControlButton({
  active,
  onClick,
  label,
  disabled,
  activeTone = 'neutral',
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  disabled?: boolean
  activeTone?: 'neutral' | 'brand'
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full transition disabled:opacity-40 sm:h-12 sm:w-12',
        active
          ? activeTone === 'brand'
            ? 'bg-brand-500 text-white hover:bg-brand-600'
            : 'bg-white/15 text-white hover:bg-white/25'
          : activeTone === 'brand'
            ? 'bg-white/15 text-white hover:bg-white/25'
            : 'bg-red-600 text-white hover:bg-red-700',
      )}
    >
      {children}
    </button>
  )
}
