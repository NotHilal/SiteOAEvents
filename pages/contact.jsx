import { useEffect, useState } from 'react'
import Link from 'next/link'
import Seo from '../src/components/Seo.jsx'
import PhoneInput from '../src/components/PhoneInput.jsx'
import { supabase } from '../src/lib/supabase.js'
import { track } from '../src/lib/analytics.js'

const WEB3FORMS_KEY = '380ad0e4-4abc-4a00-81d1-d81067d54129'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Same rules the browser's required/type=email checks applied before, plus
// the phone number having to match the selected country. Shown under each
// field instead of as browser bubbles.
function validate(form, phoneValid) {
  const e = {}
  if (!form.prenom.trim()) e.prenom = 'Veuillez indiquer votre prénom.'
  if (!form.nom.trim()) e.nom = 'Veuillez indiquer votre nom.'
  if (!form.email.trim()) e.email = 'Veuillez indiquer votre email.'
  else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Adresse email invalide.'
  if (!phoneValid) e.telephone = 'Numéro invalide pour le pays sélectionné.'
  if (!form.typeEvenement) e.typeEvenement = "Veuillez choisir un type d'événement."
  if (!form.message.trim()) e.message = 'Veuillez décrire votre projet.'
  return e
}

const PAGE_HEADER_DEFAULT = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&q=75&auto=format&fit=crop'

export default function Contact() {
  const EMPTY = { prenom: '', nom: '', email: '', telephone: '', typeEvenement: '', message: '', website: '' }
  const [form, setForm] = useState(EMPTY)
  const [errorMsg, setErrorMsg] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [images, setImages] = useState({})
  const [errors, setErrors] = useState({})
  const [phoneValid, setPhoneValid] = useState(true)
  // Bumped after a successful send to remount (= clear) the phone field.
  const [phoneKey, setPhoneKey] = useState(0)


  useEffect(() => {
    supabase.from('site_content').select('*').eq('key', 'images_contact').then(({ data }) => {
      const row = data && data[0]
      if (!row) return
      try { setImages(JSON.parse(row.value)) } catch {}
    })
  }, [])

  const clearError = (name) => setErrors(prev => (prev[name] ? { ...prev, [name]: undefined } : prev))
  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    clearError(e.target.name)
  }
  const handlePhoneChange = ({ number, valid }) => {
    setForm(prev => ({ ...prev, telephone: number }))
    setPhoneValid(valid)
    if (valid) clearError('telephone')
  }
  // Props wiring a field to its error message under it.
  const fieldProps = (name, id) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-error` : undefined,
  })
  const fieldError = (name, id) => errors[name] && (
    <p className="field-error" id={`${id}-error`}>{errors[name]}</p>
  )

  // Saved to our database first (the admin's Messages tab is the source of
  // truth), then forwarded by email via Web3Forms. Success if at least one
  // of the two went through; the form keeps what was typed on failure.
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status === 'loading') return
    const found = validate(form, phoneValid)
    setErrors(found)
    const firstInvalid = Object.keys(found).find(k => found[k])
    if (firstInvalid) {
      e.currentTarget.querySelector(`[name="${firstInvalid}"]`)?.focus()
      return
    }
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
      setPhoneValid(true)
      setPhoneKey(k => k + 1)
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
                  { icon: 'fas fa-map-marker-alt', title: 'Localisation', text: 'Île-de-France, France', id: 'localisation' },
                  { icon: 'fas fa-phone', title: 'Téléphone', text: 'Sur demande' },
                  { icon: 'fas fa-envelope', title: 'Email', text: 'contact@oa-evenementiel.fr', href: 'mailto:contact@oa-evenementiel.fr' },
                  { icon: 'fas fa-clock', title: 'Disponibilité', text: 'Lun – Dim : 9h – 20h', note: 'Livraison et prestations possibles 24h/24, 7j/7' },
                ].map((item, i) => (
                  <div key={i} id={item.id} className="contact-info-item">
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
                  <form className="contact-form" onSubmit={handleSubmit} noValidate>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact-prenom">Prénom <span className="text-rose-gold" aria-hidden="true">*</span></label>
                          <input id="contact-prenom" autoComplete="given-name" name="prenom" className="form-control" value={form.prenom} onChange={handleChange} required {...fieldProps('prenom', 'contact-prenom')} />
                          {fieldError('prenom', 'contact-prenom')}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact-nom">Nom <span className="text-rose-gold" aria-hidden="true">*</span></label>
                          <input id="contact-nom" autoComplete="family-name" name="nom" className="form-control" value={form.nom} onChange={handleChange} required {...fieldProps('nom', 'contact-nom')} />
                          {fieldError('nom', 'contact-nom')}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact-email">Email <span className="text-rose-gold" aria-hidden="true">*</span></label>
                          <input id="contact-email" autoComplete="email" type="email" name="email" className="form-control" value={form.email} onChange={handleChange} required {...fieldProps('email', 'contact-email')} />
                          {fieldError('email', 'contact-email')}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="contact-telephone">Téléphone</label>
                          <PhoneInput
                            key={phoneKey}
                            id="contact-telephone"
                            name="telephone"
                            onChange={handlePhoneChange}
                            invalid={!!errors.telephone}
                            describedBy={errors.telephone ? 'contact-telephone-error' : undefined}
                          />
                          {fieldError('telephone', 'contact-telephone')}
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="contact-type">Type d'événement <span className="text-rose-gold" aria-hidden="true">*</span></label>
                      <select id="contact-type" name="typeEvenement" className="form-control" value={form.typeEvenement} onChange={handleChange} required {...fieldProps('typeEvenement', 'contact-type')}>
                        <option value="">— Choisissez —</option>
                        <option value="mariage">Mariage</option>
                        <option value="anniversaire">Anniversaire</option>
                        <option value="evenement-pro">Événement professionnel</option>
                        <option value="location-deco">Location décoration</option>
                        <option value="autre">Autre</option>
                      </select>
                      {fieldError('typeEvenement', 'contact-type')}
                    </div>
                    <div className="form-group">
                      <label htmlFor="contact-message">Message <span className="text-rose-gold" aria-hidden="true">*</span></label>
                      <textarea id="contact-message" maxLength={5000} name="message" className="form-control" rows={5} value={form.message} onChange={handleChange} required placeholder="Décrivez votre projet, la date souhaitée, le nombre de personnes…" {...fieldProps('message', 'contact-message')} />
                      {fieldError('message', 'contact-message')}
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
