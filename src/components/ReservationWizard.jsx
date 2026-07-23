import React from 'react'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase.js'

const HOURS =['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
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

const EMPTY_FORM = { prenom:'', nom:'', email:'', phone:'', address:'', type:'', nb:'', message:'' }

// Shared by pages/reservation.jsx (simulation=false, submits a real request)
// and pages/devis.jsx (simulation=true, same steps but the last one just
// displays the computed quote instead of writing to the database).
export default function ReservationWizard({ simulation = false }) {
  const router = useRouter()
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
  const [matFilter, setMatFilter] = useState('all')
  const [matSearch, setMatSearch] = useState('')
  const [matPage, setMatPage] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)
  const [addressSuggestions, setAddressSuggestions] = useState([])
  const [showAddrSuggestions, setShowAddrSuggestions] = useState(false)
  const addrDebounceRef = useRef(null)
  const [step2Error, setStep2Error] = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [quote, setQuote] = useState(null) // { distanceKm, durationMin, fee }
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const wizardRef = useRef(null)

  // Shown on the success screen once the request is submitted — the order
  // reference the client will need on /suivi to check status and pay once
  // confirmed (payment happens there, not here — see PaymentFlow.jsx).
  // Stays null in simulation mode since nothing is ever created.
  const [orderReference, setOrderReference] = useState(null)

  useEffect(() => {
    loadBlockedData()
    loadMaterials()
  }, [])

  // Pick up anything carried over from a simulation on /devis (see
  // finishSimulation's "Faire une vraie demande" button) so converting a
  // simulation into a real request doesn't mean retyping everything —
  // sessionStorage rather than a query string/router state since it's a
  // one-shot handoff between two separate pages. Real reservation page only:
  // a simulation should never inherit an earlier simulation's data.
  useEffect(() => {
    if (simulation || typeof window === 'undefined') return
    const raw = sessionStorage.getItem('oa_devis_prefill')
    if (!raw) return
    sessionStorage.removeItem('oa_devis_prefill')
    try {
      const saved = JSON.parse(raw)
      if (saved.selectedDates?.length) {
        setSelectedDates(saved.selectedDates)
        loadStockForDates(saved.selectedDates)
        const d = new Date(saved.selectedDates[0] + 'T00:00:00')
        setCalYear(d.getFullYear())
        setCalMonth(d.getMonth())
      }
      if (saved.timeType) setTimeType(saved.timeType)
      if (saved.selectedHours?.length) setSelectedHours(saved.selectedHours)
      if (saved.form) setForm(f => ({ ...f, ...saved.form }))
      if (saved.cart) setCart(saved.cart)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (currentStep === 4 && !quote && !quoteLoading && !quoteError && form.address.trim()) {
      fetchQuote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep])

  useEffect(() => { setMatPage(1) }, [matFilter, matSearch])

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
      // Renting equipment isn't like booking a venue — several clients can
      // rent for the same day as long as combined stock allows it. So usage
      // must ACCUMULATE across every overlapping reservation, not just take
      // the highest single one (that previously let quantities silently
      // overlap instead of stack, which could oversell stock once more than
      // one reservation landed on the same day).
      const used = {}
      ;(res.data||[]).forEach(r => {
        const rDates = r.dates || [r.date]
        if (!dates.some(d => rDates.includes(d))) return
        ;(r.materials||[]).forEach(m => {
          const k = String(m.id)
          used[k] = (used[k]||0) + (parseInt(m.quantity)||0)
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
      const { prenom, nom, email, address, type, nb } = form
      if (!prenom||!nom||!email.includes('@')||!address.trim()||!type||!nb||parseInt(nb)<1) {
        setStep2Error(true)
        return false
      }
      return true
    }
    return true
  }

  async function fetchQuote() {
    if (!form.address.trim()) { setQuoteError('Veuillez indiquer une adresse de livraison.'); return }
    setQuoteLoading(true)
    setQuoteError('')
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: form.address }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.message || 'Erreur de calcul')
      setQuote(result.data)
    } catch (err) {
      setQuoteError(err.message)
      setQuote(null)
    } finally {
      setQuoteLoading(false)
    }
  }

  function handleAddressChange(value) {
    setForm(f => ({ ...f, address: value }))
    setQuote(null)
    setQuoteError('')
    setShowAddrSuggestions(true)
    if (addrDebounceRef.current) clearTimeout(addrDebounceRef.current)
    if (value.trim().length < 3) {
      setAddressSuggestions([])
      return
    }
    addrDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/geocode-suggest?q=' + encodeURIComponent(value))
        const result = await res.json()
        setAddressSuggestions(result.data || [])
      } catch {
        setAddressSuggestions([])
      }
    }, 400)
  }

  function selectAddressSuggestion(s) {
    setForm(f => ({ ...f, address: s.label }))
    setAddressSuggestions([])
    setShowAddrSuggestions(false)
  }

  function goNext() {
    if (!validateStep(currentStep)) return
    if (currentStep === 4) { simulation ? finishSimulation() : submitForm(); return }
    setCurrentStep(c => c + 1)
    setTimeout(() => wizardRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 50)
  }

  function goPrev() {
    if (currentStep > 1) {
      setCurrentStep(c => c - 1)
      setTimeout(() => wizardRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 50)
    }
  }

  // Simulation mode never touches the database or sends anything — it just
  // flips to the same "final screen" shape as a real submission so the two
  // flows feel identical, but the content there shows the quote instead of
  // a confirmation + order reference.
  function finishSimulation() {
    setSuccess(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetWizard() {
    setCurrentStep(1)
    setSelectedDates([])
    setTimeType('full')
    setSelectedHours([])
    setStockUsed({})
    setCart({})
    setForm(EMPTY_FORM)
    setQuote(null)
    setQuoteError('')
    setSuccess(false)
    setOrderReference(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // "Faire une vraie demande" from a finished simulation — hand off what
  // was already filled in so converting it into a real request doesn't
  // mean retyping everything. See the matching restore effect above.
  function convertToRealRequest() {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oa_devis_prefill', JSON.stringify({
        selectedDates, timeType, selectedHours, form, cart,
      }))
    }
    router.push('/reservation')
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
        // Price snapshotted at booking time — if it's edited in Matériel
        // later, past reservations still show what the client actually saw.
        return { id, name: m?.name || '?', quantity: qty, price: parseFloat(m?.price) || 0 }
      })
    try {
      const { data, error } = await supabase.from('reservations').insert({
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
        delivery_address: form.address.trim() || null,
        distance_km: quote?.distanceKm ?? null,
        delivery_fee: quote?.fee ?? null,
        quote_base_fee: quote?.baseFee ?? null,
        quote_per_km: quote?.perKm ?? null,
        materials_total: Math.round(materialsTotal * 100) / 100,
        grand_total: Math.round(grandTotal * 100) / 100,
      })
      if (error) throw error

      setOrderReference(data.reference || null)
      setSuccess(true)
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
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

  /* Cat grouping for materials (used for the filter pills + counts) */
  const matsByCategory = materialsData.reduce((acc, m) => {
    const cat = m.category || 'Autre'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(m)
    return acc
  }, {})
  const categoryList = Object.keys(matsByCategory)

  const MAT_PER_PAGE = 6
  const filteredMats = materialsData.filter(m => {
    if (matFilter !== 'all' && (m.category || 'Autre') !== matFilter) return false
    if (matSearch.trim() && !m.name.toLowerCase().includes(matSearch.trim().toLowerCase())) return false
    return true
  })
  const matTotalPages = Math.max(1, Math.ceil(filteredMats.length / MAT_PER_PAGE))
  const matPageSafe = Math.min(matPage, matTotalPages)
  const pagedMats = filteredMats.slice((matPageSafe - 1) * MAT_PER_PAGE, matPageSafe * MAT_PER_PAGE)

  const prevDisabled = new Date(calYear, calMonth, 1) <= new Date(now.getFullYear(), now.getMonth(), 1)

  const materialsTotal = Object.entries(cart).filter(([,q]) => q > 0).reduce((sum, [id, qty]) => {
    const m = materialsData.find(x => String(x.id) === id)
    return sum + (parseFloat(m?.price) || 0) * qty
  }, 0)
  const grandTotal = materialsTotal + (quote?.fee || 0)

  const pageTitle = simulation ? 'Simulation de Devis' : 'Réservation'

  if (success) {
    return (
      <>
        <Head>
          <title>{(simulation ? 'Votre Devis' : 'Réservation Réussie') + ' — OA Événementiel'}</title>
        </Head>
        <div className="site-wrap">
          <section className="resa-section">
            <div className="container">
              {simulation ? (
                <div className="resa-success-msg">
                  <span className="success-icon"><i className="fas fa-receipt" /></span>
                  <h3>Voici votre devis estimatif</h3>
                  <p>Ceci est une simulation — aucune demande n'a été envoyée, rien n'a été réservé.</p>

                  <div className="recap-card" style={{textAlign:'left',margin:'24px 0'}}>
                    {[
                      { icon: 'fas fa-calendar', label: 'Date(s)', value: recapDate() },
                      { icon: 'fas fa-tag', label: 'Événement', value: EVENT_LABELS[form.type] || '—' },
                      { icon: 'fas fa-users', label: 'Personnes', value: form.nb ? form.nb + ' personne(s)' : '—' },
                      { icon: 'fas fa-map-marker-alt', label: 'Adresse', value: form.address || '—' },
                      { icon: 'fas fa-boxes', label: 'Matériaux', value: recapMats() },
                    ].map((row, i) => (
                      <div key={i} className="recap-row">
                        <span className="recap-lbl"><i className={row.icon} />{row.label}</span>
                        <span className="recap-val">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="res-quote-box" style={{textAlign:'left'}}>
                    <h4 className="res-quote-title"><i className="fas fa-euro-sign" style={{marginRight:8}} />Estimation</h4>
                    <div className="res-total-row">
                      <span>Sous-total matériaux</span><strong>{materialsTotal.toFixed(2)} €</strong>
                    </div>
                    <div className="res-total-row">
                      <span>Livraison{quote ? ` (${quote.distanceKm} km)` : ''}</span><strong>{quote ? quote.fee.toFixed(2) + ' €' : '—'}</strong>
                    </div>
                    <div className="res-total-row res-total-grand">
                      <span>Total estimé</span><strong>{grandTotal.toFixed(2)} €</strong>
                    </div>
                    <p className="res-quote-disclaimer">Estimation indicative, non contractuelle — les tarifs peuvent varier selon la disponibilité réelle.</p>
                  </div>

                  <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginTop:24}}>
                    <button className="btn btn-rose-gold mt-3" onClick={convertToRealRequest}>Faire une vraie demande</button>
                    <button className="step-prev-btn mt-3" style={{padding:'14px 38px'}} onClick={resetWizard}>Nouvelle simulation</button>
                  </div>
                </div>
              ) : (
                <div className="resa-success-msg">
                  <span className="success-icon"><i className="fas fa-check-circle" /></span>
                  <h3>Demande envoyée !</h3>
                  <p>Votre demande de réservation a bien été reçue. Nous vous répondrons dans les plus brefs délais pour confirmer les détails.</p>
                  {orderReference && (
                    <p className="recap-card" style={{display:'inline-block',padding:'14px 24px',margin:'16px 0'}}>
                      Numéro de commande : <strong style={{letterSpacing:'1px'}}>{orderReference}</strong>
                    </p>
                  )}
                  <p>Vous recevrez un email dès que votre demande sera confirmée, avec un lien pour régler votre réservation. Conservez votre numéro de commande — il vous permet de suivre votre demande à tout moment.</p>
                  <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginTop:8}}>
                    <Link href="/suivi" className="btn btn-rose-gold mt-3">Suivre ma demande</Link>
                    <Link href="/" className="step-prev-btn mt-3" style={{padding:'14px 38px'}}>Retour à l'accueil</Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{pageTitle + ' — OA Événementiel'}</title>
        <meta name="description" content={simulation
          ? "Simulez gratuitement le devis de votre événement : dates, matériaux et frais de livraison, sans envoyer de demande."
          : "Réservez vos dates et louez votre matériel de décoration pour vos mariages, anniversaires et réceptions en Île-de-France."} />
      </Head>

      <div className="site-wrap">
        <div
          className="page-header page-header-compact"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1920&q=80)' }}
        >
          <div className="page-header-overlay" />
          <div className="container">
            <h1>{pageTitle}</h1>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb justify-content-center">
                <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
                <li className="breadcrumb-item active">{pageTitle}</li>
              </ol>
            </nav>
          </div>
        </div>

        <section className="resa-section">
          <div className="container">
            {simulation && (
              <div className="resa-alert" style={{background:'#fffbeb',color:'#92400e',borderColor:'#fcd34d',marginBottom:24}}>
                <i className="fas fa-info-circle" />Simulation gratuite — aucune demande ne sera envoyée, vous verrez uniquement une estimation du devis à la fin.
              </div>
            )}
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

                  <div className={`res-step1-layout${selectedDates.length ? '' : ' res-step1-solo'}`}>
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
                  </div>

                  {!selectedDates.length && (
                    <div className="resa-alert" style={{display:'none'}} id="resa-date-error">
                      <i className="fas fa-exclamation-circle" />Veuillez sélectionner au moins une date.
                    </div>
                  )}

                  {selectedDates.length > 0 && (
                    <div className="step-nav mt-4">
                      <span />
                      <button className="btn btn-rose-gold step-next-btn" onClick={goNext} disabled={timeType==='hours' && !selectedHours.length}>
                        Continuer <i className="fas fa-arrow-right ms-1" />
                      </button>
                    </div>
                  )}
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
                  <div className="form-group addr-autocomplete-wrap">
                    <label>Adresse de livraison <span className="req">*</span></label>
                    <input
                      className="form-control"
                      placeholder="N°, rue, code postal, ville"
                      value={form.address}
                      onChange={e => handleAddressChange(e.target.value)}
                      onFocus={() => { if (addressSuggestions.length) setShowAddrSuggestions(true) }}
                      onBlur={() => setTimeout(() => setShowAddrSuggestions(false), 150)}
                      autoComplete="off"
                      style={step2Error && !form.address.trim() ? {borderColor:'#e53e3e'} : {}}
                    />
                    {showAddrSuggestions && addressSuggestions.length > 0 && (
                      <ul className="addr-suggestions">
                        {addressSuggestions.map((s, i) => (
                          <li key={i} onMouseDown={() => selectAddressSuggestion(s)}>
                            <i className="fas fa-map-marker-alt" /><span>{s.label}</span>
                          </li>
                        ))}
                      </ul>
                    )}
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

                  {materialsData.length > 0 && (
                    <>
                      <div className="mat-toolbar">
                        <div className="mat-search">
                          <i className="fas fa-search" />
                          <input
                            type="text"
                            placeholder="Rechercher un article…"
                            value={matSearch}
                            onChange={e => setMatSearch(e.target.value)}
                          />
                          {matSearch && (
                            <button className="mat-search-clear" onClick={() => setMatSearch('')}>
                              <i className="fas fa-times" />
                            </button>
                          )}
                        </div>
                        <div className="mat-filter-pills">
                          <button className={`mat-filter-pill${matFilter==='all'?' active':''}`} onClick={() => setMatFilter('all')}>
                            Tous <span className="mat-filter-count">{materialsData.length}</span>
                          </button>
                          {categoryList.map(cat => (
                            <button key={cat} className={`mat-filter-pill${matFilter===cat?' active':''}`} onClick={() => setMatFilter(cat)}>
                              {cat} <span className="mat-filter-count">{matsByCategory[cat].length}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {!filteredMats.length ? (
                        <p className="no-mat-msg"><i className="fas fa-info-circle me-2" />Aucun article ne correspond à votre recherche.</p>
                      ) : (
                        <div className="mat-grid">
                          {pagedMats.map(m => {
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
                                      <div className="mat-name-row">
                                        <span className="mat-name">{m.name}</span>
                                        <span className="mat-price">{(parseFloat(m.price)||0).toFixed(2)} €</span>
                                      </div>
                                      {m.description && <span className="mat-desc">{m.description}</span>}
                                    </div>
                                  </label>
                                  <div className="mat-card-footer">
                                    {unavail
                                      ? <span className="mat-stock-badge mat-stock-out"><i className="fas fa-times-circle" /> Épuisé</span>
                                      : <span className="mat-stock-badge mat-stock-ok"><i className="fas fa-check-circle" /> {avail} dispo.</span>
                                    }
                                    {selected && (
                                      <div className="mat-qty-wrap">
                                        <button className="qty-btn" onClick={() => setCart(c => ({...c,[String(m.id)]: Math.max(1,qty-1)}))}>−</button>
                                        <span className="qty-val">{qty}</span>
                                        <button className="qty-btn" onClick={() => setCart(c => ({...c,[String(m.id)]: Math.min(avail,qty+1)}))}>+</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {matTotalPages > 1 && (
                        <div className="mat-pagination">
                          <button className="mat-page-nav" disabled={matPageSafe<=1} onClick={() => setMatPage(p => Math.max(1, p-1))}>
                            <i className="fas fa-chevron-left" />
                          </button>
                          <span className="mat-page-info">Page {matPageSafe} / {matTotalPages}</span>
                          <button className="mat-page-nav" disabled={matPageSafe>=matTotalPages} onClick={() => setMatPage(p => Math.min(matTotalPages, p+1))}>
                            <i className="fas fa-chevron-right" />
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {materialsTotal > 0 && (
                    <div className="mat-subtotal-box">
                      <span>Sous-total matériaux</span>
                      <strong>{materialsTotal.toFixed(2)} €</strong>
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

              {/* STEP 4 — Récap */}
              {currentStep === 4 && (
                <div className="step-panel">
                  <span className="step-tag">Étape 4 / 4</span>
                  <h2 className="step-title">Récapitulatif</h2>

                  <>
                      <p className="step-desc">{simulation ? 'Vérifiez les informations de votre simulation.' : "Vérifiez les informations avant d'envoyer votre demande."}</p>

                      <div className="recap-card">
                        {[
                          { icon: 'fas fa-user', label: 'Nom', value: ((form.prenom + ' ' + form.nom).trim() || '—') },
                          { icon: 'fas fa-calendar', label: 'Date(s)', value: recapDate() },
                          { icon: 'fas fa-clock', label: 'Créneau', value: timeType==='full' ? 'Toute la journée' : [...selectedHours].sort().join(' — ') },
                          { icon: 'fas fa-envelope', label: 'Email', value: form.email },
                          { icon: 'fas fa-map-marker-alt', label: 'Adresse', value: form.address || '—' },
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

                      {materialsTotal > 0 && (
                        <div className="res-quote-box">
                          <h4 className="res-quote-title"><i className="fas fa-boxes" style={{marginRight:8}} />Détail des articles</h4>
                          {Object.entries(cart).filter(([,q]) => q > 0).map(([id, qty]) => {
                            const m = materialsData.find(x => String(x.id) === id)
                            const unitPrice = parseFloat(m?.price) || 0
                            return (
                              <div key={id} className="res-total-row">
                                <span>{m?.name || '?'} <small style={{color:'var(--gray)'}}>({unitPrice.toFixed(2)} €/u × {qty})</small></span>
                                <strong>{(unitPrice * qty).toFixed(2)} €</strong>
                              </div>
                            )
                          })}
                          <div className="res-total-row res-total-grand">
                            <span>Sous-total matériaux</span><strong>{materialsTotal.toFixed(2)} €</strong>
                          </div>
                        </div>
                      )}

                      <div className="res-quote-box">
                        <h4 className="res-quote-title"><i className="fas fa-truck" style={{marginRight:8}} />Frais de livraison</h4>
                        {quoteLoading && <p className="res-quote-loading"><i className="fas fa-circle-notch fa-spin me-2" />Calcul de la distance en cours…</p>}
                        {!quoteLoading && quoteError && (
                          <div className="resa-alert">
                            <i className="fas fa-exclamation-circle" />{quoteError}
                            <button className="res-quote-retry" onClick={fetchQuote}>Réessayer</button>
                          </div>
                        )}
                        {!quoteLoading && !quoteError && quote && (
                          <>
                            <div className="res-total-row">
                              <span>Distance estimée</span><strong>{quote.distanceKm} km</strong>
                            </div>
                            <div className="res-total-row">
                              <span>Frais de base</span><strong>{quote.baseFee.toFixed(2)} €</strong>
                            </div>
                            <div className="res-total-row">
                              <span>Frais kilométrique <small style={{color:'var(--gray)'}}>({quote.perKm.toFixed(2)} €/km × {quote.distanceKm} km)</small></span>
                              <strong>{(quote.perKm * quote.distanceKm).toFixed(2)} €</strong>
                            </div>
                          </>
                        )}
                        <div className="res-total-row">
                          <span>Sous-total matériaux</span><strong>{materialsTotal.toFixed(2)} €</strong>
                        </div>
                        <div className="res-total-row">
                          <span>Livraison</span><strong>{quote ? quote.fee.toFixed(2) + ' €' : '—'}</strong>
                        </div>
                        <div className="res-total-row res-total-grand">
                          <span>Total estimé</span><strong>{grandTotal.toFixed(2)} €</strong>
                        </div>
                        <p className="res-quote-disclaimer">Estimation indicative — le montant définitif vous sera confirmé par notre équipe.</p>
                      </div>

                      {submitError && (
                        <div className="resa-alert mt-3">
                          <i className="fas fa-exclamation-circle" />Une erreur est survenue. Veuillez réessayer.
                        </div>
                      )}

                      <p className="resa-privacy">
                        {simulation
                          ? "Simulation uniquement — aucune donnée n'est enregistrée ni envoyée."
                          : 'En envoyant ce formulaire, vous acceptez que vos données soient utilisées pour traiter votre demande.'}
                      </p>

                      <div className="step-nav">
                        <button className="step-prev-btn" onClick={goPrev}><i className="fas fa-arrow-left me-1" />Retour</button>
                        <button className="btn btn-rose-gold step-next-btn" onClick={goNext} disabled={submitting}>
                          {submitting
                            ? <><i className="fas fa-circle-notch fa-spin me-1" />Envoi…</>
                            : simulation
                              ? <>Voir mon devis <i className="fas fa-receipt ms-1" /></>
                              : <>Envoyer ma demande <i className="fas fa-paper-plane ms-1" /></>
                          }
                        </button>
                      </div>
                  </>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
