import React from 'react'
import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import Loader from '../components/Loader.jsx'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
const DAYS_FR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']
const EVENT_LABELS = {
  'mariage':'Mariage','anniversaire':'Anniversaire',
  'evenement-pro':'Événement professionnel',
  'location-deco':'Location décoration','autre':'Autre'
}

function fmtDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}
function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

export default function Reservation() {
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [blockedDates, setBlockedDates] = useState(new Set())
  const [blockedHours, setBlockedHours] = useState({})
  const [busyDates, setBusyDates] = useState(new Set())
  const [selectedDates, setSelectedDates] = useState([])
  const [timeType, setTimeType] = useState('full')
  const [selectedHours, setSelectedHours] = useState([])
  const [calError, setCalError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [materialsData, setMaterialsData] = useState([])
  const [stockUsed, setStockUsed] = useState({})
  const [cart, setCart] = useState({}) // { [id]: qty }
  const [form, setForm] = useState({ prenom:'', nom:'', email:'', phone:'', type:'', nb:'', message:'' })
  const [step2Error, setStep2Error] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const wizardRef = useRef(null)

  useEffect(() => {
    document.title = 'Réservation — OA Événementiel'
    loadBlockedData()
    loadMaterials()
  }, [])

  async function loadBlockedData() {
    try {
      const [bd, bh, resv] = await Promise.all([
        supabase.from('blocked_dates').select('date'),
        supabase.from('blocked_hours').select('date, hour'),
        supabase.from('reservations').select('date, dates').in('status', ['confirmed','pending']),
      ])
      const bSet = new Set((bd.data||[]).map(r => r.date))
      const hMap = {}
      ;(bh.data||[]).forEach(r => {
        if (!hMap[r.date]) hMap[r.date] = []
        hMap[r.date].push(r.hour)
      })
      const busy = new Set()
      ;(resv.data||[]).forEach(r => {
        const dates = r.dates || [r.date]
        dates.forEach(d => busy.add(d))
      })
      setBlockedDates(bSet)
      setBlockedHours(hMap)
      setBusyDates(busy)
    } catch {}
  }

  async function loadStockForDates(dates) {
    if (!dates.length) { setStockUsed({}); return }
    try {
      const max = dates[dates.length - 1]
      const res = await supabase.from('reservations')
        .select('materials, date, dates')
        .in('status', ['confirmed','pending'])
        .lte('date', max)
      const used = {}
      ;(res.data||[]).forEach(r => {
        const rDates = r.dates || [r.date]
        if (!dates.some(d => rDates.includes(d))) return
        ;(r.materials||[]).forEach(m => {
          const k = String(m.id)
          used[k] = Math.max(used[k]||0, parseInt(m.quantity)||0)
        })
      })
      setStockUsed(used)
    } catch {}
  }

  async function loadMaterials() {
    const res = await supabase.from('materials').select('*').eq('available', true).order('category')
    setMaterialsData(res.data || [])
  }

  function getAvail(m) {
    return Math.max(0, m.max_quantity - (stockUsed[String(m.id)]||0))
  }

  function showCalError(msg) {
    setCalError(msg)
    setTimeout(() => setCalError(''), 4000)
  }

  function toggleDate(dateStr) {
    const idx = selectedDates.indexOf(dateStr)
    if (idx !== -1) {
      const isEdge = (idx === 0 || idx === selectedDates.length - 1)
      if (!isEdge) {
        showCalError('Pour retirer un jour intermédiaire, commencez par les extrémités ou effacez tout.')
        return
      }
      const next = selectedDates.filter((_, i) => i !== idx)
      setSelectedDates(next)
      if (!next.length) { setTimeType('full'); setSelectedHours([]); setStockUsed({}) }
      else loadStockForDates(next)
      return
    }
    if (selectedDates.length === 0) {
      const next = [dateStr]
      setSelectedDates(next)
      loadStockForDates(next)
      return
    }
    if (selectedDates.length >= 3) {
      showCalError('Maximum 3 jours consécutifs atteint. Effacez la sélection pour recommencer.')
      return
    }
    const minDate = selectedDates[0]
    const maxDate = selectedDates[selectedDates.length - 1]
    const prev = addDays(minDate, -1)
    const next = addDays(maxDate, 1)
    if (dateStr === prev || dateStr === next) {
      if (busyDates.has(dateStr)) {
        showCalError('Ce jour est déjà réservé — impossible de l\'inclure dans une plage multi-jours.')
        return
      }
      const updated = [...selectedDates, dateStr].sort()
      setSelectedDates(updated)
      loadStockForDates(updated)
    } else {
      const updated = [dateStr]
      setSelectedDates(updated)
      setTimeType('full')
      setSelectedHours([])
      loadStockForDates(updated)
    }
  }

  function clearAllDates() {
    setSelectedDates([])
    setTimeType('full')
    setSelectedHours([])
    setStockUsed({})
  }

  function toggleHour(h) {
    setSelectedHours(prev =>
      prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]
    )
  }

  function validateStep(n) {
    if (n === 1) {
      if (!selectedDates.length) return false
      if (timeType === 'hours' && !selectedHours.length) return false
      return true
    }
    if (n === 2) {
      const { prenom, nom, email, type, nb } = form
      if (!prenom||!nom||!email.includes('@')||!type||!nb||parseInt(nb)<1) {
        setStep2Error(true)
        return false
      }
      return true
    }
    return true
  }

  function goNext() {
    if (!validateStep(currentStep)) return
    if (currentStep === 4) { submitForm(); return }
    setCurrentStep(c => c + 1)
    setTimeout(() => wizardRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 50)
  }

  function goPrev() {
    if (currentStep > 1) {
      setCurrentStep(c => c - 1)
      setTimeout(() => wizardRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 50)
    }
  }

  async function submitForm() {
    setSubmitting(true)
    setSubmitError(false)
    let message = form.message
    if (timeType === 'hours' && selectedHours.length) {
      const line = 'Créneaux demandés : ' + [...selectedHours].sort().join(', ')
      message = message ? line + '\n\n' + message : line
    }
    const mats = Object.entries(cart)
      .filter(([,q]) => q > 0)
      .map(([id, qty]) => {
        const m = materialsData.find(x => String(x.id) === id)
        return { id, name: m?.name || '?', quantity: qty }
      })
    try {
      const { error } = await supabase.from('reservations').insert({
        prenom: form.prenom.trim() || null,
        nom: form.nom.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        date: selectedDates[0],
        dates: selectedDates,
        event_type: form.type,
        nb_persons: parseInt(form.nb),
        materials: mats,
        message: message || null,
        status: 'pending',
      })
      if (error) throw error
      setSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const formatDateLabel = (ds) => {
    const d = new Date(ds + 'T00:00:00')
    return DAYS_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]
  }

  const recapDate = () => {
    if (!selectedDates.length) return '—'
    if (selectedDates.length === 1) {
      const d = new Date(selectedDates[0] + 'T00:00:00')
      return capitalise(DAYS_FR[d.getDay()]) + ' ' + d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear()
    }
    return selectedDates.map(formatDateLabel).join(' · ') + ' (' + selectedDates.length + ' jours)'
  }

  const recapMats = () => {
    const entries = Object.entries(cart).filter(([,q]) => q > 0)
    if (!entries.length) return 'Aucun matériel sélectionné'
    return entries.map(([id, qty]) => {
      const m = materialsData.find(x => String(x.id) === id)
      return (m?.name || '?') + ' × ' + qty
    }).join(', ')
  }

  const isMulti = selectedDates.length > 1

  /* Build calendar cells */
  const today = new Date(); today.setHours(0,0,0,0)
  const firstDay = (new Date(calYear, calMonth, 1).getDay() + 6) % 7
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  const calCells = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDay + 1
    if (i < firstDay || dayNum > daysInMonth) {
      calCells.push({ empty: true })
    } else {
      const d = new Date(calYear, calMonth, dayNum)
      const ds = fmtDate(d)
      const isPast = d <= today
      const isBlk = blockedDates.has(ds)
      const blkH = blockedHours[ds] || []
      const allBlk = blkH.length >= HOURS.length
      const isWkend = d.getDay() === 0 || d.getDay() === 6
      const partial = !isPast && !isBlk && !allBlk && blkH.length > 0
      const isBusy = !isPast && !isBlk && !allBlk && !partial && busyDates.has(ds)
      const isSel = selectedDates.includes(ds)
      const disabled = isPast || isBlk || allBlk
      let isAdj = false
      if (!disabled && !isSel && selectedDates.length > 0 && selectedDates.length < 3) {
        isAdj = (ds === addDays(selectedDates[0], -1) || ds === addDays(selectedDates[selectedDates.length-1], 1))
      }
      calCells.push({ dayNum, ds, isPast, isBlk, allBlk, isWkend, partial, isBusy, isSel, disabled, isAdj })
    }
  }

  /* Cat grouping for materials */
  const matsByCategory = materialsData.reduce((acc, m) => {
    const cat = m.category || 'Autre'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(m)
    return acc
  }, {})

  const prevDisabled = new Date(calYear, calMonth, 1) <= new Date(now.getFullYear(), now.getMonth(), 1)

  if (success) {
    return (
      <div className="site-wrap">
        <Navbar />
        <section className="resa-section">
          <div className="container">
            <div className="resa-success-msg">
              <span className="success-icon"><i className="fas fa-check-circle" /></span>
              <h3>Demande envoyée !</h3>
              <p>Votre demande de réservation a bien été reçue. Nous vous répondrons dans les plus brefs délais pour confirmer les détails.</p>
              <Link to="/" className="btn btn-rose-gold mt-3">Retour à l'accueil</Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    )
  }

  return (
    <div className="site-wrap">
      <Loader />
      <Navbar />

      <div
        className="page-header"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1920&q=80)' }}
      >
        <div className="page-header-overlay" />
        <div className="container">
          <h1>Réservation</h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb justify-content-center">
              <li className="breadcrumb-item"><Link to="/">Accueil</Link></li>
              <li className="breadcrumb-item active">Réservation</li>
            </ol>
          </nav>
        </div>
      </div>

      <section className="resa-section">
        <div className="container">
          <div id="resa-wizard" ref={wizardRef}>
            {/* Stepper */}
            <div className="resa-stepper">
              {['Date', 'Infos', 'Matériaux', 'Récap'].map((label, i) => {
                const n = i + 1
                const isDone = currentStep > n
                const isActive = currentStep === n
                return (
                  <React.Fragment key={n}>
                    <div className={`resa-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                      <div className="step-circle">
                        {isDone ? <i className="fas fa-check" /> : n}
                      </div>
                      <span className="step-label">{label}</span>
                    </div>
                    {n < 4 && <div className={`step-line${isDone ? ' done' : ''}`} />}
                  </React.Fragment>
                )
              })}
            </div>

            {/* STEP 1 — Date */}
            {currentStep === 1 && (
              <div className="step-panel">
                <span className="step-tag">Étape 1 / 4</span>
                <h2 className="step-title">Choisissez vos dates</h2>
                <p className="step-desc">Sélectionnez 1 à 3 jours consécutifs pour votre événement.</p>

                {/* Calendar */}
                <div className="res-cal-wrap">
                  <div className="res-cal-header">
                    <button className="res-cal-nav" disabled={prevDisabled} onClick={() => {
                      if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) }
                      else setCalMonth(m => m-1)
                    }}>
                      <i className="fas fa-chevron-left" />
                    </button>
                    <span className="res-cal-month">{MONTHS_FR[calMonth]} {calYear}</span>
                    <button className="res-cal-nav" onClick={() => {
                      if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) }
                      else setCalMonth(m => m+1)
                    }}>
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                  <div className="res-cal-weekdays">
                    {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d, i) => (
                      <span key={d} className={i >= 5 ? 'rcd-weekend-hd' : ''}>{d}</span>
                    ))}
                  </div>
                  <div className="res-cal-grid">
                    {calCells.map((cell, i) => {
                      if (cell.empty) return <div key={i} className="rcd rcd-empty" />
                      let cls = 'rcd'
                      if (cell.disabled) cls += ' rcd-disabled'
                      else { cls += ' rcd-avail'; if (cell.isWkend) cls += ' rcd-weekend' }
                      if (cell.partial) cls += ' rcd-partial'
                      if (cell.isBusy) cls += ' rcd-booked'
                      if (cell.isSel) cls += ' rcd-selected'
                      if (cell.isAdj) cls += ' rcd-adjacent'
                      return (
                        <div
                          key={i}
                          className={cls}
                          onClick={() => !cell.disabled && toggleDate(cell.ds)}
                        >
                          <span>{cell.dayNum}</span>
                          {cell.isSel && <i className="fas fa-check rcd-check" />}
                        </div>
                      )
                    })}
                  </div>
                  {calError && (
                    <div className="res-cal-error">
                      <i className="fas fa-exclamation-circle" />
                      <span>{calError}</span>
                    </div>
                  )}
                  <div className="res-cal-hint">
                    <i className="fas fa-info-circle" />
                    <span>
                      {!selectedDates.length
                        ? 'Cliquez sur le jour de départ (3 jours consécutifs maximum)'
                        : selectedDates.length >= 3
                          ? 'Maximum atteint — retirez un jour ou effacez tout pour recommencer'
                          : selectedDates.length + ' jour sélectionné — cliquez sur un jour adjacent pour l\'ajouter (max 3)'
                      }
                    </span>
                  </div>
                  <div className="res-cal-legend">
                    <div className="res-leg-item"><div className="res-leg-dot res-leg-avail" /><span>Disponible</span></div>
                    <div className="res-leg-item"><div className="res-leg-dot res-leg-partial" /><span>Partiellement bloqué</span></div>
                    <div className="res-leg-item"><div className="res-leg-dot res-leg-booked" /><span>Réservé</span></div>
                    <div className="res-leg-item"><div className="res-leg-dot res-leg-blocked" /><span>Indisponible</span></div>
                  </div>
                </div>

                {/* Time section */}
                {selectedDates.length > 0 && (
                  <div className="res-time-section">
                    <div className="res-dates-header">
                      <i className="fas fa-calendar-check" />
                      <span>{selectedDates.length} jour{selectedDates.length>1?'s':''} sélectionné{selectedDates.length>1?'s':''}</span>
                    </div>
                    <div className="res-dates-pills">
                      {selectedDates.map(ds => (
                        <span key={ds} className="date-pill">
                          {formatDateLabel(ds)}
                          <button className="date-pill-rm" onClick={() => toggleDate(ds)}>
                            <i className="fas fa-times" />
                          </button>
                        </span>
                      ))}
                    </div>

                    {isMulti && (
                      <div className="res-multiday-note">
                        <i className="fas fa-info-circle" />
                        <span>Pour une réservation multi-jours, le créneau journée entière est appliqué automatiquement.</span>
                      </div>
                    )}

                    <p className="res-time-label">Type de créneau</p>
                    <div className="res-time-tabs">
                      <button
                        className={`res-time-tab${timeType==='full'?' active':''}`}
                        onClick={() => { setTimeType('full'); setSelectedHours([]) }}
                      >
                        <i className="fas fa-sun" />Toute la journée
                      </button>
                      {!isMulti && (
                        <button
                          className={`res-time-tab${timeType==='hours'?' active':''}`}
                          onClick={() => setTimeType('hours')}
                        >
                          <i className="fas fa-clock" />Heures spécifiques
                        </button>
                      )}
                    </div>

                    {timeType === 'hours' && (
                      <div className="res-hours-section">
                        <p className="res-hours-hint"><i className="fas fa-info-circle" />Sélectionnez vos créneaux horaires</p>
                        <div className="res-hours-grid">
                          {HOURS.map(h => {
                            const blocked = (blockedHours[selectedDates[0]]||[]).includes(h)
                            const active = selectedHours.includes(h)
                            return (
                              <button
                                key={h}
                                className={`res-hour-pill${blocked?' res-hour-blocked':''}${active?' res-hour-active':''}`}
                                disabled={blocked}
                                onClick={() => !blocked && toggleHour(h)}
                              >
                                {h}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <button className="res-change-btn mt-2" onClick={clearAllDates}>
                      <i className="fas fa-times me-1" />Effacer la sélection
                    </button>
                  </div>
                )}

                {!selectedDates.length && (
                  <div className="resa-alert" style={{display:'none'}} id="resa-date-error">
                    <i className="fas fa-exclamation-circle" />Veuillez sélectionner au moins une date.
                  </div>
                )}

                <div className="step-nav mt-4">
                  <span />
                  <button className="btn btn-rose-gold step-next-btn" onClick={goNext} disabled={!selectedDates.length || (timeType==='hours' && !selectedHours.length)}>
                    Continuer <i className="fas fa-arrow-right ms-1" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Infos */}
            {currentStep === 2 && (
              <div className="step-panel">
                <span className="step-tag">Étape 2 / 4</span>
                <h2 className="step-title">Vos informations</h2>
                <p className="step-desc">Renseignez vos coordonnées et les détails de votre événement.</p>

                <div className="resa-row">
                  <div className="form-group">
                    <label>Prénom <span className="req">*</span></label>
                    <input className="form-control" value={form.prenom} onChange={e => setForm(f=>({...f,prenom:e.target.value}))} style={step2Error && !form.prenom ? {borderColor:'#e53e3e'} : {}} />
                  </div>
                  <div className="form-group">
                    <label>Nom <span className="req">*</span></label>
                    <input className="form-control" value={form.nom} onChange={e => setForm(f=>({...f,nom:e.target.value}))} style={step2Error && !form.nom ? {borderColor:'#e53e3e'} : {}} />
                  </div>
                </div>
                <div className="resa-row">
                  <div className="form-group">
                    <label>Email <span className="req">*</span></label>
                    <input type="email" className="form-control" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} style={step2Error && !form.email.includes('@') ? {borderColor:'#e53e3e'} : {}} />
                  </div>
                  <div className="form-group">
                    <label>Téléphone</label>
                    <input type="tel" className="form-control" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} />
                  </div>
                </div>
                <div className="resa-row">
                  <div className="form-group">
                    <label>Type d'événement <span className="req">*</span></label>
                    <select className="form-control" value={form.type} onChange={e => { setForm(f=>({...f,type:e.target.value})); setStep2Error(false) }} style={step2Error && !form.type ? {borderColor:'#e53e3e'} : {}}>
                      <option value="">— Choisissez —</option>
                      <option value="mariage">Mariage</option>
                      <option value="anniversaire">Anniversaire</option>
                      <option value="evenement-pro">Événement professionnel</option>
                      <option value="location-deco">Location décoration</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nombre de personnes <span className="req">*</span></label>
                    <input type="number" min={1} className="form-control" value={form.nb} onChange={e => { setForm(f=>({...f,nb:e.target.value})); setStep2Error(false) }} style={step2Error && (!form.nb || parseInt(form.nb) < 1) ? {borderColor:'#e53e3e'} : {}} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Message / Précisions</label>
                  <textarea className="form-control" value={form.message} onChange={e => setForm(f=>({...f,message:e.target.value}))} placeholder="Décrivez votre événement, vos souhaits particuliers…" />
                </div>

                {step2Error && (
                  <div className="resa-alert">
                    <i className="fas fa-exclamation-circle" />Veuillez remplir tous les champs obligatoires.
                  </div>
                )}

                <div className="step-nav">
                  <button className="step-prev-btn" onClick={goPrev}><i className="fas fa-arrow-left me-1" />Retour</button>
                  <button className="btn btn-rose-gold step-next-btn" onClick={goNext}>
                    Continuer <i className="fas fa-arrow-right ms-1" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Matériaux */}
            {currentStep === 3 && (
              <div className="step-panel">
                <span className="step-tag">Étape 3 / 4</span>
                <h2 className="step-title">Matériaux & Décoration</h2>
                <p className="step-desc">Sélectionnez les articles que vous souhaitez louer pour votre événement.</p>

                {!materialsData.length && (
                  <p className="no-mat-msg"><i className="fas fa-info-circle me-2" />Aucun matériel disponible pour le moment.</p>
                )}

                {Object.entries(matsByCategory).map(([cat, mats]) => (
                  <div key={cat} className="mat-category">
                    <h6 className="mat-cat-label">{cat}</h6>
                    <div className="mat-grid">
                      {mats.map(m => {
                        const avail = getAvail(m)
                        const unavail = avail <= 0
                        const qty = cart[String(m.id)] || 0
                        const selected = qty > 0
                        return (
                          <div key={m.id} className={`mat-card${selected?' mat-card-checked':''}${unavail?' mat-card-unavail':''}`}>
                            <div className={`mat-card-img${!m.image_url?' mat-card-img-empty':''}`}>
                              {m.image_url
                                ? <img src={m.image_url} alt={m.name} />
                                : <i className="fas fa-image" />
                              }
                              {unavail && (
                                <div className="mat-unavail-overlay"><i className="fas fa-ban" /> Indisponible</div>
                              )}
                            </div>
                            <div className="mat-card-body">
                              <label className={`mat-check-label${unavail?' mat-check-disabled':''}`}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={unavail}
                                  onChange={e => {
                                    if (e.target.checked) setCart(c => ({...c, [String(m.id)]: 1}))
                                    else setCart(c => { const n={...c}; delete n[String(m.id)]; return n })
                                  }}
                                />
                                <div>
                                  <span className="mat-name">{m.name}</span>
                                  {m.description && <span className="mat-desc">{m.description}</span>}
                                </div>
                              </label>
                              <div className="mat-stock-row">
                                {unavail
                                  ? <span className="mat-stock-badge mat-stock-out"><i className="fas fa-times-circle" /> Épuisé</span>
                                  : <span className="mat-stock-badge mat-stock-ok"><i className="fas fa-check-circle" /> {avail} disponible{avail>1?'s':''}</span>
                                }
                              </div>
                              {selected && (
                                <div className="mat-qty-wrap">
                                  <button className="qty-btn" onClick={() => setCart(c => ({...c,[String(m.id)]: Math.max(1,qty-1)}))}>−</button>
                                  <span className="qty-val">{qty}</span>
                                  <button className="qty-btn" onClick={() => setCart(c => ({...c,[String(m.id)]: Math.min(avail,qty+1)}))}>+</button>
                                  <span className="qty-max">/ {avail}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                <div className="step-nav">
                  <button className="step-prev-btn" onClick={goPrev}><i className="fas fa-arrow-left me-1" />Retour</button>
                  <button className="btn btn-rose-gold step-next-btn" onClick={goNext}>
                    Continuer <i className="fas fa-arrow-right ms-1" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4 — Récap */}
            {currentStep === 4 && (
              <div className="step-panel">
                <span className="step-tag">Étape 4 / 4</span>
                <h2 className="step-title">Récapitulatif</h2>
                <p className="step-desc">Vérifiez les informations avant d'envoyer votre demande.</p>

                <div className="recap-card">
                  {[
                    { icon: 'fas fa-user', label: 'Nom', value: ((form.prenom + ' ' + form.nom).trim() || '—') },
                    { icon: 'fas fa-calendar', label: 'Date(s)', value: recapDate() },
                    { icon: 'fas fa-clock', label: 'Créneau', value: timeType==='full' ? 'Toute la journée' : [...selectedHours].sort().join(' — ') },
                    { icon: 'fas fa-envelope', label: 'Email', value: form.email },
                    { icon: 'fas fa-tag', label: 'Événement', value: EVENT_LABELS[form.type] || '—' },
                    { icon: 'fas fa-users', label: 'Personnes', value: form.nb ? form.nb + ' personne(s)' : '—' },
                    { icon: 'fas fa-boxes', label: 'Matériaux', value: recapMats() },
                    ...(form.message ? [{ icon: 'fas fa-comment', label: 'Message', value: form.message }] : []),
                  ].map((row, i) => (
                    <div key={i} className="recap-row">
                      <span className="recap-lbl"><i className={row.icon} />{row.label}</span>
                      <span className="recap-val">{row.value}</span>
                    </div>
                  ))}
                </div>

                {submitError && (
                  <div className="resa-alert mt-3">
                    <i className="fas fa-exclamation-circle" />Une erreur est survenue. Veuillez réessayer.
                  </div>
                )}

                <p className="resa-privacy">En envoyant ce formulaire, vous acceptez que vos données soient utilisées pour traiter votre demande.</p>

                <div className="step-nav">
                  <button className="step-prev-btn" onClick={goPrev}><i className="fas fa-arrow-left me-1" />Retour</button>
                  <button className="btn btn-rose-gold step-next-btn" onClick={goNext} disabled={submitting}>
                    {submitting
                      ? <><i className="fas fa-circle-notch fa-spin me-1" />Envoi…</>
                      : <>Envoyer ma demande <i className="fas fa-paper-plane ms-1" /></>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

