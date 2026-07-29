import { getFrontendLocale } from '@/lib/defaultAppLocale'

/** Add the interface locale to content endpoints that support translations. */
export function withFrontendLocale(path: string): string {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}locale=${encodeURIComponent(getFrontendLocale())}`
}
