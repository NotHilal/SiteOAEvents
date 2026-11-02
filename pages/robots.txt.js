import { SITE_URL } from '../src/lib/site.js'

// Crawling rules. Note: robots.txt is NOT access control — /espace-oa and
// the API are protected by authentication, this only keeps them out of
// search engines' crawl. Account and tracking pages are NOT disallowed:
// they carry a noindex tag, which crawlers only see if they may fetch them.
function buildRobots() {
  return `User-agent: *
Allow: /
Disallow: /espace-oa
Disallow: /admin
Disallow: /api/
Disallow: /example

Sitemap: ${SITE_URL}/sitemap.xml
`
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  res.write(buildRobots())
  res.end()
  return { props: {} }
}

export default function Robots() {
  return null
}
