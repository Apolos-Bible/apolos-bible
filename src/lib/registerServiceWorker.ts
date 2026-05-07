export function registerServiceWorker(onUpdate: (reload: () => void) => void) {
  if (!('serviceWorker' in navigator)) return

  function triggerUpdate(worker: ServiceWorker) {
    onUpdate(() => {
      worker.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    })
  }

  function trackInstalling(registration: ServiceWorkerRegistration) {
    const installing = registration.installing
    if (!installing) return

    if (installing.state === 'installed' && navigator.serviceWorker.controller) {
      triggerUpdate(installing)
      return
    }

    installing.addEventListener('statechange', () => {
      if (
        installing.state === 'installed' &&
        navigator.serviceWorker.controller
      ) {
        triggerUpdate(installing)
      }
    })
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      if (registration.waiting) {
        triggerUpdate(registration.waiting)
        return
      }

      if (registration.installing) {
        trackInstalling(registration)
      }

      registration.addEventListener('updatefound', () => {
        trackInstalling(registration)
      })
    } catch {
      // SW registration failed — app works without offline support
    }
  })
}
