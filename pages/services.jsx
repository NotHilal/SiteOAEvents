import { useEffect } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import AOS from 'aos'

const SERVICES = [
  {
    icon: 'fas fa-rings-wedding',
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80',
    title: 'Organisation de Mariage',
    desc: 'De la recherche de la salle à la coordination le jour J, nous gérons chaque détail de votre mariage pour que vous viviez pleinement ce moment unique.',
    items: [
      'Recherche et réservation du lieu',
      'Coordination des prestataires',
      'Décoration et mise en scène',
      'Planning détaillé et suivi',
      'Coordination le jour J',
    ],
    reverse: false,
  },
  {
    icon: 'fas fa-birthday-cake',
    img: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=900&q=80',
    title: 'Organisation d\'Anniversaire',
    desc: 'Qu\'il s\'agisse d\'un anniversaire intime ou d\'une grande fête, nous créons l\'ambiance parfaite pour célébrer vos moments de vie avec éclat.',
    items: [
      'Thème et décoration sur mesure',
      'Animation et divertissements',
      'Traiteur et gâteau personnalisé',
      'Invitations et coordination',
      'Surprise ou événement planifié',
    ],
    reverse: true,
  },
  {
    icon: 'fas fa-briefcase',
    img: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=80',
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
    icon: 'fas fa-star',
    img: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&q=80',
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
  useEffect(() => {
    AOS.init({ duration: 820, easing: 'ease-in-out', once: true, offset: 55 })
    AOS.refresh()
  }, [])

  return (
    <>
      <Head>
        <title>Prestations — OA Événementiel</title>
        <meta name="description" content="Découvrez nos prestations d'organisation d'événements (mariages, anniversaires, événements professionnels) et location de décoration en Île-de-France." />
      </Head>
      
      <div className="site-wrap">
        <div
          className="page-header"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80)' }}
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
                  <div className="col-lg-6 mb-4 mb-lg-0" data-aos={s.reverse ? 'fade-left' : 'fade-right'}>
                    <img src={s.img} alt={s.title} className="service-block-image" />
                  </div>
                  <div className={`col-lg-6 ${s.reverse ? 'pe-lg-5' : 'ps-lg-5'}`} data-aos={s.reverse ? 'fade-right' : 'fade-left'} data-aos-delay="100">
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
