import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { selectDocumentLocale } from '@/lib/defaultAppLocale'
import { useUIStore } from '@/lib/store/useUIStore'

const SITE_URL = 'https://apolos.bible'

export function RouteIndexing() {
  const { pathname } = useLocation()
  const locale = useUIStore((state) => state.locale)
  const isBible = pathname.startsWith('/bible/') || pathname.startsWith('/es/bible/')
  const isHome = pathname === '/'
  const indexable = isHome || isBible
  const documentLocale = selectDocumentLocale(pathname, locale, navigator.language)

  return (
    <Helmet>
      <html lang={documentLocale} />
      <meta name="robots" content={indexable ? 'index, follow' : 'noindex, nofollow'} />
      <meta name="googlebot" content={indexable ? 'index, follow' : 'noindex, nofollow'} />
      {!isBible && <link rel="canonical" href={`${SITE_URL}${pathname}`} />}
    </Helmet>
  )
}
