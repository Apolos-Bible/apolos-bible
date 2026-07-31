import type { RouteObject } from 'react-router-dom'
import { BibleRoute } from './routes/BibleRoute'
import { ConversationRoute } from './routes/ConversationRoute'
import { MarketplacePathRoute } from './routes/MarketplacePathRoute'
import { MarketplaceRoute } from './routes/MarketplaceRoute'
import { MyPathsRoute } from './routes/MyPathsRoute'
import { NotFound } from './routes/NotFound'
import { PathEditorRoute } from './routes/PathEditorRoute'
import { ProfileRoute } from './routes/ProfileRoute'
import { SettingsRoute } from './routes/SettingsRoute'
import { GamesRoute } from './routes/GamesRoute'
import { GameRoomRoute } from './routes/GameRoomRoute'

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
  { path: 'perfil', element: <ProfileRoute mode="self" /> },
  { path: 'u/:userId', element: <ProfileRoute mode="other" /> },
  { path: 'chat/:conversationId', element: <ConversationRoute /> },
  { path: 'ajustes', element: <SettingsRoute /> },
  { path: 'marketplace', element: <MarketplaceRoute /> },
  { path: 'marketplace/:slug', element: <MarketplacePathRoute /> },
  { path: 'juegos', element: <GamesRoute /> },
  { path: 'juegos/:roomId', element: <GameRoomRoute /> },
  { path: 'mis-rutas', element: <MyPathsRoute /> },
  { path: 'mis-rutas/:slug', element: <PathEditorRoute /> },
  { path: 'mis-rutas/:slug/:studySlug', element: <PathEditorRoute /> },
  { path: '*', element: <NotFound /> },
]
