export type ResolvedAppTheme = 'light' | 'dark'

export const SYSTEM_BAR_COLORS: Record<ResolvedAppTheme, string> = {
  light: '#ffffff',
  dark: '#151922',
}

export function applySystemBarTheme(theme: ResolvedAppTheme) {
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', SYSTEM_BAR_COLORS[theme])
  document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default')
}
