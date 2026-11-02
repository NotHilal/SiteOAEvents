import Link from 'next/link'

// Renders the [label](/path) internal links of the SEO copy (src/lib/seo/).
export default function RichText({ text }) {
  return String(text).split(/(\[[^\]]+\]\(\/[^)]*\))/).map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\((\/[^)]*)\)$/)
    return link ? <Link key={i} href={link[2]}>{link[1]}</Link> : part
  })
}
