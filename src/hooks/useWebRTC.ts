import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/**
 * Real peer-to-peer audio/video for a consultation.
 *
 * Signaling rides on a Supabase Realtime *broadcast* channel keyed by the
 * appointment id, so no extra server is needed. Media itself never touches
 * Supabase — it flows browser-to-browser over WebRTC.
 *
 * Roles: the two parties must not both send an offer, or they glare (both in
 * `have-local-offer` and neither can apply the other's). We break the tie with
 * the caller's own id — the lexicographically larger id is the "initiator" and
 * is the only side that creates the offer. Both sides answer.
 *
 * Handshake: a joiner broadcasts `hello`; whoever is already in the room replies
 * once with `hello-ack`. The reply is a *different* message type on purpose — two
 * sides answering `hello` with `hello` greet each other forever, and each lap
 * used to kick off another offer, so the connection never settled.
 */

type Phase =
  | 'idle'
  | 'requesting-media'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'ended'

export type MediaErrorKind =
  | 'denied'
  | 'not-found'
  | 'in-use'
  | 'insecure-context'
  | 'unsupported'
  | 'unknown'

export interface MediaError {
  kind: MediaErrorKind
  message: string
}

/** ICE servers: public STUN is enough for same-network / most NAT cases. */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

type SignalPayload =
  | { type: 'offer'; from: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; from: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; from: string; candidate: RTCIceCandidateInit }
  | { type: 'hello'; from: string }
  | { type: 'hello-ack'; from: string }
  | { type: 'bye'; from: string }

function describeMediaError(err: unknown): MediaError {
  if (!window.isSecureContext) {
    return {
      kind: 'insecure-context',
      message:
        'Camera and microphone need a secure context. Open the app over https, or on localhost.',
    }
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      kind: 'unsupported',
      message: 'This browser does not support camera/microphone access.',
    }
  }
  const name = err instanceof Error ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        kind: 'denied',
        message:
          'Camera and microphone are blocked. Allow access in your browser’s address-bar permission icon, then rejoin.',
      }
    case 'NotFoundError':
    case 'OverconstrainedError':
      return {
        kind: 'not-found',
        message: 'No camera or microphone was found on this device.',
      }
    case 'NotReadableError':
    case 'AbortError':
      return {
        kind: 'in-use',
        message:
          'Your camera or microphone is already in use by another app. Close it and rejoin.',
      }
    default:
      return {
        kind: 'unknown',
        message:
          err instanceof Error ? err.message : 'Could not start your camera.',
      }
  }
}

export function useWebRTC(roomId: string | undefined, selfId: string | undefined) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [mediaError, setMediaError] = useState<MediaError | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [remoteMuted, setRemoteMuted] = useState(false)
  const [remoteCamOff, setRemoteCamOff] = useState(false)
  // Whether the peer's video is actually arriving. The remote tile keys off this
  // rather than `phase`, so a renegotiation or a brief ICE hiccup can't blank a
  // feed that is still playing.
  const [remoteVideoLive, setRemoteVideoLive] = useState(false)

  const localStream = useRef<MediaStream | null>(null)
  const remoteStream = useRef<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const cameraTrack = useRef<MediaStreamTrack | null>(null)
  // Candidates that arrive before the remote description is set must be queued.
  const pendingIce = useRef<RTCIceCandidateInit[]>([])
  const makingOffer = useRef(false)
  const endedRef = useRef(false)
  // The peer's id, learned from the first signal. Used to decide who performs
  // an ICE restart (the same larger-id initiator rule as the first offer).
  const remoteIdRef = useRef<string | null>(null)

  /** Attach a stream to a <video>, tolerating a ref that mounts later. */
  const bind = useCallback(
    (el: HTMLVideoElement | null, stream: MediaStream | null) => {
      if (!el || !stream) return
      if (el.srcObject !== stream) el.srcObject = stream
      // Autoplay can reject until a gesture; the UI still shows the tile. Retry
      // on every bind so an element left paused by that rejection recovers.
      if (el.paused) void el.play().catch(() => {})
    },
    [],
  )

  const setLocalVideoEl = useCallback(
    (el: HTMLVideoElement | null) => {
      localVideoRef.current = el
      bind(el, localStream.current)
    },
    [bind],
  )

  const setRemoteVideoEl = useCallback(
    (el: HTMLVideoElement | null) => {
      remoteVideoRef.current = el
      bind(el, remoteStream.current)
    },
    [bind],
  )

  const send = useCallback((payload: SignalPayload) => {
    void channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload,
    })
  }, [])

  // ---- Main lifecycle: media -> peer connection -> signaling ----------------
  useEffect(() => {
    if (!roomId || !selfId) return

    let cancelled = false
    endedRef.current = false
    makingOffer.current = false

    // Reconnection state — lives here so both start() and the effect's cleanup
    // can see it. A dropped peer connection is usually transient: we tolerate a
    // short `disconnected` grace period, then have the *initiator* (the same
    // side that created the first offer) send a fresh offer with
    // `iceRestart: true`. ICE re-gathers over the still-live Supabase signaling
    // path, which often reconnects both ends. After a few failed attempts we
    // give up and show the waiting state instead of hanging on a dead call.
    const MAX_RESTART_ATTEMPTS = 3
    const RESTART_GRACE_MS = 3000
    let restartAttempts = 0
    let restartTimer: ReturnType<typeof setTimeout> | null = null
    let remoteLeft = false

    const clearRestartTimer = () => {
      if (restartTimer) {
        clearTimeout(restartTimer)
        restartTimer = null
      }
    }

    async function start() {
      setPhase('requesting-media')
      setMediaError(null)

      // 1. Local camera + mic.
      let stream: MediaStream
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        })
      } catch (err) {
        if (cancelled) return
        setMediaError(describeMediaError(err))
        // Still join signaling so the other side can be seen/heard one-way.
        stream = new MediaStream()
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      localStream.current = stream
      cameraTrack.current = stream.getVideoTracks()[0] ?? null
      setMicOn(stream.getAudioTracks().some((t) => t.enabled))
      setCamOn(stream.getVideoTracks().some((t) => t.enabled))
      bind(localVideoRef.current, stream)

      // 2. Peer connection.
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      pcRef.current = pc
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))

      const inbound = new MediaStream()
      remoteStream.current = inbound

      const syncRemoteVideo = () => {
        if (cancelled) return
        setRemoteVideoLive(
          inbound.getVideoTracks().some((t) => t.readyState === 'live'),
        )
      }

      // ---- Reconnection (ICE restart) ----------------------------------------
      // Constants/state above (effect scope) — the initiator sends a fresh
      // `iceRestart: true` offer over signaling after the `disconnected` grace
      // period; the peer answers, so a reconnect never glares.

      const doRestart = async () => {
        restartTimer = null
        if (cancelled || endedRef.current || remoteLeft) return
        const pc = pcRef.current
        if (!pc) return
        const st = pc.iceConnectionState
        // It recovered while the grace timer was pending — nothing to do.
        if (st === 'connected' || st === 'completed') {
          restartAttempts = 0
          return
        }
        // A re-check is already underway; let it finish.
        if (st === 'checking') return
        // Only the initiator sends the restart offer; the peer answers, so a
        // reconnect never glares. No peer id yet means there's nothing to reach.
        if (!remoteIdRef.current || selfId! < remoteIdRef.current) return
        if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
          if (!cancelled) setPhase('waiting')
          return
        }
        restartAttempts += 1
        try {
          if (pc.signalingState === 'stable') {
            if (!cancelled) setPhase('connecting')
            const offer = await pc.createOffer({ iceRestart: true })
            await pc.setLocalDescription(offer)
            send({ type: 'offer', from: selfId!, sdp: offer })
          }
          // Not stable → an offer/answer exchange is already in flight; the
          // arriving answer re-drives state and the next ice event re-schedules.
        } catch {
          // Failed to gather; the next iceConnectionState event retries.
        }
      }

      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => {
          if (inbound.getTracks().includes(t)) return
          inbound.addTrack(t)
          // A track the peer stops sending must clear the tile again.
          if (t.kind === 'video') t.addEventListener('ended', syncRemoteVideo)
        })
        bind(remoteVideoRef.current, inbound)
        syncRemoteVideo()
        if (!cancelled) setPhase('connected')
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: 'ice', from: selfId!, candidate: e.candidate.toJSON() })
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (cancelled || endedRef.current || remoteLeft) return
        const st = pc.iceConnectionState
        if (st === 'connected' || st === 'completed') {
          clearRestartTimer()
          restartAttempts = 0
          if (!cancelled) setPhase('connected')
        } else if (st === 'disconnected') {
          if (!restartTimer && restartAttempts < MAX_RESTART_ATTEMPTS) {
            if (!cancelled) setPhase('connecting')
            restartTimer = setTimeout(() => void doRestart(), RESTART_GRACE_MS)
          }
        } else if (st === 'failed') {
          clearRestartTimer()
          void doRestart()
        }
      }

      pc.onconnectionstatechange = () => {
        if (cancelled || endedRef.current) return
        const s = pc.connectionState
        if (s === 'connected') setPhase('connected')
        else if (s === 'connecting') setPhase('connecting')
        // While an ICE restart is pending, the ice handler owns recovery — don't
        // paint "waiting" over it. This only clears a stale `connected` badge.
        else if (
          (s === 'failed' || s === 'disconnected') &&
          restartAttempts === 0 &&
          !restartTimer
        ) {
          setPhase('waiting')
        }
      }

      // 3. Signaling channel.
      const channel = supabase.channel(`rtc:${roomId}`, {
        config: { broadcast: { self: false } },
      })
      channelRef.current = channel

      // Only the larger id initiates, so we never both offer at once.
      //
      // Guarded so a repeated greeting cannot stack offers. Without these
      // checks every `hello` produced another createOffer/setLocalDescription,
      // so answers came back against an already-replaced local description and
      // were dropped, and the constant renegotiation kept resetting `phase` to
      // "connecting" — audio flowed but the video tiles stayed behind the
      // "Connecting…" placeholder forever.
      //
      // `fresh` marks a genuine (re)join: the peer has a brand-new
      // RTCPeerConnection, so an established call must be renegotiated with new
      // ICE credentials rather than left on its dead candidate pairs.
      const makeOffer = async (peerId: string, fresh = false) => {
        if (selfId! < peerId) return
        if (makingOffer.current) return
        if (pc.signalingState !== 'stable') return
        const live =
          pc.iceConnectionState === 'connected' ||
          pc.iceConnectionState === 'completed'
        if (live && !fresh) return
        try {
          makingOffer.current = true
          const offer = await pc.createOffer(live ? { iceRestart: true } : {})
          await pc.setLocalDescription(offer)
          send({ type: 'offer', from: selfId!, sdp: offer })
          if (!cancelled) {
            setPhase((p) => (p === 'connected' ? p : 'connecting'))
          }
        } catch {
          // Gathering failed; the peer's next greeting retries.
        } finally {
          makingOffer.current = false
        }
      }

      /** Tell the peer our current mic/camera state so their badges start right. */
      const announceState = () => {
        void channel.send({
          type: 'broadcast',
          event: 'state',
          payload: {
            from: selfId!,
            micOn: stream.getAudioTracks().some((t) => t.enabled),
            camOn: stream.getVideoTracks().some((t) => t.enabled),
          },
        })
      }

      const drainIce = async () => {
        const queued = pendingIce.current
        pendingIce.current = []
        for (const c of queued) {
          try {
            await pc.addIceCandidate(c)
          } catch {
            // A stale candidate is not fatal.
          }
        }
      }

      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const msg = payload as SignalPayload
        if (!msg || msg.from === selfId) return
        remoteIdRef.current = msg.from

        try {
          switch (msg.type) {
            case 'hello':
              // Peer (re)joined with a fresh peer connection. Reply once with an
              // *ack* — answering `hello` with `hello` made both sides greet
              // each other endlessly. Also clear any give-up state so a
              // refreshed peer can reconnect.
              remoteLeft = false
              restartAttempts = 0
              clearRestartTimer()
              send({ type: 'hello-ack', from: selfId! })
              announceState()
              await makeOffer(msg.from, true)
              break

            case 'hello-ack':
              // Our greeting was heard, so the peer was already in the room.
              // Terminal message — never replied to, which is what bounds the
              // handshake at two hops.
              remoteLeft = false
              announceState()
              await makeOffer(msg.from)
              break

            case 'offer': {
              // Glare guard: if we're mid-offer and we're the polite side, roll back.
              if (pc.signalingState !== 'stable' && !makingOffer.current) return
              if (pc.signalingState !== 'stable') {
                await pc.setLocalDescription({ type: 'rollback' })
              }
              await pc.setRemoteDescription(msg.sdp)
              await drainIce()
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              send({ type: 'answer', from: selfId!, sdp: answer })
              // Don't downgrade a call that is already up — renegotiating is not
              // a reason to hide a working feed.
              if (!cancelled) {
                setPhase((p) => (p === 'connected' ? p : 'connecting'))
              }
              break
            }

            case 'answer':
              if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(msg.sdp)
                await drainIce()
              }
              break

            case 'ice':
              if (pc.remoteDescription) {
                await pc.addIceCandidate(msg.candidate).catch(() => {})
              } else {
                pendingIce.current.push(msg.candidate)
              }
              break

            case 'bye':
              remoteLeft = true
              clearRestartTimer()
              inbound.getTracks().forEach((t) => inbound.removeTrack(t))
              if (!cancelled) {
                setPhase('waiting')
                setRemoteVideoLive(false)
                setRemoteCamOff(false)
                setRemoteMuted(false)
              }
              break
          }
        } catch {
          // Signaling races are recoverable; the next message re-drives state.
        }
      })

      // Mirror mute/camera state to the other tile's badges.
      channel.on('broadcast', { event: 'state' }, ({ payload }) => {
        const p = payload as { from: string; micOn: boolean; camOn: boolean }
        if (!p || p.from === selfId) return
        setRemoteMuted(!p.micOn)
        setRemoteCamOff(!p.camOn)
      })

      channel.subscribe((status) => {
        if (status !== 'SUBSCRIBED' || cancelled) return
        setPhase((p) => (p === 'connected' ? p : 'waiting'))
        send({ type: 'hello', from: selfId! })
      })
    }

    void start()

    return () => {
      cancelled = true
      endedRef.current = true
      clearRestartTimer()
      remoteIdRef.current = null
      makingOffer.current = false
      setRemoteVideoLive(false)
      if (channelRef.current) {
        send({ type: 'bye', from: selfId })
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      pcRef.current?.getSenders().forEach((s) => s.track?.stop())
      pcRef.current?.close()
      pcRef.current = null
      localStream.current?.getTracks().forEach((t) => t.stop())
      localStream.current = null
      remoteStream.current = null
      cameraTrack.current = null
      pendingIce.current = []
    }
  }, [roomId, selfId, bind, send])

  // ---- Controls ------------------------------------------------------------
  const broadcastState = useCallback(
    (nextMic: boolean, nextCam: boolean) => {
      if (!selfId) return
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'state',
        payload: { from: selfId, micOn: nextMic, camOn: nextCam },
      })
    },
    [selfId],
  )

  const toggleMic = useCallback(() => {
    const tracks = localStream.current?.getAudioTracks() ?? []
    if (!tracks.length) return
    const next = !tracks[0].enabled
    tracks.forEach((t) => {
      t.enabled = next
    })
    setMicOn(next)
    broadcastState(next, camOn)
  }, [broadcastState, camOn])

  const toggleCam = useCallback(() => {
    const tracks = localStream.current?.getVideoTracks() ?? []
    if (!tracks.length) return
    const next = !tracks[0].enabled
    tracks.forEach((t) => {
      t.enabled = next
    })
    setCamOn(next)
    broadcastState(micOn, next)
  }, [broadcastState, micOn])

  /** Swap the outgoing video track between camera and display capture. */
  const toggleShare = useCallback(async () => {
    const pc = pcRef.current
    const sender = pc?.getSenders().find((s) => s.track?.kind === 'video')
    if (!pc || !sender) return

    if (sharing) {
      const cam = cameraTrack.current
      if (cam) {
        await sender.replaceTrack(cam)
        localStream.current
          ?.getVideoTracks()
          .filter((t) => t !== cam)
          .forEach((t) => t.stop())
        bind(localVideoRef.current, localStream.current)
      }
      setSharing(false)
      return
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })
      const screenTrack = display.getVideoTracks()[0]
      if (!screenTrack) return
      await sender.replaceTrack(screenTrack)
      setSharing(true)
      // Stopping from the browser's own "Stop sharing" chip restores the camera.
      screenTrack.onended = () => {
        const cam = cameraTrack.current
        if (cam) void sender.replaceTrack(cam)
        setSharing(false)
        bind(localVideoRef.current, localStream.current)
      }
    } catch {
      // User dismissed the picker.
    }
  }, [sharing, bind])

  /** Tear down media immediately (used when the session is ended). */
  const stopAll = useCallback(() => {
    endedRef.current = true
    if (selfId) send({ type: 'bye', from: selfId })
    pcRef.current?.close()
    pcRef.current = null
    localStream.current?.getTracks().forEach((t) => t.stop())
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setRemoteVideoLive(false)
    setPhase('ended')
  }, [selfId, send])

  return {
    phase,
    mediaError,
    micOn,
    camOn,
    sharing,
    remoteMuted,
    remoteCamOff,
    remoteVideoLive,
    setLocalVideoEl,
    setRemoteVideoEl,
    toggleMic,
    toggleCam,
    toggleShare,
    stopAll,
  }
}
