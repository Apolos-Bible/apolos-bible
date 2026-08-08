import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { RootRedirect } from './routes/RootRedirect'
import { NotFound, RouteErrorPage } from './routes/NotFound'
import { workspaceRoutes } from './workspaceRoutes'

export const router = createBrowserRouter([
  {
    id: 'root',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <RootRedirect /> },
      ...workspaceRoutes.filter((route) => route.path !== '*'),

      // Study sessions: owner (no token), guest (with token)
      { path: 'study/:sessionId', lazy: async () => ({ Component: (await import('./routes/StudyRoute')).StudyRoute }) },
      { path: 'study/:sessionId/:shareToken', lazy: async () => ({ Component: (await import('./routes/StudyRoute')).StudyRoute }) },

      // Email reset-password deep link (legacy params supported in handler)
      { path: 'auth/reset-password', lazy: async () => ({ Component: (await import('./routes/ResetPasswordRoute')).ResetPasswordRoute }) },

      // Google OAuth callback landing — backend redirects here with #token=...
      { path: 'auth/google/finish', lazy: async () => ({ Component: (await import('./routes/GoogleFinishRoute')).GoogleFinishRoute }) },
      { path: 'auth/youversion/finish', lazy: async () => ({ Component: (await import('./routes/YouVersionFinishRoute')).YouVersionFinishRoute }) },

      // Desktop/mobile OAuth bridge: https page that hands the token back
      // to the installed Tauri app via a user-initiated `tulia://` link.
      { path: 'auth/bridge', lazy: async () => ({ Component: (await import('./routes/AuthBridgeRoute')).AuthBridgeRoute }) },

      // Catch-all
      { path: '*', element: <NotFound /> },
    ],
  },
])
