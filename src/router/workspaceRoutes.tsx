import type { RouteObject } from 'react-router-dom'
import { lazy, Suspense, type ReactElement } from 'react'
import { BibleRoute } from './routes/BibleRoute'
import { NotFound } from './routes/NotFound'

const ConversationRoute = lazy(() => import('./routes/ConversationRoute').then((module) => ({ default: module.ConversationRoute })))
const SettingsRoute = lazy(() => import('./routes/SettingsRoute').then((module) => ({ default: module.SettingsRoute })))
const MarketplaceRoute = lazy(() => import('./routes/MarketplaceRoute').then((module) => ({ default: module.MarketplaceRoute })))
const MarketplacePathRoute = lazy(() => import('./routes/MarketplacePathRoute').then((module) => ({ default: module.MarketplacePathRoute })))
const GamesRoute = lazy(() => import('./routes/GamesRoute').then((module) => ({ default: module.GamesRoute })))
const GameRoomRoute = lazy(() => import('./routes/GameRoomRoute').then((module) => ({ default: module.GameRoomRoute })))
const MyPathsRoute = lazy(() => import('./routes/MyPathsRoute').then((module) => ({ default: module.MyPathsRoute })))
const PathEditorRoute = lazy(() => import('./routes/PathEditorRoute').then((module) => ({ default: module.PathEditorRoute })))
const ProfileRoute = lazy(() => import('./routes/ProfileRoute').then((module) => ({ default: module.ProfileRoute })))

function deferred(element: ReactElement) {
  return <Suspense fallback={<div role="status" className="p-6 text-sm text-text-muted">Loading…</div>}>{element}</Suspense>
}

/**
 * Routes that can live inside a desktop editor group. They intentionally omit
 * auth callbacks and collaborative StudyMode, which remain full-window flows.
 */
export const workspaceRoutes: RouteObject[] = [
  { path: 'bible/:book', element: <BibleRoute /> },
  { path: 'bible/:book/:chapter', element: <BibleRoute /> },
  { path: 'bible/:book/:chapter/:verse', element: <BibleRoute /> },
  { path: ':lang/bible/:book', element: <BibleRoute /> },
  { path: ':lang/bible/:book/:chapter', element: <BibleRoute /> },
  { path: ':lang/bible/:book/:chapter/:verse', element: <BibleRoute /> },
  { path: 'perfil', element: deferred(<ProfileRoute mode="self" />) },
  { path: 'u/:userId', element: deferred(<ProfileRoute mode="other" />) },
  { path: 'chat/:conversationId', element: deferred(<ConversationRoute />) },
  { path: 'ajustes', element: deferred(<SettingsRoute />) },
  { path: 'marketplace', element: deferred(<MarketplaceRoute />) },
  { path: 'marketplace/:slug', element: deferred(<MarketplacePathRoute />) },
  { path: 'juegos', element: deferred(<GamesRoute />) },
  { path: 'juegos/:roomId', element: deferred(<GameRoomRoute />) },
  { path: 'mis-rutas', element: deferred(<MyPathsRoute />) },
  { path: 'mis-rutas/:slug', element: deferred(<PathEditorRoute />) },
  { path: 'mis-rutas/:slug/:studySlug', element: deferred(<PathEditorRoute />) },
  { path: '*', element: <NotFound /> },
]
