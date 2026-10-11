import { useEffect, useState } from 'react'
import Link from 'next/link'
import Seo from '../src/components/Seo.jsx'
import { supabase } from '../src/lib/supabase.js'
import { track } from '../src/lib/analytics.js'

const WEB3FORMS_KEY = '380ad0e4-4abc-4a00-81d1-d81067d54129'
const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&q=75&auto=format&fit=crop'

export default function Contact() {
  const EMPTY = { prenom: '', nom: '', email: '', telephone: '', typeEvenement: '', message: '', website: '' }
  const [form, setForm] = useState(EMPTY)
  const [errorMsg, setErrorMsg] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [images, setImages] = useState({})


  useEffect(() => {
    supabase.from('site_content').select('*').eq('key', 'images_contact').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try { setImages(JSON.parse(row.value)) } catch {}
    })
  }, [])

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  // Saved to our database first (the admin's Messages tab is the source of
  // truth), then forwarded by email via Web3Forms. Success if at least one
  // of the two went through; the form keeps what was typed on failure.
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading')
    setErrorMsg('')

    let saved = false
    let emailed = false
    try {
      const { error } = await supabase.from('contacts').insert({
        prenom: form.prenom.trim() || null,
        nom: form.nom.trim() || null,
        email: form.email.trim(),
        telephone: form.telephone.trim() || null,
        type_evenement: form.typeEvenement || null,
        message: form.message.trim(),
        website: form.website,
      })
      if (error) {
        // Validation message from the server (e.g. invalid email): show it
        // and stop — the email would fail the same way.
        if (error.status === 400 || error.status === 429) {
          setErrorMsg(error.message)
          setStatus('error')
          return
        }
      } else {
        saved = true
      }
    } catch {}

    if (!form.website) {
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: 'Nouvelle demande de contact — OA Événementiel',
            from_name: 'OA Événementiel - Site Web',
            botcheck: '',
            'Prénom': form.prenom,
            'Nom': form.nom,
            'Email': form.email,
            'Téléphone': form.telephone,
            "Type d'événement": form.typeEvenement,
            'Message': form.message,
          }),
        })
        const result = await res.json()
        emailed = !!result.success
      } catch {}
    }

    if (saved || emailed) {
      setStatus('success')
      setForm(EMPTY)
      track('Contact envoyé', { type: form.typeEvenement || 'non précisé' })
    } else {
      setErrorMsg("Votre message n'a pas pu être envoyé. Vérifiez votre connexion et réessayez, ou écrivez-nous à contact@oa-evenementiel.fr.")
      setStatus('error')
    }
  }

  return (
    <>
      <Seo
        title="Contact et demande de devis"
        description="Une question ou un projet ? Contactez OA Événementiel pour vos mariages, anniversaires et événements professionnels en Île-de-France."
        path="/contact"
        breadcrumb={[{ name: 'Contact', path: '/contact' }]}
        preloadImage={PAGE_HEADER_DEFAULT}
      />

      <div className="site-wrap">
        <div
          className="page-header"
          style={{ backgroundImage: `url(${images.page_header || PAGE_HEADER_DEFAULT})` }}
        >
          <div className="page-header-overlay" />
          <div className="container">
            <h1>Contactez-Nous</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb justify-content-center">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active">Contact</li>
              </ol>
            </nav>
          </div>
        </div>

        <section className="contact-section">
          <div className="container">
            <div className="row">
              <div className="col-lg-4 mb-5 mb-lg-0" data-reveal>
                <span className="section-subtitle">Parlons de votre projet</span>
                <h2 className="section-title">Nous Sommes à Votre Écoute</h2>
                <p className="section-text">N'hésitez pas à nous contacter pour toute demande de renseignements ou pour démarrer la planification de votre événement.</p>

                {[
                  { icon: 'fas fa-map-marker-alt', title: 'Localisation', text: 'Île-de-France, France' },
                  { icon: 'fas fa-phone', title: 'Téléphone', text: 'Sur demande' },
                  { icon: 'fas fa-envelope', title: 'Email', text: 'contact@oa-evenementiel.fr', href: 'mailto:contact@oa-evenementiel.fr' },
                  { icon: 'fas fa-clock', title: 'Disponibilité', text: 'Lun – Dim : 9h – 20h', note: 'Livraison et prestations possibles 24h/24, 7j/7' },
                ].map((item, i) => (
                  <div key={i} className="contact-info-item">
                    <div className="contact-info-icon"><i className={item.icon} aria-hidden="true" /></div>
                    <div className="contact-info-text">
                      <h3>{item.title}</h3>
                      <p>{item.href ? <a href={item.href}>{item.text}</a> : item.text}</p>
                      {item.note && <p className="contact-info-note">({item.note})</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-lg-8" data-reveal>
                <div className="contact-form-wrap">
                  <h3>Demande de devis</h3>
                  <p className="lead-text">Remplissez ce formulaire et nous vous répondrons dans les 24h.</p>

                  {status === 'success' && (
                    <div className="alert alert-success" role="alert">
                      <i className="fas fa-check-circle me-2" aria-hidden="true" />Message envoyé ! Nous vous répondrons très vite.
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="alert alert-danger" role="alert">
                      <i className="fas fa-exclamation-triangle me-2" aria-hidden="true" />{errorMsg || 'Une erreur est survenue. Veuillez réessayer.'}
                    </div>
                  )}

                  <p className="form-required-hint"><span aria-hidden="true">*</span> Champs obligatoires</p>
                  <form onSubmit={handleSubmit} noValidate={false}>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact-prenom">Prénom <span className="text-rose-gold" aria-hidden="true">*</span></label>
                          <input id="contact-prenom" autoComplete="given-name" name="prenom" className="form-control" value={form.prenom} onChange={handleChange} required />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact-nom">Nom <span className="text-rose-gold" aria-hidden="true">*</span></label>
                          <input id="contact-nom" autoComplete="family-name" name="nom" className="form-control" value={form.nom} onChange={handleChange} required />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact-email">Email <span className="text-rose-gold" aria-hidden="true">*</span></label>
                          <input id="contact-email" autoComplete="email" type="email" name="email" className="form-control" value={form.email} onChange={handleChange} required />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact-telephone">Téléphone</label>
                          <input id="contact-telephone" autoComplete="tel" type="tel" name="telephone" className="form-control" value={form.telephone} onChange={handleChange} />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="contact-type">Type d'événement <span className="text-rose-gold" aria-hidden="true">*</span></label>
                      <select id="contact-type" name="typeEvenement" className="form-control" value={form.typeEvenement} onChange={handleChange} required>
                        <option value="">— Choisissez —</option>
                        <option value="mariage">Mariage</option>
                        <option value="anniversaire">Anniversaire</option>
                        <option value="evenement-pro">Événement professionnel</option>
                        <option value="location-deco">Location décoration</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="contact-message">Message <span className="text-rose-gold" aria-hidden="true">*</span></label>
                      <textarea id="contact-message" maxLength={5000} name="message" className="form-control" rows={5} value={form.message} onChange={handleChange} required placeholder="Décrivez votre projet, la date souhaitée, le nombre de personnes…" />
                    </div>
                    {/* Honeypot: invisible to people, filled in by bots. */}
                    <div className="hp-field" aria-hidden="true">
                      <label htmlFor="contact-website">Ne pas remplir</label>
                      <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={handleChange} />
                    </div>
                    <button type="submit" className="btn btn-rose-gold w-100" disabled={status === 'loading'}>
                      {status === 'loading'
                        ? <><i className="fas fa-circle-notch fa-spin me-2" />Envoi en cours…</>
                        : <><i className="fas fa-paper-plane me-2" />Envoyer ma demande</>
                      }
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
