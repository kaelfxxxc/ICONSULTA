import { useEffect, useState } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

function isAppleMobile() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const alreadyInstalled = isStandalone()
    setInstalled(alreadyInstalled)
    if (!alreadyInstalled) setHelpOpen(true)
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallPrompt(null)
      setHelpOpen(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  async function install() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      setHelpOpen(false)
    } else {
      // The browser may offer installation again on the next visit.
      setHelpOpen(false)
    }
    setInstallPrompt(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-2 text-xs font-semibold text-brand-800 hover:bg-brand-100 sm:px-3 sm:text-sm"
      >
        Install app
      </button>
      {helpOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center" onClick={() => setHelpOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="install-app-title" className="font-bold text-slate-900">Install ICONSULTA</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isAppleMobile()
                    ? 'In Safari, tap Share, then Add to Home Screen.'
                    : installPrompt
                      ? 'Add ICONSULTA to your home screen for quick access.'
                      : 'Open your browser menu and choose Install app or Add to Home screen.'}
                </p>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Close install instructions">✕</button>
            </div>
            {installPrompt ? (
              <button type="button" onClick={() => void install()} className="mt-4 w-full rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">Install ICONSULTA</button>
            ) : (
              <button type="button" onClick={() => setHelpOpen(false)} className="mt-4 w-full rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">Got it</button>
            )}
          </section>
        </div>
      )}
    </>
  )
}
