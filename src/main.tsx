import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { router } from './router'
import './app/globals.css'
import './lib/i18n'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </React.StrictMode>
)
