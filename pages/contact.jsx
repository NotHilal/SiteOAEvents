import { useEffect, useState } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import AOS from 'aos'
import { supabase } from '../src/lib/supabase.js'

const WEB3FORMS_KEY = '380ad0e4-4abc-4a00-81d1-d81067d54129'

export default function Contact() {
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', typeEvenement: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | loading | success | error

  useEffect(() => {
    AOS.init({ duration: 820, easing: 'ease-in-out', once: true, offset: 55 })
    AOS.refresh()
  }, [])

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
      setForm({ prenom: '', nom: '', email: '', telephone: '', typeEvenement: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <Head>
        <title>Contact — OA Événementiel</title>
        <meta name="description" content="Contactez-nous pour toute demande de devis ou d'information pour vos mariages, anniversaires et événements professionnels en Île-de-France." />
      </Head>

      <div className="site-wrap">
        <div
          className="page-header"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=80)' }}
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
              <div className="col-lg-4 mb-5 mb-lg-0" data-aos="fade-right">
                <span className="section-subtitle">Parlons de votre projet</span>
                <h2 className="section-title">Nous Sommes à Votre Écoute</h2>
                <p className="section-text">N'hésitez pas à nous contacter pour toute demande de renseignements ou pour démarrer la planification de votre événement.</p>

                {[
                  { icon: 'fas fa-map-marker-alt', title: 'Localisation', text: 'Île-de-France, France' },
                  { icon: 'fas fa-phone', title: 'Téléphone', text: 'Sur demande' },
                  { icon: 'fas fa-envelope', title: 'Email', text: 'contact@oa-evenementiel.fr' },
                  { icon: 'fas fa-clock', title: 'Disponibilité', text: 'Lun – Sam : 9h – 19h' },
                ].map((item, i) => (
                  <div key={i} className="contact-info-item">
                    <div className="contact-info-icon"><i className={item.icon} /></div>
                    <div className="contact-info-text">
                      <h5>{item.title}</h5>
                      <p>{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-lg-8" data-aos="fade-left" data-aos-delay="100">
                <div className="contact-form-wrap">
                  <h3>Demande de devis</h3>
                  <p className="lead-text">Remplissez ce formulaire et nous vous répondrons dans les 24h.</p>

                  {status === 'success' && (
                    <div className="alert alert-success" role="alert">
                      <i className="fas fa-check-circle me-2" />Message envoyé ! Nous vous répondrons très vite.
                    </div>
                  )}
                  {status === 'error' && (
                    <div className="alert alert-danger" role="alert">
                      <i className="fas fa-exclamation-triangle me-2" />Une erreur est survenue. Veuillez réessayer.
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Prénom <span className="text-rose-gold">*</span></label>
                          <input name="prenom" className="form-control" value={form.prenom} onChange={handleChange} required />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Nom <span className="text-rose-gold">*</span></label>
                          <input name="nom" className="form-control" value={form.nom} onChange={handleChange} required />
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Email <span className="text-rose-gold">*</span></label>
                          <input type="email" name="email" className="form-control" value={form.email} onChange={handleChange} required />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Téléphone</label>
                          <input type="tel" name="telephone" className="form-control" value={form.telephone} onChange={handleChange} />
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Type d'événement <span className="text-rose-gold">*</span></label>
                      <select name="typeEvenement" className="form-control" value={form.typeEvenement} onChange={handleChange} required>
                        <option value="">— Choisissez —</option>
                        <option value="mariage">Mariage</option>
                        <option value="anniversaire">Anniversaire</option>
                        <option value="evenement-pro">Événement professionnel</option>
                        <option value="location-deco">Location décoration</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Message <span className="text-rose-gold">*</span></label>
                      <textarea name="message" className="form-control" rows={5} value={form.message} onChange={handleChange} required placeholder="Décrivez votre projet, la date souhaitée, le nombre de personnes…" />
                    </div>
                    <input type="text" name="_honey" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
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
