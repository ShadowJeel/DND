import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/admin/', '/api/'], // Exclude admin dashboard and API routes from crawling
    },
    sitemap: 'https://dndpurchase.com/sitemap.xml',
  }
}
