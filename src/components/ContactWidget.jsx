import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase.js'

// Replaces the old /contact page: a floating button pinned bottom-right on
// every public page that opens the contact form in a panel. Other parts of
// the site open it via openContactWidget(); /contact redirects to
// /?contact=1 (see next.config.js), which opens it on arrival.

const WEB3FORMS_KEY = '380ad0e4-4abc-4a00-81d1-d81067d54129'
const OPEN_EVENT = 'oa:open-contact'
const EMPTY_FORM = { prenom: '', nom: '', email: '', telephone: '', typeEvenement: '', message: '' }

export function openContactWidget() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export default function ContactWidget() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const firstFieldRef = useRef(null)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!router.isReady || router.query.contact !== '1') return
    setOpen(true)
    const { contact, ...query } = router.query
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false })
  }, [router.isReady, router.query.contact])

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => firstFieldRef.current?.focus({ preventScroll: true }), 250)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [open])

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const payload = {
        access_key: WEB3FORMS_KEY,
        subject: '🌹 Nouvelle demande de devis — OA Événementiel',
        from_name: 'OA Événementiel - Site Web',
        'Prénom': form.prenom,
        'Nom': form.nom,
        'Email': form.email,
        'Téléphone': form.telephone,
        "Type d'événement": form.typeEvenement,
        'Message': form.message,
      }
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!result.success) throw new Error('Web3Forms failed')

      await supabase.from('contacts').insert({
        prenom: form.prenom.trim() || null,
        nom: form.nom.trim() || null,
        email: form.email.trim(),
        telephone: form.telephone.trim() || null,
        type_evenement: form.typeEvenement || null,
        message: form.message.trim(),
        read: false,
      })

      setStatus('success')
      setForm(EMPTY_FORM)
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <button
        type="button"
        className={`oa-contact-fab${open ? ' is-open' : ''}`}
        aria-label={open ? 'Fermer le formulaire de contact' : 'Nous contacter'}
        aria-expanded={open}
        aria-controls="oa-contact-panel"
        onClick={() => setOpen(o => !o)}
      >
        <i className={`fas ${open ? 'fa-times' : 'fa-envelope'}`} aria-hidden="true" />
        {!open && <span className="oa-contact-fab-label">Contact</span>}
      </button>

      <div
        id="oa-contact-panel"
        className={`oa-contact-panel${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="oa-contact-title"
        aria-hidden={!open}
        data-lenis-prevent
      >
        <div className="oa-contact-panel-head">
          <div>
            <span className="oa-eyebrow">Parlons de votre projet</span>
            <h3 id="oa-contact-title">Nous contacter</h3>
          </div>
          <button type="button" className="oa-contact-close" aria-label="Fermer" onClick={() => setOpen(false)}>
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        <div className="oa-contact-panel-body">
          <ul className="oa-contact-infos">
            <li><i className="fas fa-envelope" /> <a href="mailto:contact@oa-evenementiel.fr">contact@oa-evenementiel.fr</a></li>
            <li><i className="fas fa-map-marker-alt" /> Île-de-France, France</li>
            <li><i className="fas fa-clock" /> Lun – Dim : 9h – 20h</li>
          </ul>

          {status === 'success' ? (
            <div className="oa-contact-success">
              <i className="fas fa-check-circle" />
              <p>Message envoyé ! Nous vous répondrons sous 24h.</p>
              <button type="button" className="btn btn-rose-gold" onClick={() => setStatus('idle')}>Envoyer un autre message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {status === 'error' && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle me-2" />Une erreur est survenue. Veuillez réessayer.
                </div>
              )}
              <div className="oa-contact-row">
                <div className="form-group">
                  <label htmlFor="cw-prenom">Prénom *</label>
                  <input id="cw-prenom" ref={firstFieldRef} name="prenom" className="form-control" value={form.prenom} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="cw-nom">Nom *</label>
                  <input id="cw-nom" name="nom" className="form-control" value={form.nom} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="cw-email">Email *</label>
                <input id="cw-email" type="email" name="email" className="form-control" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="cw-tel">Téléphone</label>
                <input id="cw-tel" type="tel" name="telephone" className="form-control" value={form.telephone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="cw-type">Type d'événement *</label>
                <select id="cw-type" name="typeEvenement" className="form-control" value={form.typeEvenement} onChange={handleChange} required>
                  <option value="">— Choisissez —</option>
                  <option value="mariage">Mariage</option>
                  <option value="anniversaire">Anniversaire</option>
                  <option value="evenement-pro">Événement professionnel</option>
                  <option value="location-deco">Location décoration</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="cw-message">Message *</label>
                <textarea id="cw-message" name="message" className="form-control" rows={4} value={form.message} onChange={handleChange} required placeholder="Votre projet, la date souhaitée, le nombre de personnes…" />
              </div>
              <input type="text" name="_honey" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <button type="submit" className="btn btn-rose-gold w-100" disabled={status === 'loading'}>
                {status === 'loading'
                  ? <><i className="fas fa-circle-notch fa-spin me-2" />Envoi en cours…</>
                  : <><i className="fas fa-paper-plane me-2" />Envoyer ma demande</>
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
