import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Phase = 'idle' | 'requesting-media' | 'waiting' | 'connecting' | 'connected' | 'ended'
export type MediaErrorKind = 'denied' | 'not-found' | 'in-use' | 'insecure-context' | 'unsupported' | 'unknown'
export interface MediaError { kind: MediaErrorKind; message: string }
export interface CallParticipant { id: string; name: string; stream: MediaStream; micOn: boolean; camOff: boolean }

type Signal =
  | { type: 'hello' | 'hello-ack' | 'bye'; from: string; to: string }
  | { type: 'offer' | 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit }
type ParticipantState = { from: string; to: string; micOn: boolean; camOn: boolean }
type Peer = { pc: RTCPeerConnection; stream: MediaStream; name: string; micOn: boolean; camOff: boolean; makingOffer: boolean; pendingIce: RTCIceCandidateInit[] }

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

function describeMediaError(err: unknown): MediaError {
  if (!window.isSecureContext) return { kind: 'insecure-context', message: 'Camera and microphone need a secure context. Open the app over HTTPS or localhost.' }
  if (!navigator.mediaDevices?.getUserMedia) return { kind: 'unsupported', message: 'This browser does not support camera and microphone access.' }
  const name = err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return { kind: 'denied', message: 'Camera and microphone are blocked. Allow access in your browser settings, then rejoin.' }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return { kind: 'not-found', message: 'No camera or microphone was found on this device.' }
  if (name === 'NotReadableError' || name === 'AbortError') return { kind: 'in-use', message: 'Your camera or microphone is already in use by another app.' }
  return { kind: 'unknown', message: err instanceof Error ? err.message : 'Could not start your camera.' }
}

/** Mesh WebRTC room: one targeted peer connection per other attendee. */
export function useWebRTC(roomId: string | undefined, selfId: string | undefined, selfName = 'Guest') {
  const [phase, setPhase] = useState<Phase>('idle')
  const [mediaError, setMediaError] = useState<MediaError | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [participants, setParticipants] = useState<CallParticipant[]>([])
  const localStream = useRef<MediaStream | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const peers = useRef(new Map<string, Peer>())
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRefs = useRef(new Map<string, HTMLVideoElement>())
  const cameraTrack = useRef<MediaStreamTrack | null>(null)
  const ended = useRef(false)

  const bindVideo = useCallback((el: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!el || !stream) return
    if (el.srcObject !== stream) el.srcObject = stream
    if (el.paused) void el.play().catch(() => {})
  }, [])

  const setLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el
    bindVideo(el, localStream.current)
  }, [bindVideo])

  const setRemoteVideoEl = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideoRefs.current.set(id, el)
      bindVideo(el, peers.current.get(id)?.stream ?? null)
    } else remoteVideoRefs.current.delete(id)
  }, [bindVideo])

  const sendSignal = useCallback((msg: Signal) => {
    void channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: msg })
  }, [])

  const publishParticipants = useCallback(() => {
    setParticipants(Array.from(peers.current.entries()).map(([id, peer]) => ({
      id, name: peer.name, stream: peer.stream, micOn: peer.micOn, camOff: peer.camOff,
    })))
    const anyConnected = Array.from(peers.current.values()).some((p) => p.pc.connectionState === 'connected')
    setPhase(anyConnected ? 'connected' : peers.current.size ? 'connecting' : 'waiting')
  }, [])

  useEffect(() => {
    if (!roomId || !selfId) return
    let cancelled = false
    ended.current = false
    let stream: MediaStream

    const updateParticipant = (id: string, update: Partial<Peer>) => {
      const peer = peers.current.get(id)
      if (!peer) return
      Object.assign(peer, update)
      publishParticipants()
    }

    const createPeer = (id: string, name = 'Guest') => {
      const existing = peers.current.get(id)
      if (existing) {
        if (name && name !== 'Guest') existing.name = name
        return existing
      }
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      const remote = new MediaStream()
      const peer: Peer = { pc, stream: remote, name, micOn: true, camOff: false, makingOffer: false, pendingIce: [] }
      peers.current.set(id, peer)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      pc.ontrack = (event) => {
        const incoming = event.streams[0]?.getTracks() ?? [event.track]
        for (const track of incoming) if (!remote.getTracks().some((t) => t.id === track.id)) remote.addTrack(track)
        bindVideo(remoteVideoRefs.current.get(id) ?? null, remote)
        event.track.addEventListener('ended', publishParticipants)
        publishParticipants()
      }
      pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal({ type: 'ice', from: selfId, to: id, candidate: event.candidate.toJSON() })
      }
      pc.onconnectionstatechange = publishParticipants
      pc.oniceconnectionstatechange = publishParticipants
      publishParticipants()
      return peer
    }

    const makeOffer = async (id: string) => {
      const peer = peers.current.get(id)
      if (!peer || selfId.localeCompare(id) < 0 || peer.makingOffer || peer.pc.signalingState !== 'stable') return
      try {
        peer.makingOffer = true
        const offer = await peer.pc.createOffer()
        await peer.pc.setLocalDescription(offer)
        sendSignal({ type: 'offer', from: selfId, to: id, sdp: offer })
      } catch { /* peer can retry after the next hello */ }
      finally { peer.makingOffer = false }
    }

    const joinPeer = (id: string, name = 'Guest') => {
      if (!id || id === selfId) return
      createPeer(id, name)
      sendSignal({ type: 'hello', from: selfId, to: id })
    }

    async function start() {
      setPhase('requesting-media')
      setMediaError(null)
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true },
        })
      } catch (err) {
        if (cancelled) return
        setMediaError(describeMediaError(err))
        stream = new MediaStream()
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
      localStream.current = stream
      cameraTrack.current = stream.getVideoTracks()[0] ?? null
      setMicOn(stream.getAudioTracks().some((t) => t.enabled))
      setCamOn(stream.getVideoTracks().some((t) => t.enabled))
      bindVideo(localVideoRef.current, stream)

      const channel = supabase.channel(`rtc:${roomId}`, {
        config: { broadcast: { self: false }, presence: { key: selfId } },
      })
      channelRef.current = channel
      channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        const msg = payload as Signal
        if (!msg || msg.to !== selfId || msg.from === selfId) return
        try {
          if (msg.type === 'hello') {
            const state = channel.presenceState() as Record<string, Array<{ name?: string }>>
            const name = state[msg.from]?.[0]?.name ?? 'Guest'
            createPeer(msg.from, name)
            sendSignal({ type: 'hello-ack', from: selfId, to: msg.from })
            await makeOffer(msg.from)
          } else if (msg.type === 'hello-ack') {
            createPeer(msg.from)
            await makeOffer(msg.from)
          } else if (msg.type === 'offer' || msg.type === 'answer') {
            const peer = createPeer(msg.from)
            if (msg.type === 'offer') {
              if (peer.pc.signalingState !== 'stable' && !peer.makingOffer) await peer.pc.setLocalDescription({ type: 'rollback' })
              await peer.pc.setRemoteDescription(msg.sdp)
              for (const candidate of peer.pendingIce.splice(0)) await peer.pc.addIceCandidate(candidate).catch(() => {})
              const answer = await peer.pc.createAnswer()
              await peer.pc.setLocalDescription(answer)
              sendSignal({ type: 'answer', from: selfId, to: msg.from, sdp: answer })
            } else if (peer.pc.signalingState === 'have-local-offer') {
              await peer.pc.setRemoteDescription(msg.sdp)
              for (const candidate of peer.pendingIce.splice(0)) await peer.pc.addIceCandidate(candidate).catch(() => {})
            }
          } else if (msg.type === 'ice') {
            const peer = createPeer(msg.from)
            if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(msg.candidate).catch(() => {})
            else peer.pendingIce.push(msg.candidate)
          } else if (msg.type === 'bye') {
            peers.current.get(msg.from)?.pc.close()
            peers.current.delete(msg.from)
            publishParticipants()
          }
        } catch { /* subsequent targeted signaling can recover a transient race */ }
      })
      channel.on('broadcast', { event: 'state' }, ({ payload }) => {
        const state = payload as ParticipantState
        if (state.to !== selfId) return
        updateParticipant(state.from, { micOn: state.micOn, camOff: !state.camOn })
      })
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{ name?: string }>>
        for (const [id, metas] of Object.entries(state)) if (id !== selfId) joinPeer(id, metas[0]?.name ?? 'Guest')
      })
      channel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED' || cancelled) return
        await channel.track({ name: selfName })
        setPhase('waiting')
      })
    }
    void start()

    return () => {
      cancelled = true
      ended.current = true
      for (const id of peers.current.keys()) sendSignal({ type: 'bye', from: selfId, to: id })
      peers.current.forEach((peer) => peer.pc.close())
      peers.current.clear()
      setParticipants([])
      if (channelRef.current) void supabase.removeChannel(channelRef.current)
      channelRef.current = null
      localStream.current?.getTracks().forEach((track) => track.stop())
      localStream.current = null
      if (localVideoRef.current) localVideoRef.current.srcObject = null
    }
  }, [roomId, selfId, selfName, bindVideo, publishParticipants, sendSignal])

  const broadcastState = useCallback((nextMic: boolean, nextCam: boolean) => {
    for (const id of peers.current.keys()) void channelRef.current?.send({
      type: 'broadcast', event: 'state', payload: { from: selfId, to: id, micOn: nextMic, camOn: nextCam },
    })
  }, [selfId])

  const toggleMic = useCallback(() => {
    const tracks = localStream.current?.getAudioTracks() ?? []
    if (!tracks.length) return
    const next = !tracks[0].enabled
    tracks.forEach((track) => { track.enabled = next })
    setMicOn(next)
    broadcastState(next, camOn)
  }, [broadcastState, camOn])

  const toggleCam = useCallback(() => {
    const tracks = localStream.current?.getVideoTracks() ?? []
    if (!tracks.length) return
    const next = !tracks[0].enabled
    tracks.forEach((track) => { track.enabled = next })
    setCamOn(next)
    broadcastState(micOn, next)
  }, [broadcastState, micOn])

  const toggleShare = useCallback(async () => {
    const senders = Array.from(peers.current.values()).flatMap((peer) => peer.pc.getSenders().filter((s) => s.track?.kind === 'video'))
    if (sharing) {
      const camera = cameraTrack.current
      if (camera) await Promise.all(senders.map((sender) => sender.replaceTrack(camera)))
      setSharing(false)
      return
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screen = display.getVideoTracks()[0]
      if (!screen) return
      await Promise.all(senders.map((sender) => sender.replaceTrack(screen)))
      setSharing(true)
      screen.onended = () => {
        const camera = cameraTrack.current
        if (camera) void Promise.all(senders.map((sender) => sender.replaceTrack(camera)))
        setSharing(false)
      }
    } catch { /* user dismissed capture picker */ }
  }, [sharing])

  const stopAll = useCallback(() => {
    ended.current = true
    if (selfId) for (const id of peers.current.keys()) sendSignal({ type: 'bye', from: selfId, to: id })
    peers.current.forEach((peer) => peer.pc.close())
    peers.current.clear()
    localStream.current?.getTracks().forEach((track) => track.stop())
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    setParticipants([])
    setPhase('ended')
  }, [selfId, sendSignal])

  const remoteVideoLive = participants.some((p) => p.stream.getVideoTracks().some((track) => track.readyState === 'live'))
  const first = participants[0]
  return {
    phase, mediaError, micOn, camOn, sharing, participants,
    remoteMuted: first ? !first.micOn : false,
    remoteCamOff: first?.camOff ?? false,
    remoteVideoLive,
    setLocalVideoEl,
    setRemoteVideoEl,
    toggleMic, toggleCam, toggleShare, stopAll,
  }
}
