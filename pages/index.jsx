import RealisationsGrid from '../src/components/RealisationsGrid.jsx'
import { getRealisations } from '../src/lib/realisations-server.js'
import { useState } from 'react'
import Link from 'next/link'
import Seo, { WEBSITE_LD, faqLd, useLocalBusinessLd } from '../src/components/Seo.jsx'
import Faq from '../src/components/seo/Faq.jsx'
import RichText from '../src/components/seo/RichText.jsx'
import { EVENTS, GUIDES } from '../src/lib/seo/landings.js'
import { cms, Emph, useCmsContent, useCmsGlobal } from '../src/lib/cms/client.js'
import { homeFaqItems, plainText } from '../src/lib/cms/resolve.js'
import ShopCard from '../src/components/product/ShopCard.jsx'
import QuickView from '../src/components/product/QuickView.jsx'
import { catalogueCategoryHref, useCatalogueCart } from '../src/components/product/productUtils.js'
import Icon from '../src/components/Icon.jsx'
import HeroVideo from '../src/components/HeroVideo.jsx'
import { track } from '../src/lib/analytics.js'

// Icons of the reassurance strip. All texts and the banner photo are edited
// in Espace OA > Contenu des pages > Accueil (defaults: src/lib/cms/schema.js).
const ASSURANCE_ICONS = ['book', 'truck', 'users', 'headset']

const SELECTION_SIZE = 8

// Homepage selection: cards taken in turn from each category (one chair,
// one table, one tent…) so it reads as "a bit of everything we rent".
function pickSelection(cards) {
  const byCategory = {}
  for (const c of cards) (byCategory[c.category] ||= []).push(c)
  const queues = Object.values(byCategory).map(list => [...list].sort((a, b) => (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0)))
  const out = []
  while (out.length < SELECTION_SIZE && queues.some(q => q.length)) {
    for (const q of queues) if (q.length && out.length < SELECTION_SIZE) out.push(q.shift())
  }
  return out
}

export async function getServerSideProps() {
  const { getCatalogueCards } = await import('../src/lib/catalogue-cards.js')
  const { getHomeCategoryTiles } = await import('../src/lib/home-category-tiles.js')
  const { getPageContent, getPageProps } = await import('../src/lib/cms/server.js')
  const [realisations, { cards }, categories, cmsProps, cmsFaq] = await Promise.all([getRealisations(), getCatalogueCards(), getHomeCategoryTiles(), getPageProps('home'), getPageContent('faq')])
  return { props: { realisations: realisations.slice(0, 6), selection: pickSelection(cards), productCount: cards.length, categories, ...cmsProps, cmsFaq } }
}

export default function Home({ realisations, selection, productCount, categories, cms: initialContent, cmsFaq }) {
  const c = useCmsContent('home', initialContent)
  const global = useCmsGlobal()
  const businessLd = useLocalBusinessLd()
  // The home FAQ is a selection of the FAQ page's questions (one source).
  const faqItems = homeFaqItems(useCmsContent('faq', cmsFaq))
  const at = path => cms('home', path)
  // Repeat the existing five-tile mosaic for any number of CMS categories.
  const categoryRows = Array.from({ length: Math.ceil(categories.length / 5) }, (_, i) => categories.slice(i * 5, i * 5 + 5))
  const cart = useCatalogueCart()
  const [quick, setQuick] = useState(null)
  // The hero's entrance animation is pure CSS (see .hero-reveal in
  // index.css) — it starts on first paint, no JS flag needed.

  const catColors = c.categories

  const inCartOf = card => card.variants.reduce((n, v) => n + (cart[v.id] || 0), 0)

  return (
    <>
      <Seo
        title={c.seo.title}
        description={c.seo.description}
        path="/"
        jsonLd={[businessLd, WEBSITE_LD, faqItems.length ? faqLd(faqItems) : null]}
        preloadImage="/videos/oa-hero-poster.jpg"
      />

      <div className="page-wrapper">
        {/* HERO */}
        <section id="Hero-Section" className="oa-hero" aria-labelledby="oa-hero-title">
          <HeroVideo />
          <div className="oa-container oa-hero-inner">
            {c.hero.eyebrow && <p className="oa-hero-eyebrow hero-reveal hero-reveal-1" {...at('hero.eyebrow')}>{c.hero.eyebrow}</p>}
            <h1 id="oa-hero-title" className="oa-hero-title hero-reveal hero-reveal-2" {...at('hero.title')}>
              {c.hero.title}
            </h1>
            {c.hero.text && <p className="oa-hero-text hero-reveal hero-reveal-3" {...at('hero.text')}>
              {c.hero.text}
            </p>}
            <div className="oa-hero-actions hero-reveal hero-reveal-4">
              <Link href="/catalogue/complet" className="shop-btn shop-btn-gold shop-btn-xl" onClick={() => track('Clic Catalogue', { emplacement: 'hero' })} {...at('hero.primaryLabel')}>
                <i className="fas fa-th-large" /> {c.hero.primaryLabel}
              </Link>
              <Link href="/catalogue" className="shop-btn shop-btn-light shop-btn-xl" onClick={() => track('Clic Réserver', { emplacement: 'hero' })} {...at('hero.secondaryLabel')}>
                <i className="far fa-calendar-check" /> {c.hero.secondaryLabel}
              </Link>
            </div>
          </div>
        </section>

        {/* ARGUMENTS — compact reassurance under the hero */}
        <section className="shop-usp" aria-label="Nos engagements">
          <ul className="shop-usp-list">
            {c.assurances.items.map((a, i) => (
              <li key={i} {...at(`assurances.items.${i}`)}>
                <Icon name={ASSURANCE_ICONS[i % ASSURANCE_ICONS.length]} size={30} strokeWidth={1.2} />
                <span><strong>{a.title}</strong>{a.tag && <small>{a.tag}</small>}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* NOS CATÉGORIES — options.fr category mosaic */}
        {categories.length > 0 && <section
          className="oa-home-cats"
          aria-labelledby="oa-home-cats-title"
          style={{
            ...(catColors.textColor && { '--oa-cat-text': catColors.textColor }),
            ...(catColors.hoverColor && { '--oa-cat-hover': catColors.hoverColor }),
          }}
        >
          <h2 id="oa-home-cats-title" className="oa-section-title" data-reveal {...at('categories.title')}>{c.categories.title}</h2>
          <div className="oa-home-cats-rows">
            {categoryRows.map(row => (
              <div className="oa-home-cats-grid" key={row[0].id} style={{ '--category-columns': 1 + Math.ceil((row.length - 1) / 2) }} data-reveal>
                {[row.slice(0, 1), row.slice(1, 3), row.slice(3, 5)].filter(col => col.length).map(col => (
                  <div className="oa-home-cats-col" key={col[0].id}>
                    {col.map(t => (
                      <Link
                        key={t.id}
                        href={catalogueCategoryHref(t.name)}
                        className={`oa-home-cat${row.length >= 3 && col.length === 1 ? ' is-tall' : ''}`}
                        style={t.image_url ? { backgroundImage: `url(${JSON.stringify(t.image_url)})` } : undefined}
                      >
                        <h3 className="oa-home-cat-title">{t.label}</h3>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>}

        {/* NOTRE SÉLECTION — products to add to the cart */}
        {selection.length > 0 && (
          <section className="oa-section oa-section-tight shop-home-selection" aria-labelledby="shop-selection-title">
            <div className="oa-container">
              <div className="home-head" data-reveal>
                <h2 id="shop-selection-title" className="home-title" {...at('selection.title')}><Emph text={c.selection.title} /></h2>
                {c.selection.note && <p className="home-head-note" {...at('selection.note')}>{c.selection.note}</p>}
              </div>
              <div className="shop-grid" data-reveal>
                {selection.map((card, i) => (
                  <ShopCard key={card.key} card={card} inCart={inCartOf(card)} onQuickView={setQuick} eager={i < 4} place="accueil" />
                ))}
                <Link href="/catalogue/complet" className="home-sel-all">
                  <strong {...at('selection.allLabel')}>{c.selection.allLabel}</strong>
                  <span>{productCount} articles <i className="fas fa-arrow-right" aria-hidden="true" /></span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* LOUEZ EN 4 ÉTAPES */}
        <section className="oa-section-tight oa-steps" aria-labelledby="oa-steps-title">
          <div className="oa-container">
            <div className="home-head" data-reveal>
              <h2 id="oa-steps-title" className="home-title" {...at('steps.title')}><Emph text={c.steps.title} /></h2>
              <Link href="/catalogue/complet" className="shop-btn shop-btn-gold shop-btn-xl" onClick={() => track('Clic Réserver', { emplacement: 'étapes' })} {...at('steps.buttonLabel')}>
                <i className="far fa-calendar-check" /> {c.steps.buttonLabel}
              </Link>
            </div>
            <ol className="oa-steps-list" data-reveal>
              {c.steps.items.map((e, i) => (
                <li className="oa-step" key={i} {...at(`steps.items.${i}`)}>
                  <span className="oa-step-num" aria-hidden="true">{i + 1}</span>
                  <div className="oa-step-body">
                    <h3 className="oa-step-title">{e.title}</h3>
                    {e.text && <p className="oa-step-text">{e.text}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* BANNIÈRE — custom projects */}
        <section className="shop-banner" style={{ backgroundImage: `url(${JSON.stringify(c.banner.image)})` }}>
          <div className="shop-banner-inner" data-reveal>
            {c.banner.eyebrow && <span className="oa-eyebrow" {...at('banner.eyebrow')}>{c.banner.eyebrow}</span>}
            <h2 {...at('banner.title')}>{c.banner.title}</h2>
            {c.banner.text && <p {...at('banner.text')}>{c.banner.text}</p>}
            <div className="shop-banner-actions">
              <Link href="/contact" className="shop-btn shop-btn-light" {...at('banner.buttonLabel')}>{c.banner.buttonLabel}</Link>
            </div>
          </div>
        </section>

        {/* RÉALISATIONS */}
        <section className="oa-section oa-realisations">
          <div className="oa-container">
            <div className="oa-section-head oa-section-head-split" data-reveal>
              <div>
                {c.realisations.eyebrow && <span className="oa-eyebrow" {...at('realisations.eyebrow')}>{c.realisations.eyebrow}</span>}
                <h2 className="oa-section-title" {...at('realisations.title')}>{c.realisations.title}</h2>
              </div>
              <Link href="/nos-realisations" className="oa-univers-link" {...at('realisations.linkLabel')}>{c.realisations.linkLabel} <i className="fas fa-arrow-right" /></Link>
            </div>
            <RealisationsGrid items={realisations} />
          </div>
        </section>


        {/* LOCATION DANS TOUTE LA FRANCE — occasions et guides */}
        <section id="nous-trouver" data-scroll-flush className="oa-section seo-home home-loueur" aria-labelledby="seo-home-title">
          <div className="oa-container">
            <div className="home-loueur-intro" data-reveal>
              <h2 id="seo-home-title" className="home-title" {...at('about.title')}><Emph text={c.about.title} /></h2>
              {c.about.text && <p {...at('about.text')}><RichText text={c.about.text} /></p>}
              {c.about.sign && <p className="home-loueur-sign" {...at('about.sign')}>{c.about.sign}</p>}
            </div>
            <div className="seo-link-columns" data-reveal>
              <div>
                <h3>Selon votre événement</h3>
                <ul>{EVENTS.map(e => <li key={e.slug}><Link href={`/evenements/${e.slug}`}>{e.title.replace(' en Île-de-France', '')}</Link></li>)}</ul>
              </div>
              <div>
                <h3 {...at('about.deliveryTitle')}>{c.about.deliveryTitle}</h3>
                <p style={{ color: 'var(--oa-muted)', lineHeight: '1.6', marginTop: '10px' }} {...cms('global', 'delivery.text')}>
                  <RichText text={global.delivery.text} />
                </p>
                <p style={{ marginTop: '14px' }}>
                  <Link href="/catalogue/complet" className="list-text-link">Voir tout le catalogue →</Link>
                </p>
              </div>
              <div>
                <h3>Nos conseils</h3>
                <ul>{GUIDES.map(g => <li key={g.slug}><Link href={`/guides/${g.slug}`}>{g.title}</Link></li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        {/* VOS QUESTIONS */}
        <div className="home-faq">
          <div className="oa-container" data-reveal {...at('faq.title')}>
            <Faq items={faqItems} title={plainText(c.faq.title)} more itemProps={item => cms('faq', item.path)} />
          </div>
        </div>

        {/* CTA FINALE */}
        <section className="apropos-cta-section">
          <div className="container">
            <h2 className="apropos-cta-title oa-section-title" {...at('cta.title')}>{c.cta.title}</h2>
            {c.cta.text && <p className="apropos-cta-text" {...at('cta.text')}>{c.cta.text}</p>}
            <div className="oa-center-cta" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/catalogue/complet" className="shop-btn shop-btn-dark shop-btn-xl" {...at('cta.primaryLabel')}>{c.cta.primaryLabel}</Link>
              <Link href="/catalogue" className="shop-btn shop-btn-gold shop-btn-xl" {...at('cta.secondaryLabel')}>{c.cta.secondaryLabel}</Link>
            </div>
          </div>
        </section>
      </div>

      {quick && <QuickView card={quick} onClose={() => setQuick(null)} />}
    </>
  )
}
