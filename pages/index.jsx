import RealisationsGrid from '../src/components/RealisationsGrid.jsx'
import { getRealisations } from '../src/lib/realisations-server.js'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Seo, { ORGANIZATION_LD } from '../src/components/Seo.jsx'
import { useRouter } from 'next/router'
import { supabase } from '../src/lib/supabase.js'
import { getUnitPriceTtc, groupTiersByMaterial, getMinOrderQty } from '../src/lib/pricing.js'
import { addToCatalogueCart } from '../src/lib/cart.js'
import { slugify } from '../src/lib/slug.js'
import Icon from '../src/components/Icon.jsx'
import HeroVideo from '../src/components/HeroVideo.jsx'
import { track } from '../src/lib/analytics.js'

const UNIVERS = [
  {
    slotKey: 'univers_1',
    title: 'Mariages & Réceptions',
    text: 'De la demande à la nuit de noces, une scénographie pensée dans le moindre détail.',
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=720&q=70&auto=format&fit=crop',
  },
  {
    slotKey: 'univers_2',
    title: 'Anniversaires & Fêtes',
    text: "Des célébrations sur mesure, intimes ou grandioses, à votre image.",
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=720&q=70&auto=format&fit=crop',
  },
  {
    slotKey: 'univers_3',
    title: 'Location de Décoration',
    text: 'Mobilier, art de la table et scénographie disponibles à la location, livrés et installés.',
    img: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=720&q=70&auto=format&fit=crop',
  },
]

// Photos: public/images/prestations/ (OA's own, 900px WebP).
const PRESTATIONS = [
  { icon: 'fas fa-heart', img: '/images/prestations/organisation-mariage.webp', title: 'Organisation de Mariage', text: "Recherche du lieu, prestataires, coordination du jour J." },
  { icon: 'fas fa-birthday-cake', img: '/images/prestations/organisation-anniversaire.webp', title: "Organisation d'Anniversaire", text: 'Thème, décoration et animation sur mesure.' },
  { icon: 'fas fa-briefcase', img: '/images/prestations/evenements-professionnels.webp', title: 'Événements Professionnels', text: 'Séminaires, galas et lancements d\'entreprise.' },
  { icon: 'fas fa-star', img: '/images/prestations/location-decoration.webp', title: 'Location de Décoration', text: 'Vaisselle, mobilier et éclairage, livrés et installés.' },
]

// "Nos catégories" mosaic, modelled on options.fr's home block: one tall
// tile on the left, two stacked tiles in each of the other columns. Photos
// are swappable from Espace OA > Visuel Site > Accueil — Catégories.
const CATEGORY_TILES = [
  { slotKey: 'categorie_1', title: 'Chaises', value: 'CHAISES', img: '/catalogue/Chaises_600x800.jpg' },
  { slotKey: 'categorie_2', title: 'Tables', value: 'TABLES', img: '/catalogue/Tables_1200x670.jpg' },
  { slotKey: 'categorie_3', title: 'Banquettes', value: 'BANQUETTES', img: '/catalogue/Banquettes_600x800.jpg', raised: true },
  { slotKey: 'categorie_4', title: 'Décorations', value: 'DÉCORATIONS', img: '/catalogue/Decorations_800x800.jpg' },
  { slotKey: 'categorie_5', title: 'Accessoires', value: 'OPTIONS & ACCESSOIRES', img: '/catalogue/Options-accessoires_600x800.jpg' },
]

// Reassurance strip, modelled on options.fr's "Louez tout le matériel pour
// votre réception !" block (reference at /example). Copy built only from
// claims the site already makes elsewhere.
const ASSURANCES = [
  { icon: 'book', title: 'Tout pour votre décor', tag: 'Mobilier, vaisselle et éclairage', text: 'Composez votre réception pièce par pièce dans notre catalogue en ligne.' },
  { icon: 'truck', title: 'Livré et installé', tag: 'Pris en charge de A à Z', text: 'Livraison, montage et démontage assurés par notre équipe.' },
  { icon: 'users', title: 'La location pour tous', tag: 'Particuliers et professionnels', text: 'Mariages, anniversaires, séminaires : quelle que soit la taille de votre événement.' },
  { icon: 'headset', title: 'Accompagnement 7j/7', tag: 'Du premier échange au jour J', text: 'Une équipe à votre écoute pour vous conseiller à chaque étape.' },
]

// "Louez en 4 étapes" — options.fr's step strip, written for OA's real
// flow: catalogue cart → reservation form → online estimate → team
// confirmation, then payment + tracking via /suivi.
const ETAPES = [
  { title: 'Faites votre sélection', text: 'Mobilier, art de la table et décoration : ajoutez vos pièces au panier depuis le catalogue.' },
  { title: 'Indiquez la date et le lieu', text: "Choisissez le ou les jours de votre événement et l'adresse de livraison." },
  { title: 'Vérifiez votre total', text: 'Le prix de la location et de la livraison est calculé en ligne.' },
  { title: 'Confirmez et suivez', text: 'Réglez le premier versement pour confirmer automatiquement la location, puis suivez votre commande en ligne.' },
]

const STATS = [
  { count: '150+', label: 'Fêtes Réussies' },
  { count: '120+', label: 'Couples Heureux' },
  { count: '5+', label: "Ans d'Expertise" },
  { count: '99%', label: 'Satisfaction Client' },
]

export async function getServerSideProps() {
  return { props: { realisations: (await getRealisations()).slice(0, 6) } }
}

export default function Home({ realisations }) {
  const router = useRouter()
  // The hero's entrance animation is pure CSS (see .hero-reveal in
  // index.css) — it starts on first paint, no JS flag needed.

  const [images, setImages] = useState({})
  useEffect(() => {
    supabase.from('site_content').select('*').eq('key', 'images_home').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try { setImages(JSON.parse(row.value)) } catch {}
    })
  }, [])

  // Title colours of the "Nos catégories" tiles, set in Espace OA.
  const [catColors, setCatColors] = useState({})
  useEffect(() => {
    supabase.from('site_content').select('*').eq('key', 'home_categories_style').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try { setCatColors(JSON.parse(row.value) || {}) } catch {}
    })
  }, [])

  // Homepage teaser for /catalogue — one item per category (up to 4) rather
  // than just the first 4 rows, so the preview reads as "a bit of everything
  // we rent" instead of whatever happens to sort first.
  const [catalogueTeaser, setCatalogueTeaser] = useState([])
  const [catalogueTiers, setCatalogueTiers] = useState({})
  const [addedId, setAddedId] = useState(null)
  useEffect(() => {
    Promise.all([
      supabase.from('materials').select('*').eq('available', true).order('category'),
      supabase.from('material_price_tiers').select('*'),
      supabase.from('products').select('*'),
    ]).then(([matRes, tierRes, prodRes]) => {
      const tiers = groupTiersByMaterial(tierRes.data || [])
      setCatalogueTiers(tiers)
      // First item of each category. An option of an article à options is
      // shown as its article (name, page, cheapest option's price) — the
      // option itself is chosen on the product page.
      const productById = Object.fromEntries((prodRes.data || []).map(p => [String(p.id), p]))
      const mats = matRes.data || []
      const byCategory = {}
      mats.forEach(m => {
        const cat = m.category || 'Autre'
        if (byCategory[cat]) return
        const product = m.product_id && productById[String(m.product_id)]
        if (!product) { byCategory[cat] = { ...m, displayName: m.name, href: `/catalogue/${m.slug || slugify(m.name)}` }; return }
        const options = mats.filter(o => String(o.product_id) === String(product.id))
        const prices = options.map(o => getUnitPriceTtc(tiers[String(o.id)], 'weekday', getMinOrderQty(tiers[String(o.id)]))).filter(p => p > 0)
        byCategory[cat] = {
          ...m, displayName: product.name, href: `/catalogue/${product.slug}`, isOptions: true,
          image_url: options.find(o => o.image_url)?.image_url || null,
          fromPrice: prices.length ? Math.min(...prices) : 0,
        }
      })
      setCatalogueTeaser(Object.values(byCategory).slice(0, 4))
    })
  }, [])

  function handleQuickAdd(m) {
    const minQty = getMinOrderQty(catalogueTiers[String(m.id)])
    addToCatalogueCart(m.id, minQty)
    track('Ajout panier', { emplacement: 'accueil' })
    setAddedId(m.id)
    setTimeout(() => setAddedId(id => id === m.id ? null : id), 1600)
  }

  return (
    <>
      <Seo
        title="OA Événementiel — Organisation d'événements et location de décoration"
        description="Organisation de mariages, anniversaires, événements d'entreprise et location de mobilier et de décoration raffinée en Île-de-France."
        path="/"
        jsonLd={ORGANIZATION_LD}
      />

      <div className="page-wrapper">
        {/* HERO */}
        <section id="Hero-Section" className="oa-hero" aria-labelledby="oa-hero-title">
          <HeroVideo />
          <div className="oa-container oa-hero-inner">
            <p className="oa-hero-eyebrow hero-reveal hero-reveal-1">Créateur d'Émotions</p>
            <h1 id="oa-hero-title" className="oa-hero-title hero-reveal hero-reveal-2">
              Organisation & Scénographie d'Événements
            </h1>
            <p className="oa-hero-text hero-reveal hero-reveal-3">
              Mariages, anniversaires, réceptions privées ou professionnelles... Nous concevons et décorons vos plus beaux moments en Île-de-France.
            </p>
            <div className="oa-hero-actions hero-reveal hero-reveal-4">
              <Link href="/reservation" className="theme-button w-inline-block">
                <div className="theme-button-content">
                  <div className="theme-button-text">Réserver</div>
                  <div className="theme-button-hover-text">Réserver</div>
                </div>
              </Link>
              <Link href="/services" className="theme-button theme-button-outline w-inline-block">
                <div className="theme-button-content">
                  <div className="theme-button-text">Prestations</div>
                  <div className="theme-button-hover-text">Prestations</div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* NOS CATÉGORIES — options.fr category mosaic */}
        <section
          className="oa-home-cats"
          aria-labelledby="oa-home-cats-title"
          style={{
            ...(catColors.textColor && { '--oa-cat-text': catColors.textColor }),
            ...(catColors.hoverColor && { '--oa-cat-hover': catColors.hoverColor }),
          }}
        >
          <h2 id="oa-home-cats-title" className="oa-section-title" data-reveal>Nos catégories</h2>
          <div className="oa-home-cats-grid" data-reveal>
            {[[0], [1, 2], [3, 4]].map((col, c) => (
              <div className="oa-home-cats-col" key={c}>
                {col.map(i => {
                  const t = CATEGORY_TILES[i]
                  return (
                    <Link
                      key={t.slotKey}
                      href={`/catalogue/complet?categorie=${encodeURIComponent(t.value)}`}
                      className={`oa-home-cat${col.length === 1 ? ' is-tall' : ''}${t.raised ? ' is-raised' : ''}`}
                      style={{ backgroundImage: `url(${images[t.slotKey] || t.img})` }}
                    >
                      <h3 className="oa-home-cat-title">{t.title}</h3>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {/* NOS UNIVERS */}
        <section className="oa-section oa-univers">
          <div className="oa-container">
            <div className="oa-section-head" data-reveal>
              <span className="oa-eyebrow">Nos Univers</span>
              <h2 className="oa-section-title">Un événement, une histoire</h2>
            </div>
            <div className="oa-univers-grid" data-reveal>
              {UNIVERS.map((u, i) => (
                <Link href="/services" key={u.title} className="oa-univers-card">
                  <div className="oa-univers-image" style={{ backgroundImage: `url(${images[u.slotKey] || u.img})` }} />
                  <div className="oa-univers-body">
                    <h3 className="oa-heading" style={{ fontSize: 'var(--oa-size-h3)' }}>{u.title}</h3>
                    <p className="oa-text-muted">{u.text}</p>
                    <span className="oa-univers-link">Découvrir <i className="fas fa-arrow-right" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* NOS PRESTATIONS */}
        <section className="oa-section oa-section-tight oa-prestations">
          <div className="oa-container">
            <div className="oa-section-head" data-reveal>
              <span className="oa-eyebrow">Nos Prestations</span>
              <h2 className="oa-section-title">Un accompagnement complet</h2>
            </div>
            {/* Same card as "Choisissez votre mobilier" (.oa-product-card):
                square photo, centered title + line, shadow and a button
                rising at the bottom of the photo on hover. */}
            <div className="oa-catalogue-teaser-grid" data-reveal>
              {PRESTATIONS.map(p => (
                <Link href="/services" className="oa-product-card oa-prestation-card" key={p.title}>
                  <div className="oa-product-media">
                    <img src={p.img} alt={p.title} width="900" height="900" loading="lazy" decoding="async" />
                    <span className="oa-product-add" aria-hidden="true">
                      <span>Découvrir</span>
                      <i className="fas fa-arrow-right" />
                    </span>
                  </div>
                  <div className="oa-product-details">
                    <div className="oa-prestation-icon" aria-hidden="true"><i className={p.icon} /></div>
                    <h3 className="oa-product-name">{p.title}</h3>
                    <p className="oa-product-price">{p.text}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="oa-center-cta" data-reveal>
              <Link href="/services" className="btn btn-rose-gold">Voir toutes nos prestations</Link>
            </div>
          </div>
        </section>

        {/* CATALOGUE */}
        {catalogueTeaser.length > 0 && (
          <section className="oa-section oa-section-tight oa-catalogue-teaser">
            <div className="oa-container">
              <div className="oa-section-head oa-section-head-split" data-reveal>
                <div>
                  <span className="oa-eyebrow">Catalogue</span>
                  <h2 className="oa-section-title">Choisissez votre mobilier</h2>
                </div>
                <Link href="/catalogue" className="oa-univers-link">Voir tout le catalogue <i className="fas fa-arrow-right" /></Link>
              </div>
              {/* Product cards modelled on options.fr's "Notre sélection du
                  moment": borderless, square image, centered name + price;
                  on hover a soft shadow and an "Ajouter au panier" button
                  rising at the bottom of the image. */}
              <div className="oa-catalogue-teaser-grid" data-reveal>
                {catalogueTeaser.map(m => {
                  const tiers = catalogueTiers[String(m.id)]
                  const minQty = getMinOrderQty(tiers)
                  const price = m.isOptions ? m.fromPrice : getUnitPriceTtc(tiers, 'weekday', minQty)
                  const added = addedId === m.id
                  return (
                    <article className={`oa-product-card${added ? ' is-added' : ''}`} key={m.id}>
                      <div className="oa-product-media">
                        <Link href={m.href} className="oa-product-media-link" tabIndex={-1} aria-hidden="true">
                          {m.image_url
                            ? <img src={m.image_url} alt="" loading="lazy" />
                            : <Icon name="image" size={40} strokeWidth={1} className="oa-product-placeholder" />}
                        </Link>
                        {m.isOptions ? (
                          <Link href={m.href} className="oa-product-add" aria-label={`Choisir une option de ${m.displayName}`}>
                            <Icon name="bag" size={18} strokeWidth={1.6} />
                            <span>Choisir une option</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="oa-product-add"
                            onClick={() => handleQuickAdd(m)}
                            disabled={added}
                            aria-label={added ? `${m.name} ajouté au panier` : `Ajouter ${m.name} au panier`}
                          >
                            <Icon name={added ? 'check' : 'bag'} size={18} strokeWidth={1.6} />
                            <span>{added ? 'Ajouté au panier' : 'Ajouter au panier'}</span>
                          </button>
                        )}
                      </div>
                      <div className="oa-product-details">
                        <h3 className="oa-product-name"><Link href={m.href}>{m.displayName}</Link></h3>
                        {price > 0 && <p className="oa-product-price">dès {price.toFixed(2)} €</p>}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* LOUEZ EN 4 ÉTAPES — options.fr step strip */}
        <section className="oa-section-tight oa-steps" aria-labelledby="oa-steps-title">
          <div className="oa-container">
            <h2 id="oa-steps-title" className="oa-section-title">Louez en 4 étapes</h2>
            <ol className="oa-steps-list">
              {ETAPES.map((e, i) => (
                <li className="oa-step" key={e.title}>
                  <span className="oa-step-num" aria-hidden="true">{i + 1}</span>
                  <div className="oa-step-body">
                    <h3 className="oa-step-title">{e.title}</h3>
                    <p className="oa-step-text">{e.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* RÉALISATIONS */}
        <section className="oa-section oa-realisations">
          <div className="oa-container">
            <div className="oa-section-head oa-section-head-split" data-reveal>
              <div>
                <span className="oa-eyebrow">Réalisations</span>
                <h2 className="oa-section-title">Quelques instants capturés</h2>
              </div>
              <Link href="/nos-realisations" className="oa-univers-link">Voir toutes nos réalisations <i className="fas fa-arrow-right" /></Link>
            </div>
            <RealisationsGrid items={realisations} />
          </div>
        </section>

        {/* RÉASSURANCE — options.fr reassurance block */}
        <section className="oa-section-tight oa-assurance" aria-labelledby="oa-assurance-title">
          <div className="oa-container">
            <h2 id="oa-assurance-title" className="oa-section-title" data-reveal>
              Tout le nécessaire pour sublimer votre réception
            </h2>
            <ul className="oa-assurance-grid" data-reveal>
              {ASSURANCES.map(a => (
                <li className="oa-assurance-item" key={a.title}>
                  <Icon name={a.icon} size={48} strokeWidth={1} className="oa-assurance-icon" />
                  <div className="oa-assurance-body">
                    <h3 className="oa-assurance-item-title">{a.title}</h3>
                    <p className="oa-assurance-tag">{a.tag}</p>
                    <p className="oa-assurance-text">{a.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="oa-assurance-intro" data-reveal>
              <p>
                Spécialiste de l'organisation d'événements et de la location de décoration en Île-de-France,
                OA Événementiel vous accompagne dans la concrétisation de vos projets privés et professionnels.
              </p>
              <p>
                Mobilier, art de la table, éclairage et scénographie : composez la réception qui vous ressemble.
                Laissez-vous guider par vos envies !
              </p>
            </div>
          </div>
        </section>

        {/* CHIFFRES CLÉS */}
        <section className="oa-section-tight oa-stats-band">
          <div className="oa-container oa-stats-grid" data-reveal>
            {STATS.map((s, i) => (
              <div className="oa-stat" key={s.label}>
                <span className="oa-stat-count">{s.count}</span>
                <span className="oa-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINALE */}
        <section className="apropos-cta-section">
          <div className="container">
            <h2 className="apropos-cta-title oa-section-title">Discutons de votre événement</h2>
            <p className="apropos-cta-text">Parlons de votre projet et voyons comment lui donner vie ensemble.</p>
            <div className="oa-center-cta" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/devis" className="btn btn-rose-gold">Simuler mon devis</Link>
              <Link href="/contact" className="theme-button theme-button-outline w-inline-block">
                <div className="theme-button-content"><div className="theme-button-text">Nous contacter</div></div>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
