import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './RootLayout'
import { RootRedirect } from './routes/RootRedirect'
import { BibleRoute } from './routes/BibleRoute'
import { StudyRoute } from './routes/StudyRoute'
import { ResetPasswordRoute } from './routes/ResetPasswordRoute'
import { GoogleFinishRoute } from './routes/GoogleFinishRoute'
import { NotFound } from './routes/NotFound'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <RootRedirect /> },

      // Bible (no locale prefix — defaults to current locale)
      { path: 'bible/:book', element: <BibleRoute /> },
      { path: 'bible/:book/:chapter', element: <BibleRoute /> },
      { path: 'bible/:book/:chapter/:verse', element: <BibleRoute /> },

      // Bible (localized — :lang must be a known app locale or this 404s)
      { path: ':lang/bible/:book', element: <BibleRoute /> },
      { path: ':lang/bible/:book/:chapter', element: <BibleRoute /> },
      { path: ':lang/bible/:book/:chapter/:verse', element: <BibleRoute /> },

      // Study sessions: owner (no token), guest (with token)
      { path: 'study/:sessionId', element: <StudyRoute /> },
      { path: 'study/:sessionId/:shareToken', element: <StudyRoute /> },

      // Email reset-password deep link (legacy params supported in handler)
      { path: 'auth/reset-password', element: <ResetPasswordRoute /> },

      // Google OAuth callback landing — backend redirects here with #token=...
      { path: 'auth/google/finish', element: <GoogleFinishRoute /> },

      // Catch-all
      { path: '*', element: <NotFound /> },
    ],
  },
])
