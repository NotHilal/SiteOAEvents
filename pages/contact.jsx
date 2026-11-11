import { useState } from 'react'
import Seo, { useLocalBusinessLd } from '../src/components/Seo.jsx'
import PageBanner from '../src/components/PageBanner.jsx'
import { SITE_ADDRESS } from '../src/lib/site.js'
import PhoneInput from '../src/components/PhoneInput.jsx'
import { sendContact } from '../src/lib/public-api.js'
import { cms, Emph, telHref, useCmsContent, useCmsGlobal, useSiteContact } from '../src/lib/cms/client.js'
import { track } from '../src/lib/analytics.js'

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

export async function getServerSideProps() {
  const { getPageProps } = await import('../src/lib/cms/server.js')
  return { props: await getPageProps('contact') }
}

// Texts and banner: Espace OA > Contenu des pages > Contact; phone, e-mail
// and hours: > En-tête, pied de page & coordonnées.
export default function Contact({ cms: initialContent }) {
  const c = useCmsContent('contact', initialContent)
  const global = useCmsGlobal()
  const contact = useSiteContact()
  const businessLd = useLocalBusinessLd()
  const at = path => cms('contact', path)
  const EMPTY = { prenom: '', nom: '', email: '', telephone: '', typeEvenement: '', message: '', website: '' }
  const [form, setForm] = useState(EMPTY)
  const [errorMsg, setErrorMsg] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errors, setErrors] = useState({})
  const [phoneValid, setPhoneValid] = useState(true)
  // Bumped after a successful send to remount (= clear) the phone field.
  const [phoneKey, setPhoneKey] = useState(0)



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

  // Saved server-side, which also emails the company (pages/api/contact.js).
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

    const error = await sendContact({
      prenom: form.prenom.trim() || null,
      nom: form.nom.trim() || null,
      email: form.email.trim(),
      telephone: form.telephone.trim() || null,
      type_evenement: form.typeEvenement || null,
      message: form.message.trim(),
      website: form.website,
    }).then(() => null, e => e)

    if (error && (error.status === 400 || error.status === 429)) {
      // Validation message from the server (e.g. invalid email).
      setErrorMsg(error.message)
      setStatus('error')
      return
    }
    if (!error) {
      setStatus('success')
      setForm(EMPTY)
      setPhoneValid(true)
      setPhoneKey(k => k + 1)
      track('Contact envoyé', { type: form.typeEvenement || 'non précisé' })
    } else {
      setErrorMsg(`Votre message n'a pas pu être envoyé. Vérifiez votre connexion et réessayez, ou écrivez-nous à ${contact.email}.`)
      setStatus('error')
    }
  }

  return (
    <>
      <Seo
        title={c.seo.title}
        description={c.seo.description}
        path="/contact"
        jsonLd={businessLd}
        breadcrumb={[{ name: 'Contact', path: '/contact' }]}
        preloadImage={c.header.image}
      />

      <div className="site-wrap">
        <PageBanner title={c.header.title} crumb="Contact" image={c.header.image} editable={at('header.title')} />

        <section className="contact-section">
          <div className="container">
            <div className="row">
              <div className="col-lg-4 mb-5 mb-lg-0" data-reveal>
                {c.intro.eyebrow && <span className="section-subtitle" {...at('intro.eyebrow')}>{c.intro.eyebrow}</span>}
                <h2 className="section-title" {...at('intro.title')}><Emph text={c.intro.title} /></h2>
                {c.intro.text && <p className="section-text" {...at('intro.text')}>{c.intro.text}</p>}

                {[
                  { icon: 'fas fa-map-marker-alt', title: 'Localisation', text: SITE_ADDRESS, note: `Livraison dans ${global.delivery.zone}`, id: 'localisation', field: 'delivery.zone' },
                  { icon: 'fas fa-phone', title: 'Téléphone', text: contact.phone || 'Sur demande', href: contact.phone ? telHref(contact.phone) : null, field: 'contact.phone' },
                  { icon: 'fas fa-envelope', title: 'Email', text: contact.email, href: `mailto:${contact.email}`, field: 'contact.email' },
                  global.contact.hours && { icon: 'fas fa-clock', title: 'Disponibilité', text: global.contact.hours, note: global.contact.hoursNote, field: 'contact.hours' },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} id={item.id} className="contact-info-item" {...cms('global', item.field)}>
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
                  <h3 {...at('form.title')}>{c.form.title}</h3>
                  {c.form.lead && <p className="lead-text" {...at('form.lead')}>{c.form.lead}</p>}

                  {status === 'success' && (
                    <div className="alert alert-success" role="alert">
                      <i className="fas fa-check-circle me-2" aria-hidden="true" />{c.form.success}
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
                        : <><i className="fas fa-paper-plane me-2" />{c.form.buttonLabel}</>
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
