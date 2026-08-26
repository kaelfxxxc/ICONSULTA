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

  /** Attach a stream to a <video>, tolerating a ref that mounts later. */
  const bind = useCallback(
    (el: HTMLVideoElement | null, stream: MediaStream | null) => {
      if (el && stream && el.srcObject !== stream) {
        el.srcObject = stream
        // Autoplay can reject until a gesture; the UI still shows the tile.
        void el.play().catch(() => {})
      }
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

      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => {
          if (!inbound.getTracks().includes(t)) inbound.addTrack(t)
        })
        bind(remoteVideoRef.current, inbound)
        if (!cancelled) setPhase('connected')
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: 'ice', from: selfId!, candidate: e.candidate.toJSON() })
        }
      }

      pc.onconnectionstatechange = () => {
        if (cancelled || endedRef.current) return
        const s = pc.connectionState
        if (s === 'connected') setPhase('connected')
        else if (s === 'connecting') setPhase('connecting')
        else if (s === 'failed' || s === 'disconnected') setPhase('waiting')
      }

      // 3. Signaling channel.
      const channel = supabase.channel(`rtc:${roomId}`, {
        config: { broadcast: { self: false } },
      })
      channelRef.current = channel

      // Only the larger id initiates, so we never both offer at once.
      const makeOffer = async (peerId: string) => {
        if (selfId! < peerId) return
        try {
          makingOffer.current = true
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          send({ type: 'offer', from: selfId!, sdp: offer })
          if (!cancelled) setPhase('connecting')
        } finally {
          makingOffer.current = false
        }
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

        try {
          switch (msg.type) {
            case 'hello':
              // Peer just joined — announce back so both learn of each other.
              send({ type: 'hello', from: selfId! })
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
              if (!cancelled) setPhase('connecting')
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
              inbound.getTracks().forEach((t) => inbound.removeTrack(t))
              if (!cancelled) {
                setPhase('waiting')
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
    setLocalVideoEl,
    setRemoteVideoEl,
    toggleMic,
    toggleCam,
    toggleShare,
    stopAll,
  }
}
