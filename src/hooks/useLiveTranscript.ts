import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechAlternative { transcript: string }
interface SpeechResult { isFinal: boolean; length: number; [index: number]: SpeechAlternative }
interface SpeechEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

/** Browser speech recognition provides live captions; the Gemini key stays server-side. */
export function useLiveTranscript() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const shouldListen = useRef(false)
  const finalText = useRef('')
  const interimText = useRef('')

  useEffect(() => {
    setSupported(!!getSpeechRecognition())
    return () => {
      shouldListen.current = false
      recognition.current?.abort()
    }
  }, [])

  const start = useCallback(() => {
    const Constructor = getSpeechRecognition()
    if (!Constructor) {
      setError('Live transcription is not supported by this browser.')
      return
    }
    if (shouldListen.current) return
    shouldListen.current = true
    setError(null)

    const begin = () => {
      if (!shouldListen.current) return
      const instance = new Constructor()
      const baseTranscript = finalText.current
      recognition.current = instance
      instance.continuous = true
      instance.interimResults = true
      instance.lang = navigator.language || 'en-US'
      instance.onresult = (event) => {
        let final = ''
        let pending = ''
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i]
          const words = result[0]?.transcript?.trim()
          if (!words) continue
          if (result.isFinal) final += `${words} `
          else pending += `${words} `
        }
        if (final) finalText.current = `${baseTranscript} ${final}`.trim()
        interimText.current = pending.trim()
        setTranscript(finalText.current)
        setInterim(interimText.current)
      }
      instance.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          shouldListen.current = false
          setListening(false)
          setError('Microphone access for transcription was denied. Allow it in browser settings and try again.')
        } else if (event.error && event.error !== 'no-speech' && event.error !== 'aborted') {
          setError('Transcription paused. Tap Resume to continue.')
        }
      }
      instance.onend = () => {
        if (!shouldListen.current) {
          setListening(false)
          return
        }
        window.setTimeout(() => {
          if (shouldListen.current) begin()
        }, 250)
      }
      try {
        instance.start()
        setListening(true)
      } catch {
        shouldListen.current = false
        setListening(false)
        setError('Could not start transcription. Please try again.')
      }
    }
    begin()
  }, [])

  const stop = useCallback(() => {
    shouldListen.current = false
    recognition.current?.stop()
    setListening(false)
  }, [])

  const getTranscript = useCallback(() =>
    [finalText.current, interimText.current].filter(Boolean).join(' ').trim(), [])

  return { supported, listening, transcript, interim, error, start, stop, getTranscript }
}
