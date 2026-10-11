import { useEffect, useState } from 'react'
import Link from 'next/link'
import Seo from '../src/components/Seo.jsx'
import { supabase } from '../src/lib/supabase.js'

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1600&q=75&auto=format&fit=crop'

const SERVICES = [
  {
    slotKey: 'service_1',
    icon: 'fas fa-heart',
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=75&auto=format&fit=crop',
    title: 'Organisation de Mariage',
    desc: 'De la recherche de la salle à la coordination le jour J, nous gérons chaque détail de votre mariage pour que vous viviez pleinement ce moment unique.',
    items: [
      'Coordination des prestataires',
      'Décoration et mise en scène',
      'Planning détaillé et suivi',
      'Coordination le jour J',
    ],
    reverse: false,
  },
  {
    slotKey: 'service_2',
    icon: 'fas fa-birthday-cake',
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=75&auto=format&fit=crop',
    title: 'Organisation d\'Anniversaire',
    desc: 'Qu\'il s\'agisse d\'un anniversaire intime ou d\'une grande fête, nous créons l\'ambiance parfaite pour célébrer vos moments de vie avec éclat.',
    items: [
      'Thème et décoration sur mesure',
      'Animation et divertissements',
      'Surprise ou événement planifié',
    ],
    reverse: true,
  },
  {
    slotKey: 'service_3',
    icon: 'fas fa-briefcase',
    img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=75&auto=format&fit=crop',
    title: 'Événements Professionnels',
    desc: 'Séminaires, galas d\'entreprise, inaugurations ou soirées de fin d\'année — nous organisons vos événements professionnels avec la même passion et le même soin.',
    items: [
      'Séminaires et team building',
      'Galas et soirées d\'entreprise',
      'Inaugurations et lancements',
      'Conférences et conventions',
      'Logistique complète',
    ],
    reverse: false,
  },
  {
    slotKey: 'service_4',
    icon: 'fas fa-star',
    img: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&q=75&auto=format&fit=crop',
    title: 'Location de Décoration',
    desc: 'Accédez à notre belle sélection d\'accessoires de décoration pour sublimer vos événements à moindre coût. Nous livrons et installons tout sur place.',
    items: [
      'Vaisselle et art de la table',
      'Luminaires et éclairage',
      'Mobilier et accessoires',
      'Fleurs artificielles et naturelles',
      'Livraison et installation incluses',
    ],
    reverse: true,
  },
]

export default function Services() {
  const [images, setImages] = useState({})


  useEffect(() => {
    supabase.from('site_content').select('*').eq('key', 'images_services').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try { setImages(JSON.parse(row.value)) } catch {}
    })
  }, [])

  return (
    <>
      <Seo
        title="Prestations : mariages, anniversaires et événements professionnels"
        description="Organisation de mariages, d'anniversaires et d'événements professionnels, et location de décoration en Île-de-France : découvrez nos prestations."
        path="/services"
        breadcrumb={[{ name: 'Prestations', path: '/services' }]}
        preloadImage={PAGE_HEADER_DEFAULT}
      />

      <div className="site-wrap">
        <div
          className="page-header"
          style={{ backgroundImage: `url(${images.page_header || PAGE_HEADER_DEFAULT})` }}
        >
          <div className="page-header-overlay" />
          <div className="container">
            <h1>Nos Prestations</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb justify-content-center">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active">Prestations</li>
              </ol>
            </nav>
          </div>
        </div>

        <section className="services-full-section">
          <div className="container">
            {SERVICES.map((s, i) => (
              <div key={i} className="service-block">
                <div className={`row align-items-center${s.reverse ? ' flex-row-reverse' : ''}`}>
                  <div className="col-lg-6 mb-4 mb-lg-0" data-reveal>
                    <img src={images[s.slotKey] || s.img} alt={s.title} className="service-block-image" loading="lazy" decoding="async" />
                  </div>
                  <div className={`col-lg-6 ${s.reverse ? 'pe-lg-5' : 'ps-lg-5'}`} data-reveal>
                    <div className="service-block-icon"><i className={s.icon} /></div>
                    <span className="devis-tag">Tarif sur devis</span>
                    <h2>{s.title}</h2>
                    <p className="section-text">{s.desc}</p>
                    <ul className="service-includes">
                      {s.items.map((item, j) => <li key={j}>{item}</li>)}
                    </ul>
                    <Link href="/reservation" className="btn btn-rose-gold">Demander un devis</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
