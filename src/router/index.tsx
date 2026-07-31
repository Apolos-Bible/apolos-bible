import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { RootRedirect } from './routes/RootRedirect'
import { StudyRoute } from './routes/StudyRoute'
import { ResetPasswordRoute } from './routes/ResetPasswordRoute'
import { GoogleFinishRoute } from './routes/GoogleFinishRoute'
import { YouVersionFinishRoute } from './routes/YouVersionFinishRoute'
import { AuthBridgeRoute } from './routes/AuthBridgeRoute'
import { NotFound } from './routes/NotFound'
import { workspaceRoutes } from './workspaceRoutes'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <RootRedirect /> },
      ...workspaceRoutes.filter((route) => route.path !== '*'),

      // Study sessions: owner (no token), guest (with token)
      { path: 'study/:sessionId', element: <StudyRoute /> },
      { path: 'study/:sessionId/:shareToken', element: <StudyRoute /> },

      // Email reset-password deep link (legacy params supported in handler)
      { path: 'auth/reset-password', element: <ResetPasswordRoute /> },

      // Google OAuth callback landing — backend redirects here with #token=...
      { path: 'auth/google/finish', element: <GoogleFinishRoute /> },
      { path: 'auth/youversion/finish', element: <YouVersionFinishRoute /> },

      // Desktop/mobile OAuth bridge: https page that hands the token back
      // to the installed Tauri app via a user-initiated `tulia://` link.
      { path: 'auth/bridge', element: <AuthBridgeRoute /> },

      // Catch-all
      { path: '*', element: <NotFound /> },
    ],
  },
])
