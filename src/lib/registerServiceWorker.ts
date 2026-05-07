export function registerServiceWorker(onUpdate: (reload: () => void) => void) {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            onUpdate(() => {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload()
              })
            })
          }
        })
      })
    } catch {
      // SW registration failed — app works without offline support
    }
  })
}
