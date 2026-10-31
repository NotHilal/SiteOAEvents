import { useState } from 'react'
import Link from 'next/link'
import Lightbox from 'yet-another-react-lightbox'
import Seo from '../../src/components/Seo.jsx'
import { getRealisations } from '../../src/lib/realisations-server.js'
import { SITE_URL } from '../../src/lib/site.js'

export async function getServerSideProps({ params }) {
  const item = (await getRealisations()).find(item => item.slug === params.slug)
  return item ? { props: { item } } : { notFound: true }
}

export default function Realisation({ item }) {
  const [index, setIndex] = useState(-1)
  const photos = [{ src: item.cover, caption: item.title }, ...item.media.filter(m => m.type === 'image')]
  let photoIndex = 0
  return <>
    <Seo title={item.title} description={item.summary} image={`${SITE_URL}${item.cover}`} path={`/nos-realisations/${item.slug}`} breadcrumb={[{ name: 'Nos réalisations', path: '/nos-realisations' }, { name: item.title, path: `/nos-realisations/${item.slug}` }]} />
    <div className="site-wrap"><article className="oa-section"><div className="oa-container">
      <Link href="/nos-realisations" className="oa-univers-link">← Toutes nos réalisations</Link>
      <header className="realisations-heading"><h1>{item.title}</h1><p>{item.summary}</p></header>
      <button type="button" className="realisation-cover" onClick={() => setIndex(0)} aria-label="Agrandir la photo de couverture"><img src={item.cover} alt={item.title} fetchPriority="high" /></button>
      <div className="realisation-body">{item.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>
      {item.media.length > 0 && <section aria-label="Photos et vidéos" className="realisation-media">{item.media.map((media, i) => {
        const currentIndex = media.type === 'image' ? ++photoIndex : -1
        return <figure key={i}>{media.type === 'video'
          ? <video controls playsInline preload="metadata" src={media.src} aria-label={media.caption || `Vidéo de ${item.title}`}>Votre navigateur ne peut pas lire cette vidéo. <a href={media.src}>Télécharger la vidéo</a></video>
          : <button type="button" onClick={() => setIndex(currentIndex)} aria-label={`Agrandir : ${media.caption || `photo ${currentIndex}`}`}><img src={media.src} alt={media.caption || `${item.title} — photo ${currentIndex}`} loading="lazy" /></button>}
          {media.caption && <figcaption>{media.caption}</figcaption>}
        </figure>
      })}</section>}
      <Link href="/contact" className="oa-univers-link">Parlons de votre événement <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
    </div></article></div>
    <Lightbox open={index >= 0} close={() => setIndex(-1)} index={Math.max(0, index)} slides={photos.map(p => ({ src: p.src, alt: p.caption }))} labels={{ Close: 'Fermer', Previous: 'Photo précédente', Next: 'Photo suivante' }} />
  </>
}
