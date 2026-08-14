import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { router } from './router'
import './app/globals.css'
import './lib/i18n'
import { initializeGoogleAnalytics } from './lib/analytics'

initializeGoogleAnalytics()

// When the push SW is clicked it postMessages back asking us to navigate
// to the conversation. We can't useNavigate outside the router, so we
// route through the router instance directly.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'navigate' && typeof event.data.url === 'string') {
      router.navigate(event.data.url).catch(() => {})
    }
  })
}

// On Android, MainActivity dispatches a 'tulia-navigate' CustomEvent when
// the user taps a notification (cold-start path defers it 800ms; new-intent
// path fires immediately). Same destination as the SW message above.
if (typeof window !== 'undefined') {
  window.addEventListener('tulia-navigate', (event) => {
    const url = (event as CustomEvent<{ url?: string }>).detail?.url
    if (typeof url === 'string') router.navigate(url).catch(() => {})
  })
}

const rootElement = document.getElementById('root')!

// Static Bible pages include crawlable chapter text inside #root. Once the
// application bundle loads, replace that fallback with the interactive app.
// Translation extensions mutate React-owned text nodes and can invalidate the
// DOM references React uses while reconciling conditional UI.
rootElement.setAttribute('translate', 'no')
rootElement.classList.add('notranslate')
rootElement.replaceChildren()

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </React.StrictMode>
)
