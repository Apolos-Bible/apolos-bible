import { Helmet } from 'react-helmet-async'
import { useSEOMeta } from '@/lib/hooks/useSEOMeta'
import type { Book } from '@/lib/store/useVerseStore'

export function SEOMeta() {
  const meta = useSEOMeta()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: meta.title,
    description: meta.description,
    url: meta.canonicalUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Tulia Bible',
      url: 'https://bible.tulia.study',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: meta.breadcrumbs.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    },
    ...(meta.verseText ? {
      mainEntity: {
        '@type': 'WebPageElement',
        cssSelector: '[data-verse-id]',
      },
    } : {}),
  }

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={meta.canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={meta.ogTitle} />
      <meta property="og:description" content={meta.ogDescription} />
      <meta property="og:url" content={meta.ogUrl} />
      <meta property="og:image" content={meta.ogImage} />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="Tulia Bible" />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content={meta.twitterCard} />
      <meta name="twitter:title" content={meta.ogTitle} />
      <meta name="twitter:description" content={meta.ogDescription} />
      <meta name="twitter:image" content={meta.ogImage} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  )
}
