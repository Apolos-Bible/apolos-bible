import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

const SITE_URL = 'https://apolos.bible'

export function RouteIndexing() {
  const { pathname } = useLocation()
  const isBible = pathname.startsWith('/bible/') || pathname.startsWith('/es/bible/')
  const isHome = pathname === '/'
  const indexable = isHome || isBible

  return (
    <Helmet>
      <html lang={pathname.startsWith('/es/') ? 'es' : 'en'} />
      <meta name="robots" content={indexable ? 'index, follow' : 'noindex, nofollow'} />
      <meta name="googlebot" content={indexable ? 'index, follow' : 'noindex, nofollow'} />
      {!isBible && <link rel="canonical" href={`${SITE_URL}${pathname}`} />}
    </Helmet>
  )
}
