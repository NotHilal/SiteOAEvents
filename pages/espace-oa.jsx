import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../src/lib/supabase.js'
import { ttcFromHt, groupTiersByMaterial } from '../src/lib/pricing.js'
// Galerie categories drive GalerieManager's dropdown (dynamic add/remove
// list, not fixed slots) — shared with the filters on pages/galerie.jsx.
import { GALERIE_CATEGORIES } from '../src/lib/galerie-defaults.js'

const EMPTY_TIER = { minQty:1, maxQty:'', weekday:'', weekend:'' }

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const TYPE_LABELS = { mariage:'Mariage', anniversaire:'Anniversaire', 'evenement-pro':'Événement professionnel', 'location-deco':'Location de décoration', autre:'Autre' }
const STATUS_LABEL = { pending:'En attente', awaiting_payment:'En attente de paiement', confirmed:'Confirmée', terminee:'Terminée', refused:'Refusée' }
const STATUS_CLASS = { pending:'badge-pending', awaiting_payment:'badge-awaiting', confirmed:'badge-confirmed', terminee:'badge-terminee', refused:'badge-refused' }
// Fixed icons for the "Nos valeurs" blocks on /a-propos — kept in sync with
// the same 4 icons already reused on the homepage's "Pourquoi OA" section;
// only the title/text are admin-editable, not the icon itself.
const ABOUT_VALUE_ICONS = ['/return.avif', '/delivery-truck.avif', '/customer-service.avif', '/money-back.avif']

// Slot lists for Espace OA > Visuel Site (ImageSlotGrid) — one entry per
// swappable photo on the corresponding public page. Keys must match what
// each page's DEFAULT_IMAGES/useEffect fallback logic reads.
const HOME_SLOTS = [
  { key:'hero_left', label:'Hero — photo gauche' },
  { key:'hero_right', label:'Hero — photo droite' },
  { key:'univers_1', label:'Mariages & Réceptions' },
  { key:'univers_2', label:'Anniversaires & Fêtes' },
  { key:'univers_3', label:'Location de Décoration' },
  { key:'realisation_1', label:'Réalisation 1' },
  { key:'realisation_2', label:'Réalisation 2' },
  { key:'realisation_3', label:'Réalisation 3' },
  { key:'realisation_4', label:'Réalisation 4' },
  { key:'realisation_5', label:'Réalisation 5' },
  { key:'realisation_6', label:'Réalisation 6' },
]
const SERVICES_SLOTS = [
  { key:'page_header', label:'Bannière de page' },
  { key:'service_1', label:'Organisation de Mariage' },
  { key:'service_2', label:"Organisation d'Anniversaire" },
  { key:'service_3', label:'Événements Professionnels' },
  { key:'service_4', label:'Location de Décoration' },
]
// Drives the mobile "tap to expand" tab menus (see .block-tabs-mobile) —
// same tab set/order as the desktop pill row, just labelled once here so
// both places can't drift out of sync.
const VISUEL_TABS = [
  { key:'accueil', label:'Accueil' },
  { key:'prestations', label:'Prestations' },
  { key:'galerie', label:'Galerie' },
  { key:'apropos', label:'À Propos' },
]
const REGLAGES_TABS = [
  { key:'adresse', label:'Adresse & livraison' },
  { key:'virement', label:'Virement' },
  { key:'installments', label:'Paiement en plusieurs fois' },
]
const MAT_FORM_TABS = [
  { key:'infos', label:'Informations' },
  { key:'tarification', label:'Tarification' },
]
const MAT_PAGE_SIZE = 8
const CAT_PAGE_SIZE = 10
const DAY_PAGE_SIZE = 4

function fmtDate(d) { return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }
function getRDates(r) { return (r.dates&&r.dates.length)?r.dates.slice().sort():(r.date?[r.date]:[]) }
function fmtResaDate(r) {
  const rd=getRDates(r); if(!rd.length) return '—'
  if(rd.length===1) return new Date(rd[0]+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})
  const d1=new Date(rd[0]+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})
  const d2=new Date(rd[rd.length-1]+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})
  return d1+' → '+d2+' ('+rd.length+' j)'
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('demandes')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [reservations, setReservations] = useState([])
  const [paymentSummaries, setPaymentSummaries] = useState({})
  const [messages, setMessages] = useState([])
  const [materials, setMaterials] = useState([])
  const [materialTiers, setMaterialTiers] = useState([])
  const [categories, setCategories] = useState([])
  const [blockedDatesMap, setBlockedDatesMap] = useState({})
  const [blockedHoursMap, setBlockedHoursMap] = useState({})
  const [resaFilter, setResaFilter] = useState('all')
  const [resaSearch, setResaSearch] = useState('')
  const [msgFilter, setMsgFilter] = useState('all')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calView, setCalView] = useState('month')
  const [blocYear, setBlocYear] = useState(new Date().getFullYear())
  const [blocMonth, setBlocMonth] = useState(new Date().getMonth())
  const [blocView, setBlocView] = useState('month')
  const [matPage, setMatPage] = useState(0)
  const [matFormVisible, setMatFormVisible] = useState(false)
  const [matFormTab, setMatFormTab] = useState('infos')
  const [editingMat, setEditingMat] = useState(null)
  const [matForm, setMatForm] = useState({ name:'', category:'', description:'', qty:1, tieredPricing:false, weekendDiffers:true, tiers:[{...EMPTY_TIER}] })
  const [matTiersError, setMatTiersError] = useState('')
  const [matImageUrl, setMatImageUrl] = useState('')
  const [matImageFile, setMatImageFile] = useState(null)
  const [matImagePreview, setMatImagePreview] = useState(null)
  const [matSaving, setMatSaving] = useState(false)
  const [matQtyError, setMatQtyError] = useState(false)
  const [matPriceError, setMatPriceError] = useState(false)
  const fileInputRef = useRef(null)
  const [catPage, setCatPage] = useState(0)
  const [catInput, setCatInput] = useState('')
  const [catError, setCatError] = useState('')
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [dayModal, setDayModal] = useState(null)
  const [resaDetail, setResaDetail] = useState(null)
  const [blockTab, setBlockTab] = useState('full')
  const [blockReason, setBlockReason] = useState('')
  const [blockSelHours, setBlockSelHours] = useState([])
  const [deleteModal, setDeleteModal] = useState(null)
  const [contactModal, setContactModal] = useState(null)
  const [msgDetail, setMsgDetail] = useState(null)
  const [settingsForm, setSettingsForm] = useState({
    depot_address:'', delivery_base_fee:'', delivery_per_km:'',
    bank_holder:'', bank_iban:'', bank_bic:'',
    installment_2x_min_amount:'', installment_3x_min_amount:'', installment_min_total_4x:'',
    max_consecutive_days:'',
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  const [reglagesTab, setReglagesTab] = useState('adresse')
  const [reglagesMenuOpen, setReglagesMenuOpen] = useState(false)
  const [visuelTab, setVisuelTab] = useState('accueil')
  const [visuelMenuOpen, setVisuelMenuOpen] = useState(false)
  const [aboutForm, setAboutForm] = useState({
    founderName: '', story: '',
    counters: [{ count:'', label:'' }, { count:'', label:'' }],
    values: [{ title:'', text:'' }, { title:'', text:'' }, { title:'', text:'' }, { title:'', text:'' }],
  })
  const [aboutImageUrl, setAboutImageUrl] = useState('')
  const [aboutImageFile, setAboutImageFile] = useState(null)
  const [aboutImagePreview, setAboutImagePreview] = useState(null)
  const aboutFileInputRef = useRef(null)
  const [aboutHeaderUrl, setAboutHeaderUrl] = useState('')
  const [aboutHeaderFile, setAboutHeaderFile] = useState(null)
  const [aboutHeaderPreview, setAboutHeaderPreview] = useState(null)
  const aboutHeaderInputRef = useRef(null)
  const [aboutSaving, setAboutSaving] = useState(false)
  const [aboutSaved, setAboutSaved] = useState(false)
  const [aboutError, setAboutError] = useState('')

  // Lock page scroll while any modal is open — without this, a fixed,
  // screen-centered modal reads as "detached" from a background that keeps
  // scrolling underneath it. Freezing the page instead makes the modal feel
  // like the thing you're actually looking at, not a floating overlay.
  useEffect(() => {
    const anyModalOpen = !!(dayModal || resaDetail || deleteModal || catModalOpen || contactModal || msgDetail || mobileNavOpen || matFormVisible)
    // html has an explicit overflow-x set (see style.css, for the horizontal-
    // scrollbar fix) which stops the browser from propagating body's overflow
    // to the viewport — so html itself must be locked too, or this silently
    // does nothing and the page keeps scrolling behind the modal.
    document.documentElement.style.overflowY = anyModalOpen ? 'hidden' : ''
    document.body.style.overflow = anyModalOpen ? 'hidden' : ''
    return () => { document.documentElement.style.overflowY = ''; document.body.style.overflow = '' }
  }, [dayModal, resaDetail, deleteModal, catModalOpen, contactModal, msgDetail, mobileNavOpen, matFormVisible])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // All admin tabs stay mounted in the DOM (only `display` toggles), so
  // resaFilter would otherwise keep whatever value it had from a previous
  // visit to Demandes — always start back at "Toutes" instead.
  useEffect(() => {
    if (activeTab === 'demandes') setResaFilter('all')
  }, [activeTab])

  useEffect(() => {
    if (!user) return
    loadAll()
    const ch = supabase.channel('contacts-rt')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'contacts' }, (payload) => {
        setMessages(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  async function loadAll() {
    await Promise.all([loadReservations(), loadPaymentSummaries(), loadMessages(), loadBlockedData(), loadMaterials(), loadCategories(), loadSettings(), loadAboutContent()])
  }
  async function loadReservations() {
    const { data } = await supabase.from('reservations').select('*').order('created_at', { ascending: false })
    setReservations(data || [])
  }
  // Used to show a "paiement reçu" indicator (montant + N/total versements)
  // on each reservation card — one query for every installment across every
  // reservation, grouped client-side, rather than one query per reservation.
  async function loadPaymentSummaries() {
    const { data } = await supabase.from('payments').select('reservation_id, amount, status').order('installment_index')
    const map = {}
    ;(data || []).forEach(p => {
      if (!map[p.reservation_id]) map[p.reservation_id] = { total: 0, paidCount: 0, paidAmount: 0 }
      const s = map[p.reservation_id]
      s.total += 1
      if (p.status === 'paid') { s.paidCount += 1; s.paidAmount += p.amount }
    })
    setPaymentSummaries(map)
  }
  async function loadMessages() {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
    setMessages(data || [])
  }
  async function loadBlockedData() {
    const [bd, bh] = await Promise.all([
      supabase.from('blocked_dates').select('date,reason'),
      supabase.from('blocked_hours').select('date,hour'),
    ])
    const dm = {}; (bd.data||[]).forEach(r => { dm[r.date] = r }); setBlockedDatesMap(dm)
    const hm = {}; (bh.data||[]).forEach(r => { if(!hm[r.date])hm[r.date]=[]; hm[r.date].push(r.hour) }); setBlockedHoursMap(hm)
  }
  async function loadMaterials() {
    const [matRes, tierRes] = await Promise.all([
      supabase.from('materials').select('*').order('category').order('name'),
      supabase.from('material_price_tiers').select('*'),
    ])
    setMaterials(matRes.data || [])
    setMaterialTiers(tierRes.data || [])
  }
  async function loadSettings() {
    const [{ data }, { data: contentData }] = await Promise.all([
      supabase.from('settings').select('*'),
      // max_consecutive_days lives in site_content, not settings — the
      // booking wizard is a public logged-out page and needs to read it
      // without auth (see requiresAuth in pages/api/db.js).
      supabase.from('site_content').select('*').eq('key', 'max_consecutive_days'),
    ])
    const map = {}
    ;(data||[]).forEach(s => { map[s.key] = s.value })
    setSettingsForm({
      depot_address: map.depot_address || '',
      delivery_base_fee: map.delivery_base_fee || '',
      delivery_per_km: map.delivery_per_km || '',
      bank_holder: map.bank_holder || '',
      bank_iban: map.bank_iban || '',
      bank_bic: map.bank_bic || '',
      installment_2x_min_amount: map.installment_2x_min_amount || '0',
      installment_3x_min_amount: map.installment_3x_min_amount || '0',
      installment_min_total_4x: map.installment_min_total_4x || '300',
      max_consecutive_days: contentData?.[0]?.value || '7',
    })
  }
  async function saveSettings() {
    setSettingsError('')
    if (!settingsForm.depot_address.trim()) { setSettingsError('Adresse de départ requise.'); return }
    const baseFee = parseFloat(String(settingsForm.delivery_base_fee).replace(',', '.'))
    const perKm = parseFloat(String(settingsForm.delivery_per_km).replace(',', '.'))
    if (isNaN(baseFee) || baseFee < 0 || isNaN(perKm) || perKm < 0) { setSettingsError('Frais invalides (doivent être ≥ 0).'); return }

    const maxDays = parseInt(settingsForm.max_consecutive_days, 10)
    if (isNaN(maxDays) || maxDays < 1 || maxDays > 30) { setSettingsError('Nombre de jours consécutifs invalide (entre 1 et 30).'); return }

    const tiers = [
      { n: 2, minAmountKey:'installment_2x_min_amount' },
      { n: 3, minAmountKey:'installment_3x_min_amount' },
      { n: 4, minAmountKey:'installment_min_total_4x' },
    ]
    const parsedTiers = {}
    for (const t of tiers) {
      const minAmount = parseFloat(String(settingsForm[t.minAmountKey]).replace(',', '.'))
      if (isNaN(minAmount) || minAmount < 0) { setSettingsError(`Montant minimum invalide pour le paiement en ${t.n} fois (doit être ≥ 0).`); return }
      parsedTiers[t.n] = { minAmount }
    }

    setSettingsSaving(true)
    try {
      await Promise.all([
        supabase.from('settings').update({ value: settingsForm.depot_address.trim() }).eq('key', 'depot_address'),
        supabase.from('settings').update({ value: String(baseFee) }).eq('key', 'delivery_base_fee'),
        supabase.from('settings').update({ value: String(perKm) }).eq('key', 'delivery_per_km'),
        supabase.from('settings').update({ value: settingsForm.bank_holder.trim() }).eq('key', 'bank_holder'),
        supabase.from('settings').update({ value: settingsForm.bank_iban.trim() }).eq('key', 'bank_iban'),
        supabase.from('settings').update({ value: settingsForm.bank_bic.trim() }).eq('key', 'bank_bic'),
        supabase.from('settings').update({ value: String(parsedTiers[2].minAmount) }).eq('key', 'installment_2x_min_amount'),
        supabase.from('settings').update({ value: String(parsedTiers[3].minAmount) }).eq('key', 'installment_3x_min_amount'),
        supabase.from('settings').update({ value: String(parsedTiers[4].minAmount) }).eq('key', 'installment_min_total_4x'),
        supabase.from('site_content').update({ value: String(maxDays) }).eq('key', 'max_consecutive_days'),
      ])
      await loadSettings()
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch {
      setSettingsError('Erreur lors de l\'enregistrement.')
    } finally {
      setSettingsSaving(false)
    }
  }
  async function loadAboutContent() {
    const { data } = await supabase.from('site_content').select('*').eq('key', 'about_page')
    const row = data && data[0]
    if (!row) return
    try {
      const parsed = JSON.parse(row.value)
      setAboutForm({
        founderName: parsed.founderName || '',
        story: parsed.story || '',
        counters: parsed.counters?.length === 2 ? parsed.counters : [{ count:'', label:'' }, { count:'', label:'' }],
        values: parsed.values?.length === 4 ? parsed.values : [{ title:'', text:'' }, { title:'', text:'' }, { title:'', text:'' }, { title:'', text:'' }],
      })
      setAboutImageUrl(parsed.photoUrl || '')
      setAboutImagePreview(parsed.photoUrl || null)
      setAboutHeaderUrl(parsed.headerImg || '')
      setAboutHeaderPreview(parsed.headerImg || null)
    } catch {}
  }
  function handleAboutImageFile(file) {
    if (!file) return
    if (file.size > 5*1024*1024) { alert('Image trop lourde (max 5 Mo).'); return }
    setAboutImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setAboutImagePreview(reader.result)
    reader.readAsDataURL(file)
  }
  function removeAboutImage() {
    setAboutImageFile(null)
    setAboutImageUrl('')
    setAboutImagePreview(null)
  }
  function handleAboutHeaderFile(file) {
    if (!file) return
    if (file.size > 5*1024*1024) { alert('Image trop lourde (max 5 Mo).'); return }
    setAboutHeaderFile(file)
    const reader = new FileReader()
    reader.onload = () => setAboutHeaderPreview(reader.result)
    reader.readAsDataURL(file)
  }
  function removeAboutHeader() {
    setAboutHeaderFile(null)
    setAboutHeaderUrl('')
    setAboutHeaderPreview(null)
  }
  async function saveAboutContent() {
    setAboutError('')
    if (!aboutForm.founderName.trim()) { setAboutError('Le nom du fondateur est requis.'); return }
    if (!aboutForm.story.trim()) { setAboutError('Le texte de présentation est requis.'); return }
    setAboutSaving(true)
    try {
      let photoUrl = aboutImageUrl || null
      if (aboutImageFile) {
        const oldUrl = aboutImageUrl
        if (oldUrl && oldUrl.startsWith('/uploads/')) {
          try { await supabase.storage.from('about').remove([oldUrl.slice('/uploads/'.length)]) } catch {}
        }
        const ext = aboutImageFile.name.split('.').pop().toLowerCase()
        const path = Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext
        const { error: upErr } = await supabase.storage.from('about').upload(path, aboutImageFile, { upsert: false })
        if (upErr) throw upErr
        photoUrl = supabase.storage.from('about').getPublicUrl(path).data.publicUrl
      }
      let headerImg = aboutHeaderUrl || null
      if (aboutHeaderFile) {
        const oldHeaderUrl = aboutHeaderUrl
        if (oldHeaderUrl && oldHeaderUrl.startsWith('/uploads/')) {
          try { await supabase.storage.from('about').remove([oldHeaderUrl.slice('/uploads/'.length)]) } catch {}
        }
        const ext = aboutHeaderFile.name.split('.').pop().toLowerCase()
        const path = Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext
        const { error: upErr2 } = await supabase.storage.from('about').upload(path, aboutHeaderFile, { upsert: false })
        if (upErr2) throw upErr2
        headerImg = supabase.storage.from('about').getPublicUrl(path).data.publicUrl
      }
      const value = JSON.stringify({
        founderName: aboutForm.founderName.trim(),
        story: aboutForm.story.trim(),
        photoUrl,
        headerImg,
        counters: aboutForm.counters.map(c => ({ count: c.count.trim(), label: c.label.trim() })),
        values: aboutForm.values.map(v => ({ title: v.title.trim(), text: v.text.trim() })),
      })
      await supabase.from('site_content').update({ value }).eq('key', 'about_page')
      setAboutImageFile(null)
      setAboutHeaderFile(null)
      await loadAboutContent()
      setAboutSaved(true)
      setTimeout(() => setAboutSaved(false), 3000)
    } catch (err) {
      setAboutError('Erreur lors de l\'enregistrement : ' + (err.message || err))
    } finally {
      setAboutSaving(false)
    }
  }
  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
  }

  async function handleLogin(e) {
    e.preventDefault(); setLoginLoading(true); setLoginError('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) setLoginError('Identifiants incorrects. Vérifiez votre email et mot de passe.')
    setLoginLoading(false)
  }
  async function handleLogout() {
    await supabase.auth.signOut()
    setReservations([]); setMessages([]); setMaterials([]); setCategories([])
    setBlockedDatesMap({}); setBlockedHoursMap({}); setActiveTab('demandes')
  }

  const pendingCount = reservations.filter(r => r.status === 'pending').length
  const unreadCount = messages.filter(m => !m.read).length

  async function updateResaStatus(id, status) {
    await supabase.from('reservations').update({ status }).eq('id', id)
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (status === 'awaiting_payment' || status === 'confirmed' || status === 'refused') {
      notifyReservationStatus(id)
    }
  }
  async function notifyReservationStatus(reservationId) {
    try {
      const sessionStr = sessionStorage.getItem('oa_session')
      const session = sessionStr ? JSON.parse(sessionStr) : null
      await fetch('/api/reservations/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ reservationId }),
      })
      // Best-effort: the client is only informed by email, there's no UI
      // feedback loop here — a failure (e.g. Resend not configured yet)
      // shouldn't block the admin from continuing their work.
    } catch {}
  }
  function confirmDelete(subtitle, callback) {
    setDeleteModal({ subtitle, callback })
  }
  function deleteResa(id, backDate) {
    confirmDelete('Cette demande de réservation sera définitivement supprimée.', async () => {
      await supabase.from('reservations').delete().eq('id', id)
      setReservations(prev => prev.filter(r => r.id !== id))
      setResaDetail(null)
      if (backDate) setDayModal({ dateStr: backDate, mode: 'calendar', page: 0 })
      else setDayModal(null)
    })
  }

  function openDayModal(dateStr, page) { setDayModal({ dateStr, mode:'calendar', page: page||0 }); setResaDetail(null) }
  function openBlocModal(dateStr) {
    setBlockReason(blockedDatesMap[dateStr]?.reason || '')
    setBlockSelHours((blockedHoursMap[dateStr]||[]).slice())
    setBlockTab('full')
    setDayModal({ dateStr, mode:'blocage' }); setResaDetail(null)
  }

  async function saveFullBlock(dateStr) {
    await supabase.from('blocked_dates').upsert({ date: dateStr, reason: blockReason||null }, { onConflict:'date' })
    await loadBlockedData(); setDayModal(null)
  }
  async function unblockFull(dateStr) {
    await supabase.from('blocked_dates').delete().eq('date', dateStr)
    await loadBlockedData(); setDayModal(null)
  }
  async function saveHourBlocks(dateStr) {
    await supabase.from('blocked_hours').delete().eq('date', dateStr)
    if (blockSelHours.length) await supabase.from('blocked_hours').insert(blockSelHours.map(h => ({ date: dateStr, hour: h })))
    await loadBlockedData(); setDayModal(null)
  }
  async function clearHourBlocks(dateStr) {
    await supabase.from('blocked_hours').delete().eq('date', dateStr)
    await loadBlockedData(); setDayModal(null)
  }

  async function markMsgRead(id) {
    const m = messages.find(x => x.id === id); if (!m || m.read) return
    await supabase.from('contacts').update({ read: true }).eq('id', id)
    setMessages(prev => prev.map(x => x.id === id ? { ...x, read: true } : x))
  }
  function deleteMsg(id, close) {
    confirmDelete('Ce message sera définitivement supprimé.', async () => {
      await supabase.from('contacts').delete().eq('id', id)
      setMessages(prev => prev.filter(m => m.id !== id))
      if (close) setMsgDetail(null)
    })
  }

  function openAddMat() {
    setEditingMat(null); setMatForm({ name:'', category:'', description:'', qty:1, tieredPricing:false, weekendDiffers:true, tiers:[{...EMPTY_TIER}] })
    setMatImageUrl(''); setMatImageFile(null); setMatImagePreview(null); setMatQtyError(false); setMatPriceError(false); setMatTiersError(''); setMatFormTab('infos'); setMatFormVisible(true)
  }
  async function openEditMat(id) {
    const [{ data: m }, { data: tiers }] = await Promise.all([
      supabase.from('materials').select('*').eq('id', id).single(),
      supabase.from('material_price_tiers').select('*').eq('material_id', id).order('min_qty'),
    ])
    if (!m) return
    const loadedTiers = (tiers && tiers.length)
      ? tiers.map(t => ({ minQty: t.min_qty, maxQty: t.max_qty ?? '', weekday: t.price_weekday_ht, weekend: t.price_weekend_ht }))
      : [{...EMPTY_TIER}]
    setEditingMat(m)
    setMatForm({
      name: m.name, category: m.category||'', description: m.description||'', qty: m.max_quantity,
      tieredPricing: loadedTiers.length > 1,
      weekendDiffers: loadedTiers.some(t => parseFloat(t.weekday) !== parseFloat(t.weekend)),
      tiers: loadedTiers,
    })
    setMatImageUrl(m.image_url||''); setMatImageFile(null); setMatImagePreview(m.image_url||null); setMatQtyError(false); setMatPriceError(false); setMatTiersError(''); setMatFormTab('infos'); setMatFormVisible(true)
  }
  async function saveMaterial() {
    const qtyNum = parseInt(String(matForm.qty))
    let valid = true
    // Errors can land on either popup tab (see MAT_FORM_TABS) — whichever
    // is hit first when validating jumps the user there automatically, so
    // a mistake on the tab they're not currently looking at is never silent.
    let errorTab = null
    if (!matForm.name.trim()) { valid = false; errorTab = errorTab || 'infos' }
    if (!qtyNum || qtyNum < 1 || !/^\d+$/.test(String(matForm.qty))) { setMatQtyError(true); valid = false; errorTab = errorTab || 'infos' }

    // Tiers are forced back to a single 1..∞ band when "paliers dégressifs"
    // is off, and the weekend price is mirrored from the weekday one when
    // "tarif différent le week-end" is off — regardless of whatever stale
    // values are sitting in state, so the two toggles are the only source
    // of truth for what actually gets saved.
    const parsedTiers = matForm.tiers.map(t => {
      const weekday = parseFloat(String(t.weekday).replace(',', '.'))
      const weekend = matForm.weekendDiffers ? parseFloat(String(t.weekend).replace(',', '.')) : weekday
      return {
        minQty: matForm.tieredPricing ? parseInt(String(t.minQty)) : 1,
        maxQty: matForm.tieredPricing ? (t.maxQty === '' ? null : parseInt(String(t.maxQty))) : null,
        weekday, weekend,
      }
    })
    setMatTiersError('')
    if (!parsedTiers.length) { setMatTiersError('Au moins un palier de prix est requis.'); valid = false; errorTab = errorTab || 'tarification' }
    for (const t of parsedTiers) {
      if (!t.minQty || t.minQty < 1) { setMatTiersError('Quantité minimale invalide sur un palier.'); valid = false; errorTab = errorTab || 'tarification'; break }
      if (t.maxQty != null && t.maxQty < t.minQty) { setMatTiersError('Quantité maximale doit être supérieure ou égale au minimum.'); valid = false; errorTab = errorTab || 'tarification'; break }
      if (isNaN(t.weekday) || t.weekday < 0 || isNaN(t.weekend) || t.weekend < 0) { setMatPriceError(true); valid = false; errorTab = errorTab || 'tarification'; break }
    }
    if (!valid) { if (errorTab) setMatFormTab(errorTab); return }
    setMatSaving(true)
    try {
      let imageUrl = matImageUrl || null
      if (matImageFile) {
        if (editingMat?.image_url) await removeStorageImg(editingMat.image_url)
        const ext = matImageFile.name.split('.').pop().toLowerCase()
        const path = Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext
        const { error: upErr } = await supabase.storage.from('materials').upload(path, matImageFile, { upsert: false })
        if (upErr) throw upErr
        imageUrl = supabase.storage.from('materials').getPublicUrl(path).data.publicUrl
      } else if (!matImageUrl && editingMat?.image_url) {
        await removeStorageImg(editingMat.image_url); imageUrl = null
      }
      const payload = { name: matForm.name.trim(), category: matForm.category||null, description: matForm.description.trim()||null, max_quantity: qtyNum, image_url: imageUrl, available: true }
      let materialId = editingMat?.id
      if (editingMat) await supabase.from('materials').update(payload).eq('id', editingMat.id)
      else { const { data } = await supabase.from('materials').insert(payload); materialId = data.id }

      // Tiers are replaced wholesale on every save rather than diffed —
      // simplest correct approach for a small per-material row set.
      await supabase.from('material_price_tiers').delete().eq('material_id', materialId)
      await supabase.from('material_price_tiers').insert(parsedTiers.map(t => ({
        material_id: materialId, min_qty: t.minQty, max_qty: t.maxQty, price_weekday_ht: t.weekday, price_weekend_ht: t.weekend,
      })))

      setMatFormVisible(false); await loadMaterials()
    } catch (err) { alert('Erreur : '+(err.message||err)) } finally { setMatSaving(false) }
  }
  function toggleTieredPricing() {
    setMatForm(f => {
      const next = !f.tieredPricing
      // Turning it off collapses back to one band covering everything,
      // keeping whatever prices were on the first row.
      if (!next) {
        const first = f.tiers[0] || EMPTY_TIER
        return { ...f, tieredPricing: next, tiers: [{ ...first, minQty:1, maxQty:'' }] }
      }
      return { ...f, tieredPricing: next }
    })
  }
  function toggleWeekendDiffers() {
    setMatForm(f => ({ ...f, weekendDiffers: !f.weekendDiffers }))
  }
  // The new row's "Qté min" defaults to (previous row's "Qté max" + 1) —
  // tiers are meant to be contiguous, so this is almost always what's
  // wanted and saves retyping it; left blank only when the previous row's
  // max is itself blank (i.e. that row is the open-ended "∞" tier, so
  // there's no sensible next value to suggest).
  function addTierRow() {
    setMatForm(f => {
      const last = f.tiers[f.tiers.length - 1]
      const lastMax = last && last.maxQty !== '' && last.maxQty != null ? parseInt(last.maxQty, 10) : NaN
      const nextMin = !isNaN(lastMax) ? String(lastMax + 1) : ''
      return {...f, tiers: [...f.tiers, {...EMPTY_TIER, minQty: nextMin}]}
    })
  }
  function removeTierRow(i) { setMatForm(f => ({...f, tiers: f.tiers.filter((_,idx) => idx!==i)})) }
  function updateTierRow(i, field, value) { setMatForm(f => ({...f, tiers: f.tiers.map((t,idx) => idx===i ? {...t,[field]:value} : t)})) }
  async function removeStorageImg(url) {
    try { const m='/object/public/materials/'; const i=url.indexOf(m); if(i===-1)return; await supabase.storage.from('materials').remove([url.slice(i+m.length)]) } catch {}
  }
  async function toggleAvail(id, current) { await supabase.from('materials').update({ available: !current }).eq('id', id); await loadMaterials() }
  function deleteMat(id) {
    confirmDelete('Cet article et son image seront définitivement supprimés.', async () => {
      const { data: m } = await supabase.from('materials').select('image_url').eq('id', id).single()
      if (m?.image_url) await removeStorageImg(m.image_url)
      await supabase.from('material_price_tiers').delete().eq('material_id', id)
      await supabase.from('materials').delete().eq('id', id); await loadMaterials()
    })
  }
  function handleImageFile(file) {
    if (!file) return
    if (file.size > 5*1024*1024) { alert('Image trop lourde (max 5 Mo).'); return }
    setMatImageFile(file)
    const reader = new FileReader(); reader.onload = e => setMatImagePreview(e.target.result); reader.readAsDataURL(file)
  }
  function removeImage() { setMatImageFile(null); setMatImageUrl(''); setMatImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }

  async function saveCategory() {
    const name = catInput.trim().toUpperCase(); if (!name) return; setCatError('')
    const { data, error } = await supabase.from('categories').insert({ name }).select().single()
    if (error) { setCatError(error.code==='23505'?`La catégorie "${name}" existe déjà.`:'Erreur : '+error.message); return }
    setCategories(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name))); setCatInput('')
  }
  function deleteCat(id, name) {
    confirmDelete(`La catégorie "${name}" sera supprimée.`, async () => {
      await supabase.from('categories').delete().eq('id', id)
      setCategories(prev => prev.filter(c => c.id !== id))
    })
  }

  const closeModal = () => { setDayModal(null); setResaDetail(null) }

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#ffffff' }}>
      <i className="fas fa-circle-notch fa-spin" style={{ fontSize:'2rem', color:'var(--rose-gold)' }} />
    </div>
  )

  if (!user) return (
    <>
      <Head>
        <title>Connexion — Espace OA</title>
      </Head>
      <div className="login-wrap">
        <div className="login-card">
          <Link href="/" className="login-logo">OA <span>Événementiel</span></Link>
          <h2 className="login-title">Espace de gestion</h2>
          <p className="login-sub">Accès réservé à l'administrateur</p>
          {loginError && <div className="login-error">{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="adm-form-group">
              <label>Email</label>
              <input type="email" className="adm-input" placeholder="admin@oa-evenementiel.fr" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
            </div>
            <div className="adm-form-group">
              <label>Mot de passe</label>
              <input type="password" className="adm-input" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            </div>
            <button type="submit" className="adm-btn-primary" style={{ width:'100%' }} disabled={loginLoading}>
              {loginLoading ? <><i className="fas fa-circle-notch fa-spin" style={{marginRight:8}} />Connexion…</> : <><i className="fas fa-sign-in-alt" style={{marginRight:8}} />Se connecter</>}
            </button>
          </form>
        </div>
      </div>
    </>
  )

  const NAV_ITEMS = [
    { key:'demandes',   icon:'fas fa-inbox',        label:'Demandes',   badge:pendingCount,  blink:false },
    { key:'calendrier', icon:'fas fa-calendar-alt', label:'Calendrier', badge:0,             blink:false },
    { key:'blocages',   icon:'fas fa-ban',          label:'Blocages',   badge:0,             blink:false },
    { key:'messagerie', icon:'fas fa-envelope',     label:'Messagerie', badge:unreadCount,   blink:unreadCount>0 },
    { key:'materiaux',  icon:'fas fa-boxes',        label:'Matériel',   badge:0,             blink:false },
    { key:'visuel',     icon:'fas fa-images',       label:'Visuel Site', badge:0,            blink:false },
    { key:'reglages',   icon:'fas fa-cog',          label:'Réglages',   badge:0,             blink:false },
  ]

  return (
    <>
      <Head>
        <title>Espace OA — Gestion</title>
      </Head>
      {/* Mobile-only top bar: the sidebar itself becomes an off-canvas
          drawer below 768px (see admin.css) instead of the permanent
          64px icon rail it was before — this hamburger is what opens it. */}
      <div className="admin-mobile-topbar">
        <span className="admin-mobile-title">OA <em>Événementiel</em></span>
        <button
          type="button"
          className={`admin-hamburger-btn${mobileNavOpen ? ' is-open' : ''}`}
          aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(o => !o)}
        >
          <span className="hamburger-line" aria-hidden="true" />
          <span className="hamburger-line" aria-hidden="true" />
          <span className="hamburger-line" aria-hidden="true" />
        </button>
      </div>
      <div
        className={`admin-sidebar-overlay${mobileNavOpen ? ' is-open' : ''}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />
      <div className="dashboard-wrap">
        <aside className={`sidebar${mobileNavOpen ? ' is-open' : ''}`}>
          <div className="sidebar-brand">
            <Link href="/" className="sidebar-logo">OA <span>Événementiel</span></Link>
            <p className="sidebar-tag">Espace de gestion</p>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`sidebar-btn${activeTab===item.key?' active':''}`}
                onClick={() => { setActiveTab(item.key); setMobileNavOpen(false) }}
                title={item.label}
              >
                <i className={item.icon} /> <span className="sidebar-label">{item.label}</span>
                {item.badge > 0 && <span className={`badge-count${item.blink?' badge-blink':''}`}>{item.badge}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-user-avatar"><i className="fas fa-user" /></div>
              <div className="sidebar-user-info">
                {/* Email hidden on mobile only (see admin.css) — the drawer
                    is already full of nav items on a short phone screen,
                    and the email isn't needed to identify "you're the
                    admin" the way "Administrateur" already does. */}
                <p className="sidebar-user-name">{user?.email || 'Admin'}</p>
                <p className="sidebar-user-role">Administrateur</p>
              </div>
            </div>
            <button className="sidebar-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt" /> Déconnexion</button>
          </div>
        </aside>

        <main className="admin-main">

          {/* DEMANDES */}
          <div className={`tab-content${activeTab==='demandes'?' active':''}`} id="tab-demandes">
            <div className="adm-header">
              <div>
                <p className="adm-eyebrow">Gestion des demandes</p>
                <h1 className="adm-title">Demandes de réservation</h1>
              </div>
              <div className="adm-filters">
                {['all','pending','awaiting_payment','confirmed','terminee','refused'].map(f => {
                  const count = f==='all' ? reservations.length : reservations.filter(r => r.status===f).length
                  return (
                    <button key={f} className={`filter-btn${resaFilter===f?' active':''}`} onClick={() => setResaFilter(f)}>
                      {f==='all'?'Toutes':STATUS_LABEL[f]}<span className="filter-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="mat-search" style={{maxWidth:340,marginBottom:18}}>
              <i className="fas fa-search" />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom ou n° de commande…"
                value={resaSearch}
                onChange={e => setResaSearch(e.target.value)}
              />
              {resaSearch && (
                <button className="mat-search-clear" onClick={() => setResaSearch('')}>
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <ResaList reservations={reservations} paymentSummaries={paymentSummaries} filter={resaFilter} search={resaSearch} onStatus={updateResaStatus} onDelete={id => deleteResa(id, null)} onContact={r => setContactModal(r)} onViewPricing={r => setResaDetail({ id: r.id, backDate: null })} />
          </div>

          {/* CALENDRIER */}
          <div className={`tab-content${activeTab==='calendrier'?' active':''}`} id="tab-calendrier">
            <div className="adm-header"><div><p className="adm-eyebrow">Planning</p><h1 className="adm-title">Calendrier</h1></div></div>
            <CalNav year={calYear} month={calMonth} view={calView}
              onPrev={() => { if(calView==='year'){setCalYear(y=>y-1)}else{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1)}else setCalMonth(m=>m-1)} }}
              onNext={() => { if(calView==='year'){setCalYear(y=>y+1)}else{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1)}else setCalMonth(m=>m+1)} }}
              onToday={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()) }}
              onViewChange={setCalView}
            />
            <CalLegend />
            <div className="cal-grid-wrap">
              {calView==='month'
                ? <CalGrid year={calYear} month={calMonth} reservations={reservations} blockedDatesMap={blockedDatesMap} blockedHoursMap={blockedHoursMap} onDayClick={openDayModal} />
                : <YearGrid year={calYear} reservations={reservations} blockedDatesMap={blockedDatesMap} blockedHoursMap={blockedHoursMap} onDayClick={openDayModal} />
              }
            </div>
          </div>

          {/* BLOCAGES */}
          <div className={`tab-content${activeTab==='blocages'?' active':''}`} id="tab-blocages">
            <div className="adm-header">
              <div>
                <p className="adm-eyebrow">Disponibilités</p>
                <h1 className="adm-title">Blocages</h1>
                <p className="adm-sub">Cliquez sur un jour pour le bloquer ou gérer ses créneaux.</p>
              </div>
            </div>
            <CalNav year={blocYear} month={blocMonth} view={blocView}
              onPrev={() => { if(blocView==='year'){setBlocYear(y=>y-1)}else{if(blocMonth===0){setBlocMonth(11);setBlocYear(y=>y-1)}else setBlocMonth(m=>m-1)} }}
              onNext={() => { if(blocView==='year'){setBlocYear(y=>y+1)}else{if(blocMonth===11){setBlocMonth(0);setBlocYear(y=>y+1)}else setBlocMonth(m=>m+1)} }}
              onToday={() => { setBlocYear(new Date().getFullYear()); setBlocMonth(new Date().getMonth()) }}
              onViewChange={setBlocView}
            />
            <CalLegend />
            <div className="cal-grid-wrap">
              {blocView==='month'
                ? <CalGrid year={blocYear} month={blocMonth} reservations={reservations} blockedDatesMap={blockedDatesMap} blockedHoursMap={blockedHoursMap} onDayClick={openBlocModal} />
                : <YearGrid year={blocYear} reservations={reservations} blockedDatesMap={blockedDatesMap} blockedHoursMap={blockedHoursMap} onDayClick={openBlocModal} />
              }
            </div>
          </div>

          {/* MESSAGERIE */}
          <div className={`tab-content${activeTab==='messagerie'?' active':''}`} id="tab-messagerie">
            <div className="adm-header">
              <div>
                <p className="adm-eyebrow">Boîte de réception</p>
                <h1 className="adm-title">Messagerie</h1>
              </div>
              <div className="adm-filters">
                {['all','unread','read'].map(f => {
                  const count = f==='all' ? messages.length : f==='unread' ? messages.filter(m=>!m.read).length : messages.filter(m=>m.read).length
                  return (
                    <button key={f} className={`filter-btn${msgFilter===f?' active':''}`} onClick={() => setMsgFilter(f)}>
                      {f==='all'?'Tous':f==='unread'?'Non lus':'Lus'}<span className="filter-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <MsgList messages={messages} filter={msgFilter}
              onOpen={async m => { await markMsgRead(m.id); setMsgDetail(m) }}
              onDelete={id => deleteMsg(id, false)}
            />
          </div>

          {/* MATÉRIAUX */}
          <div className={`tab-content${activeTab==='materiaux'?' active':''}`} id="tab-materiaux">
            <div className="adm-header">
              <div>
                <p className="adm-eyebrow">Inventaire</p>
                <h1 className="adm-title">Matériel</h1>
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button className="adm-btn-ghost" onClick={() => setCatModalOpen(true)}><i className="fas fa-folder-plus" style={{marginRight:8}} />Ajouter une catégorie</button>
                <button className="adm-btn-primary" onClick={openAddMat}><i className="fas fa-plus" style={{marginRight:8}} />Ajouter un article</button>
              </div>
            </div>
            {matFormVisible && (
              <div className="modal-overlay" style={{display:'flex'}} onClick={e => { if (e.target === e.currentTarget) setMatFormVisible(false) }}>
                <div className="modal-card detail-modal-card mat-edit-modal-card">
                  <button className="modal-close" onClick={() => setMatFormVisible(false)}><i className="fas fa-times" /></button>
                  <h3 className="modal-title"><i className={`fas ${editingMat ? 'fa-pen' : 'fa-plus'}`} style={{marginRight:8,color:'var(--rose-gold)'}} />{editingMat ? "Modifier l'article" : 'Nouvel article'}</h3>

                  <div className="mat-form-tabs">
                    {MAT_FORM_TABS.map(t => (
                      <button key={t.key} className={`mat-form-tab${matFormTab===t.key?' active':''}`} onClick={() => setMatFormTab(t.key)}>{t.label}</button>
                    ))}
                  </div>

                  {matFormTab === 'infos' && (
                    <>
                      <div className="mat-form-grid">
                        <div className="adm-form-group">
                          <label>Nom <span className="req">*</span></label>
                          <input className="adm-input" value={matForm.name} onChange={e => setMatForm(f=>({...f,name:e.target.value}))} style={!matForm.name.trim()?{borderColor:'var(--danger)'}:{}} />
                        </div>
                        <div className="adm-form-group">
                          <label>Catégorie</label>
                          <select className="adm-input" value={matForm.category} onChange={e => setMatForm(f=>({...f,category:e.target.value}))}>
                            <option value="">— Sans catégorie —</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div className="adm-form-group">
                          <label>Description</label>
                          <input className="adm-input" placeholder="Courte description" value={matForm.description} onChange={e => setMatForm(f=>({...f,description:e.target.value}))} />
                        </div>
                        <div className="adm-form-group">
                          <label>Stock initial <span className="req">*</span></label>
                          <input type="number" min={1} className="adm-input" value={matForm.qty} onChange={e => { setMatForm(f=>({...f,qty:e.target.value})); setMatQtyError(false) }} style={matQtyError?{borderColor:'var(--danger)'}:{}} />
                          {matQtyError && <div style={{marginTop:6,color:'var(--danger)',fontSize:'.8rem',fontWeight:600}}><i className="fas fa-exclamation-circle" style={{marginRight:4}} />Veuillez entrer un nombre entier valide (≥ 1).</div>}
                        </div>
                      </div>
                      <div className="adm-form-group" style={{marginTop:8}}>
                        <label>Image <span className="adm-label-opt">(optionnel)</span></label>
                        <div className="img-upload-area" onClick={() => fileInputRef.current?.click()}>
                          {matImagePreview
                            ? <img src={matImagePreview} alt="" className="img-preview-thumb" />
                            : <div className="img-upload-placeholder"><i className="fas fa-image" /><p>Aucune image sélectionnée</p><span>JPG, PNG, WEBP — max 5 Mo</span></div>
                          }
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{display:'none'}} onChange={e => handleImageFile(e.target.files[0])} />
                        <div className="img-upload-btns">
                          <button className="adm-btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}><i className="fas fa-upload" style={{marginRight:4}} />Choisir une image</button>
                          {matImagePreview && <button className="adm-btn-delete btn-sm" onClick={removeImage}><i className="fas fa-times" style={{marginRight:4}} />Retirer</button>}
                        </div>
                      </div>
                    </>
                  )}

                  {matFormTab === 'tarification' && (
                    <div className="adm-form-group" style={{marginTop:8}}>
                      <label style={{display:'flex',alignItems:'flex-start',gap:8,fontWeight:400,fontSize:'.9rem',marginBottom:8,cursor:'pointer'}}>
                        <input type="checkbox" checked={matForm.tieredPricing} onChange={toggleTieredPricing} style={{marginTop:3,flexShrink:0}} />
                        {/* min-width:0 is the actual fix — a flex item's default min-width is
                            "auto" (its content's full width), so this text was refusing to
                            wrap and pushing the row's later items (the checkbox below, its
                            help icon) off past the edge on narrow mobile widths instead of
                            just flowing onto a second line like normal text. */}
                        <span style={{minWidth:0}}>Le tarif change selon la quantité louée</span>
                        <HelpTip text="Permet de fixer un prix différent selon la quantité louée, via des paliers (ex : moins cher à partir de 10 unités)." />
                      </label>
                      <label style={{display:'flex',alignItems:'flex-start',gap:8,fontWeight:400,fontSize:'.9rem',marginBottom:6,cursor:'pointer'}}>
                        <input type="checkbox" checked={matForm.weekendDiffers} onChange={toggleWeekendDiffers} style={{marginTop:3,flexShrink:0}} />
                        <span style={{minWidth:0}}>Le tarif est différent le week-end / jours fériés</span>
                        <HelpTip text="« Week-end » = vendredi à dimanche + jours fériés. « Semaine » = lundi à jeudi. Appliqué automatiquement selon la date choisie par le client." />
                      </label>

                      {matForm.tieredPricing && (
                        <div style={{display:'flex',alignItems:'center',gap:6,margin:'14px 0 8px'}}>
                          <span style={{fontSize:'.75rem',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--dark-mid)'}}>Paliers de quantité</span>
                          <HelpTip text={'Chaque ligne fixe un prix pour une tranche de quantité louée : par exemple 1 à 19 unités à un tarif, puis 20 unités et plus à un tarif dégressif. Le "Qté min" de la toute première ligne devient aussi la quantité minimale imposée au client pour cet article — ex : si la 1ère ligne commence à 20, il ne pourra jamais en louer moins de 20 (comme pour la Chaise Napoléon).'} />
                        </div>
                      )}

                      {matForm.tiers.map((t, i) => (
                        <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:10,flexWrap:'wrap'}}>
                          {matForm.tieredPricing && (
                            <>
                              <div>
                                <span style={{display:'block',fontSize:'.66rem',fontWeight:700,letterSpacing:'.4px',textTransform:'uppercase',color:'var(--gray)',marginBottom:3}}>Qté min</span>
                                <input type="number" min={1} className="adm-input" style={{width:80}} placeholder="Qté min" value={t.minQty} onChange={e => updateTierRow(i,'minQty',e.target.value)} />
                              </div>
                              <span style={{color:'var(--gray)',lineHeight:'38px',marginTop:16}}>à</span>
                              <div>
                                <span style={{display:'block',fontSize:'.66rem',fontWeight:700,letterSpacing:'.4px',textTransform:'uppercase',color:'var(--gray)',marginBottom:3}}>Qté max</span>
                                <input type="number" min={1} className="adm-input" style={{width:80}} placeholder="∞" value={t.maxQty} onChange={e => updateTierRow(i,'maxQty',e.target.value)} />
                              </div>
                            </>
                          )}
                          <div>
                            {/* Persistent micro-label, unlike the placeholder alone — the
                                placeholder disappears once a price is typed in, so there was
                                no way left to tell which field was which at a glance. */}
                            {matForm.weekendDiffers && (
                              <span style={{display:'block',fontSize:'.66rem',fontWeight:700,letterSpacing:'.4px',textTransform:'uppercase',color:'var(--gray)',marginBottom:3}}>Semaine</span>
                            )}
                            <input type="number" min={0} step="0.01" className="adm-input" style={{width:130}} placeholder={matForm.weekendDiffers ? 'Prix semaine HT' : 'Prix HT'} value={t.weekday} onChange={e => updateTierRow(i,'weekday',e.target.value)} />
                            {t.weekday !== '' && !isNaN(parseFloat(t.weekday)) && <div style={{fontSize:'.72rem',color:'var(--gray)',marginTop:2}}>= {(parseFloat(t.weekday)*1.2).toFixed(2)} € TTC</div>}
                          </div>
                          {matForm.weekendDiffers && (
                            <div>
                              <span style={{display:'block',fontSize:'.66rem',fontWeight:700,letterSpacing:'.4px',textTransform:'uppercase',color:'var(--gray)',marginBottom:3}}>Week-end / Férié</span>
                              <input type="number" min={0} step="0.01" className="adm-input" style={{width:130}} placeholder="Prix week-end HT" value={t.weekend} onChange={e => updateTierRow(i,'weekend',e.target.value)} />
                              {t.weekend !== '' && !isNaN(parseFloat(t.weekend)) && <div style={{fontSize:'.72rem',color:'var(--gray)',marginTop:2}}>= {(parseFloat(t.weekend)*1.2).toFixed(2)} € TTC</div>}
                            </div>
                          )}
                          {matForm.tieredPricing && matForm.tiers.length > 1 && (
                            <button className="adm-btn-delete btn-sm" onClick={() => removeTierRow(i)}><i className="fas fa-trash" /></button>
                          )}
                        </div>
                      ))}
                      {matForm.tieredPricing && (
                        <button className="adm-btn-ghost btn-sm" onClick={addTierRow}><i className="fas fa-plus" style={{marginRight:4}} />Ajouter un palier</button>
                      )}
                      {matTiersError && <div style={{marginTop:6,color:'var(--danger)',fontSize:'.8rem',fontWeight:600}}><i className="fas fa-exclamation-circle" style={{marginRight:4}} />{matTiersError}</div>}
                      {matPriceError && <div style={{marginTop:6,color:'var(--danger)',fontSize:'.8rem',fontWeight:600}}><i className="fas fa-exclamation-circle" style={{marginRight:4}} />Veuillez entrer des prix valides (≥ 0).</div>}
                    </div>
                  )}

                  <div className="mat-form-actions">
                    <button className="adm-btn-primary" onClick={saveMaterial} disabled={matSaving}>
                      {matSaving ? <><i className="fas fa-circle-notch fa-spin" style={{marginRight:8}} />Enregistrement…</> : <><i className="fas fa-save" style={{marginRight:8}} />Enregistrer</>}
                    </button>
                    <button className="adm-btn-ghost" onClick={() => setMatFormVisible(false)}>Annuler</button>
                  </div>
                </div>
              </div>
            )}
            <MatTable materials={materials} tiersByMaterial={groupTiersByMaterial(materialTiers)} page={matPage} onPageChange={setMatPage} onEdit={openEditMat} onDelete={deleteMat} onToggle={toggleAvail} />
          </div>

          {/* VISUEL SITE */}
          <div className={`tab-content${activeTab==='visuel'?' active':''}`} id="tab-visuel">
            <div className="adm-header">
              <div>
                <p className="adm-eyebrow">Contenu du site</p>
                <h1 className="adm-title">Visuel Site</h1>
              </div>
            </div>

            <div className="block-tabs">
              <button className={`block-tab${visuelTab==='accueil'?' active':''}`} onClick={() => setVisuelTab('accueil')}>Accueil</button>
              <button className={`block-tab${visuelTab==='prestations'?' active':''}`} onClick={() => setVisuelTab('prestations')}>Prestations</button>
              <button className={`block-tab${visuelTab==='galerie'?' active':''}`} onClick={() => setVisuelTab('galerie')}>Galerie</button>
              <button className={`block-tab${visuelTab==='apropos'?' active':''}`} onClick={() => setVisuelTab('apropos')}>À Propos</button>
            </div>
            {/* Mobile-only: the 5-item pill row above doesn't fit a phone
                width without either scrolling or squashing to illegible
                widths — a tap-to-expand menu instead. */}
            <div className="block-tabs-mobile">
              <button type="button" className="block-tabs-mobile-trigger" onClick={() => setVisuelMenuOpen(o => !o)}>
                <span>{VISUEL_TABS.find(t => t.key === visuelTab)?.label}</span>
                <i className={`fas fa-chevron-down${visuelMenuOpen ? ' is-open' : ''}`} />
              </button>
              {visuelMenuOpen && (
                <div className="block-tabs-mobile-list">
                  {VISUEL_TABS.map(t => (
                    <button
                      key={t.key}
                      className={`block-tabs-mobile-option${visuelTab===t.key?' active':''}`}
                      onClick={() => { setVisuelTab(t.key); setVisuelMenuOpen(false) }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {visuelTab==='accueil' && <ImageSlotGrid contentKey="images_home" slots={HOME_SLOTS} bucket="home" />}
            {visuelTab==='prestations' && <ImageSlotGrid contentKey="images_services" slots={SERVICES_SLOTS} bucket="services" />}
            {visuelTab==='galerie' && <GalerieManager />}

            {visuelTab==='apropos' && (
            <div className="mat-form-card">
              <div className="adm-form-group">
                <label>Nom du fondateur <span className="req">*</span></label>
                <input className="adm-input" value={aboutForm.founderName} onChange={e => setAboutForm(f => ({...f, founderName: e.target.value}))} placeholder="Ex : Emir Dupont, fondateur d'OA Événementiel" />
              </div>
              <div className="adm-form-group">
                <label>Votre histoire <span className="req">*</span></label>
                <textarea className="adm-input" rows={4} value={aboutForm.story} onChange={e => setAboutForm(f => ({...f, story: e.target.value}))} placeholder="Pourquoi ce métier vous anime, depuis quand vous organisez des événements…" />
              </div>

              <div className="adm-form-group">
                <label>Photo du fondateur <span className="adm-label-opt">(optionnel)</span></label>
                <div className="img-upload-area" onClick={() => aboutFileInputRef.current?.click()}>
                  {aboutImagePreview
                    ? <img src={aboutImagePreview} alt="" className="img-preview-thumb" />
                    : <div className="img-upload-placeholder"><i className="fas fa-image" /><p>Aucune photo sélectionnée</p><span>JPG, PNG, WEBP — max 5 Mo</span></div>
                  }
                </div>
                <input ref={aboutFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{display:'none'}} onChange={e => handleAboutImageFile(e.target.files[0])} />
                <div className="img-upload-btns">
                  <button className="adm-btn-ghost btn-sm" onClick={() => aboutFileInputRef.current?.click()}><i className="fas fa-upload" style={{marginRight:4}} />Choisir une photo</button>
                  {aboutImagePreview && <button className="adm-btn-delete btn-sm" onClick={removeAboutImage}><i className="fas fa-times" style={{marginRight:4}} />Retirer</button>}
                </div>
              </div>

              <div className="adm-form-group">
                <label>Bannière de page <span className="adm-label-opt">(optionnel)</span></label>
                <div className="img-upload-area" onClick={() => aboutHeaderInputRef.current?.click()}>
                  {aboutHeaderPreview
                    ? <img src={aboutHeaderPreview} alt="" className="img-preview-thumb" />
                    : <div className="img-upload-placeholder"><i className="fas fa-image" /><p>Image par défaut</p><span>JPG, PNG, WEBP — max 5 Mo</span></div>
                  }
                </div>
                <input ref={aboutHeaderInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{display:'none'}} onChange={e => handleAboutHeaderFile(e.target.files[0])} />
                <div className="img-upload-btns">
                  <button className="adm-btn-ghost btn-sm" onClick={() => aboutHeaderInputRef.current?.click()}><i className="fas fa-upload" style={{marginRight:4}} />Choisir une image</button>
                  {aboutHeaderPreview && <button className="adm-btn-delete btn-sm" onClick={removeAboutHeader}><i className="fas fa-times" style={{marginRight:4}} />Réinitialiser</button>}
                </div>
              </div>

              <p style={{fontWeight:700, fontSize:'.85rem', margin:'20px 0 10px'}}>Chiffres clés</p>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
                {aboutForm.counters.map((c, i) => (
                  <div key={i} style={{display:'flex', gap:8}}>
                    <div className="adm-form-group" style={{flex:'0 0 90px'}}>
                      <label>Chiffre {i+1}</label>
                      <input className="adm-input" value={c.count} onChange={e => setAboutForm(f => ({...f, counters: f.counters.map((cc,idx) => idx===i ? {...cc, count:e.target.value} : cc)}))} placeholder="Ex : 5+" />
                    </div>
                    <div className="adm-form-group" style={{flex:1}}>
                      <label>Légende</label>
                      <input className="adm-input" value={c.label} onChange={e => setAboutForm(f => ({...f, counters: f.counters.map((cc,idx) => idx===i ? {...cc, label:e.target.value} : cc)}))} placeholder="Ex : Ans d'expérience" />
                    </div>
                  </div>
                ))}
              </div>

              <p style={{fontWeight:700, fontSize:'.85rem', margin:'24px 0 10px'}}>Nos valeurs</p>
              {aboutForm.values.map((v, i) => (
                <div key={i} style={{display:'flex', gap:12, alignItems:'flex-start', marginBottom:12, paddingBottom:12, borderBottom: i<3 ? '1px solid var(--border)' : 'none'}}>
                  <img src={ABOUT_VALUE_ICONS[i]} alt="" style={{width:36, height:36, opacity:.7, marginTop:22}} />
                  <div className="adm-form-group" style={{flex:1, marginBottom:0}}>
                    <label>Titre {i+1}</label>
                    <input className="adm-input" value={v.title} onChange={e => setAboutForm(f => ({...f, values: f.values.map((vv,idx) => idx===i ? {...vv, title:e.target.value} : vv)}))} />
                  </div>
                  <div className="adm-form-group" style={{flex:2, marginBottom:0}}>
                    <label>Description</label>
                    <input className="adm-input" value={v.text} onChange={e => setAboutForm(f => ({...f, values: f.values.map((vv,idx) => idx===i ? {...vv, text:e.target.value} : vv)}))} />
                  </div>
                </div>
              ))}

              {aboutError && (
                <div style={{marginTop:8,background:'#fff5f5',border:'1.5px solid #fca5a5',borderRadius:8,padding:'9px 13px',color:'var(--danger)',fontSize:'.83rem',fontWeight:600}}>
                  <i className="fas fa-exclamation-circle" style={{marginRight:4}} />{aboutError}
                </div>
              )}
              <div className="mat-form-actions">
                <button className="adm-btn-primary" onClick={saveAboutContent} disabled={aboutSaving}>
                  {aboutSaving ? <><i className="fas fa-circle-notch fa-spin" style={{marginRight:8}} />Enregistrement…</> : <><i className="fas fa-save" style={{marginRight:8}} />Enregistrer</>}
                </button>
                {aboutSaved && <span style={{marginLeft:12,color:'#2e7d32',fontWeight:700,fontSize:'.85rem'}}><i className="fas fa-check" style={{marginRight:4}} />Enregistré</span>}
              </div>
            </div>
            )}
          </div>

          {/* RÉGLAGES */}
          <div className={`tab-content${activeTab==='reglages'?' active':''}`} id="tab-reglages">
            <div className="adm-header">
              <div>
                <p className="adm-eyebrow">Configuration</p>
                <h1 className="adm-title">Réglages</h1>
                <p className="adm-sub">Point de départ et frais de livraison utilisés pour le calcul automatique lors d'une réservation.</p>
              </div>
            </div>
            <div className="mat-form-card" style={{maxWidth:640,margin:'0 auto'}}>
              <div className="block-tabs">
                <button className={`block-tab${reglagesTab==='adresse'?' active':''}`} onClick={() => setReglagesTab('adresse')}>Adresse &amp; livraison</button>
                <button className={`block-tab${reglagesTab==='virement'?' active':''}`} onClick={() => setReglagesTab('virement')}>Virement</button>
                <button className={`block-tab${reglagesTab==='installments'?' active':''}`} onClick={() => setReglagesTab('installments')}>Paiement en plusieurs fois</button>
              </div>
              <div className="block-tabs-mobile">
                <button type="button" className="block-tabs-mobile-trigger" onClick={() => setReglagesMenuOpen(o => !o)}>
                  <span>{REGLAGES_TABS.find(t => t.key === reglagesTab)?.label}</span>
                  <i className={`fas fa-chevron-down${reglagesMenuOpen ? ' is-open' : ''}`} />
                </button>
                {reglagesMenuOpen && (
                  <div className="block-tabs-mobile-list">
                    {REGLAGES_TABS.map(t => (
                      <button
                        key={t.key}
                        className={`block-tabs-mobile-option${reglagesTab===t.key?' active':''}`}
                        onClick={() => { setReglagesTab(t.key); setReglagesMenuOpen(false) }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {reglagesTab==='adresse' && (
                <div>
                  <p style={{color:'var(--gray)',fontSize:'.82rem',marginTop:0,marginBottom:14}}>
                    Point de départ et frais de livraison utilisés pour le calcul automatique lors d'une réservation.
                  </p>
                  <div className="adm-form-group">
                    <label>Adresse de départ (dépôt) <span className="req">*</span></label>
                    <input
                      className="adm-input"
                      placeholder="N°, rue, code postal, ville"
                      value={settingsForm.depot_address}
                      onChange={e => setSettingsForm(f => ({...f, depot_address: e.target.value}))}
                      style={settingsError && !settingsForm.depot_address.trim() ? {borderColor:'var(--danger)'} : {}}
                    />
                  </div>
                  <div className="mat-form-grid">
                    <div className="adm-form-group">
                      <label>Frais de base (€) <span className="req">*</span></label>
                      <input
                        type="number" min={0} step="0.01"
                        className="adm-input"
                        value={settingsForm.delivery_base_fee}
                        onChange={e => setSettingsForm(f => ({...f, delivery_base_fee: e.target.value}))}
                      />
                    </div>
                    <div className="adm-form-group">
                      <label>Frais par km (€) <span className="req">*</span></label>
                      <input
                        type="number" min={0} step="0.01"
                        className="adm-input"
                        value={settingsForm.delivery_per_km}
                        onChange={e => setSettingsForm(f => ({...f, delivery_per_km: e.target.value}))}
                      />
                    </div>
                  </div>
                  <div className="adm-form-group">
                    <label>Jours consécutifs maximum par réservation <span className="req">*</span></label>
                    <input
                      type="number" min={1} max={30} step="1"
                      className="adm-input"
                      style={{maxWidth:160}}
                      value={settingsForm.max_consecutive_days}
                      onChange={e => setSettingsForm(f => ({...f, max_consecutive_days: e.target.value}))}
                    />
                    <p style={{color:'var(--gray)',fontSize:'.78rem',margin:'6px 0 0'}}>
                      Nombre de jours consécutifs qu'un client peut sélectionner à l'étape "Date" du formulaire de réservation.
                    </p>
                  </div>
                </div>
              )}

              {reglagesTab==='virement' && (
                <div>
                  <p style={{color:'var(--gray)',fontSize:'.82rem',marginTop:0,marginBottom:14}}>
                    Coordonnées affichées au client s'il choisit de payer par virement. Laissez l'IBAN vide pour désactiver cette option de paiement.
                  </p>
                  <div className="adm-form-group">
                    <label>Titulaire du compte</label>
                    <input
                      className="adm-input"
                      placeholder="Ex : OA Événementiel"
                      value={settingsForm.bank_holder}
                      onChange={e => setSettingsForm(f => ({...f, bank_holder: e.target.value}))}
                    />
                  </div>
                  <div className="mat-form-grid">
                    <div className="adm-form-group">
                      <label>IBAN</label>
                      <input
                        className="adm-input"
                        placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                        value={settingsForm.bank_iban}
                        onChange={e => setSettingsForm(f => ({...f, bank_iban: e.target.value}))}
                      />
                    </div>
                    <div className="adm-form-group">
                      <label>BIC</label>
                      <input
                        className="adm-input"
                        placeholder="Ex : BNPAFRPPXXX"
                        value={settingsForm.bank_bic}
                        onChange={e => setSettingsForm(f => ({...f, bank_bic: e.target.value}))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {reglagesTab==='installments' && (
                <div>
                  <p style={{color:'var(--gray)',fontSize:'.82rem',marginTop:0,marginBottom:14}}>
                    Les dates de chaque versement se calculent automatiquement : le premier est prélevé immédiatement, puis chaque versement suivant tombe le même jour du mois (ex : réservé le 8 → prélèvements les 8 de chaque mois). Réglez uniquement le montant minimum de commande requis pour chaque plan — un plan reste proposé au client seulement si tous ses versements, y compris le dernier, tombent au moins 3 jours avant l'événement.
                  </p>

                  <InstallmentTierFields
                    title="Paiement en 2 fois"
                    minAmount={settingsForm.installment_2x_min_amount} onMinAmount={v => setSettingsForm(f => ({...f, installment_2x_min_amount: v}))}
                  />
                  <InstallmentTierFields
                    title="Paiement en 3 fois"
                    minAmount={settingsForm.installment_3x_min_amount} onMinAmount={v => setSettingsForm(f => ({...f, installment_3x_min_amount: v}))}
                  />
                  <InstallmentTierFields
                    title="Paiement en 4 fois"
                    minAmount={settingsForm.installment_min_total_4x} onMinAmount={v => setSettingsForm(f => ({...f, installment_min_total_4x: v}))}
                    last
                  />
                </div>
              )}

              {settingsError && (
                <div style={{marginTop:8,background:'#fff5f5',border:'1.5px solid #fca5a5',borderRadius:8,padding:'9px 13px',color:'var(--danger)',fontSize:'.83rem',fontWeight:600}}>
                  <i className="fas fa-exclamation-circle" style={{marginRight:4}} />{settingsError}
                </div>
              )}
              <div className="mat-form-actions">
                <button className="adm-btn-primary" onClick={saveSettings} disabled={settingsSaving}>
                  {settingsSaving ? <><i className="fas fa-circle-notch fa-spin" style={{marginRight:8}} />Enregistrement…</> : <><i className="fas fa-save" style={{marginRight:8}} />Enregistrer</>}
                </button>
                {settingsSaved && <span style={{marginLeft:12,color:'#2e7d32',fontWeight:700,fontSize:'.85rem'}}><i className="fas fa-check" style={{marginRight:4}} />Enregistré</span>}
              </div>
            </div>
          </div>
        </main>

        {/* MODALS */}
        {(dayModal || resaDetail) && (
          <div className="modal-overlay" style={{display:'flex'}} onClick={e => { if(e.target===e.currentTarget) closeModal() }}>
            <div className={`modal-card ${resaDetail ? 'detail-modal-card' : 'day-modal-card'}`}>
              <button className="modal-close" onClick={closeModal}><i className="fas fa-times" /></button>
              {resaDetail && (
                <ResaDetail
                  resa={reservations.find(r => r.id === resaDetail.id)}
                  backDate={resaDetail.backDate}
                  onBack={resaDetail.backDate ? () => { setResaDetail(null); setDayModal({ dateStr: resaDetail.backDate, mode:'calendar', page:0 }) } : null}
                  onStatus={updateResaStatus}
                  onDelete={id => deleteResa(id, null)}
                />
              )}
              {dayModal && !resaDetail && dayModal.mode === 'calendar' && (
                <DayCalModal
                  dateStr={dayModal.dateStr}
                  page={dayModal.page||0}
                  reservations={reservations}
                  blockedDatesMap={blockedDatesMap}
                  blockedHoursMap={blockedHoursMap}
                  onPage={p => setDayModal(prev => ({...prev, page:p}))}
                  onResaClick={id => setResaDetail({ id, backDate: dayModal.dateStr })}
                />
              )}
              {dayModal && !resaDetail && dayModal.mode === 'blocage' && (
                <DayBlocModal
                  dateStr={dayModal.dateStr}
                  reservations={reservations}
                  blockedDatesMap={blockedDatesMap}
                  blockedHoursMap={blockedHoursMap}
                  blockTab={blockTab} onBlockTabChange={setBlockTab}
                  blockReason={blockReason} onReasonChange={setBlockReason}
                  blockSelHours={blockSelHours}
                  onToggleHour={h => setBlockSelHours(prev => prev.includes(h)?prev.filter(x=>x!==h):[...prev,h])}
                  onSaveFull={() => saveFullBlock(dayModal.dateStr)}
                  onUnblock={() => unblockFull(dayModal.dateStr)}
                  onSaveHours={() => saveHourBlocks(dayModal.dateStr)}
                  onClearHours={() => clearHourBlocks(dayModal.dateStr)}
                />
              )}
            </div>
          </div>
        )}

        {deleteModal && (
          <div className="modal-overlay" style={{display:'flex'}} onClick={e => { if(e.target===e.currentTarget) setDeleteModal(null) }}>
            <div className="modal-card delete-modal-card">
              <div className="del-modal-icon"><i className="fas fa-trash" /></div>
              <h3 className="del-modal-title">Supprimer ?</h3>
              <p className="del-modal-sub">{deleteModal.subtitle}</p>
              <div className="del-modal-actions">
                <button className="adm-btn-ghost" onClick={() => setDeleteModal(null)}>Annuler</button>
                <button className="adm-btn-danger" onClick={async () => { await deleteModal.callback(); setDeleteModal(null) }}>
                  <i className="fas fa-trash" style={{marginRight:8}} />Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {catModalOpen && (
          <div className="modal-overlay" style={{display:'flex'}} onClick={e => { if(e.target===e.currentTarget) setCatModalOpen(false) }}>
            <div className="modal-card" style={{maxWidth:400}}>
              <button className="modal-close" onClick={() => setCatModalOpen(false)}><i className="fas fa-times" /></button>
              <h3 className="modal-title"><i className="fas fa-folder-plus" style={{marginRight:8,color:'var(--rose-gold)'}} />Catégories</h3>
              <div className="adm-form-group">
                <label>Nouvelle catégorie</label>
                <div style={{display:'flex',gap:8}}>
                  <input className="adm-input" placeholder="Ex : Mobilier" value={catInput} onChange={e => setCatInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&saveCategory()} style={{flex:1}} />
                  <button className="adm-btn-primary" onClick={saveCategory} style={{flexShrink:0}}><i className="fas fa-plus" style={{marginRight:4}} />Ajouter</button>
                </div>
                {catError && <div style={{marginTop:8,background:'#fff5f5',border:'1.5px solid #fca5a5',borderRadius:8,padding:'9px 13px',color:'var(--danger)',fontSize:'.83rem',fontWeight:600}}><i className="fas fa-exclamation-circle" style={{marginRight:4}} />{catError}</div>}
              </div>
              <CatList categories={categories} page={catPage} onPage={setCatPage} onDelete={deleteCat} />
            </div>
          </div>
        )}

        {contactModal && (
          <div className="modal-overlay" style={{display:'flex'}} onClick={e => { if(e.target===e.currentTarget) setContactModal(null) }}>
            <div className="modal-card">
              <button className="modal-close" onClick={() => setContactModal(null)}><i className="fas fa-times" /></button>
              <h3 className="modal-title">Contacter le client</h3>
              <ContactModal resa={contactModal} />
            </div>
          </div>
        )}

        {msgDetail && (
          <div className="modal-overlay" style={{display:'flex'}} onClick={e => { if(e.target===e.currentTarget) setMsgDetail(null) }}>
            <div className="modal-card day-modal-card">
              <button className="modal-close" onClick={() => setMsgDetail(null)}><i className="fas fa-times" /></button>
              <MsgDetail msg={messages.find(m=>m.id===msgDetail.id)||msgDetail} onDelete={() => deleteMsg(msgDetail.id, true)} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Sub-components ─────────────────────────────────── */

// Small "ⓘ" trigger that reveals a short explanation on click — used in
// place of permanent paragraphs of help text cluttering a form (e.g. the
// Tarification tab). Click-to-toggle rather than hover so it works the same
// on mobile (no hover state) and desktop, and closes on blur so it never
// gets stuck open after clicking elsewhere.
//
// The bubble is centered on the icon by default (see .help-tip-bubble CSS),
// but the icon itself can end up anywhere horizontally — after a short
// label, or after text that's wrapped onto a new line right at the edge of
// a narrow mobile modal — so plain centering still let it run off-screen
// and get clipped. Once open, this measures the bubble's actual rendered
// position and nudges it back inside the viewport with an extra transform
// offset; the arrow (::after, via --arrow-shift) gets the opposite
// correction so it still points back at the icon instead of drifting off
// with the rest of the bubble.
function HelpTip({ text }) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const bubbleRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const bubble = bubbleRef.current
    if (!bubble) return
    const r = bubble.getBoundingClientRect()
    const margin = 10
    let delta = 0
    if (r.left < margin) delta = margin - r.left
    else if (r.right > window.innerWidth - margin) delta = (window.innerWidth - margin) - r.right
    if (delta) setShift(delta)
  }, [open])

  return (
    <span className="help-tip">
      <button
        type="button"
        className="help-tip-btn"
        onClick={() => { setShift(0); setOpen(o => !o) }}
        onBlur={() => setOpen(false)}
        aria-label="Aide"
        aria-expanded={open}
      >
        <i className="fas fa-info" />
      </button>
      {open && (
        <span
          ref={bubbleRef}
          className="help-tip-bubble"
          style={{ transform: `translateX(calc(-50% + ${shift}px))`, '--arrow-shift': `${-shift}px` }}
        >
          {text}
        </span>
      )}
    </span>
  )
}

function InstallmentTierFields({ title, minAmount, onMinAmount, last }) {
  return (
    <div style={{marginBottom: last?0:22, paddingBottom: last?0:18, borderBottom: last?'none':'1px solid var(--border)'}}>
      <h3 style={{marginTop:0,marginBottom:12,fontSize:'.95rem'}}>{title}</h3>
      <div className="adm-form-group">
        <label>Montant minimum de commande (€)</label>
        <input type="number" min={0} step="1" className="adm-input" style={{maxWidth:220}} value={minAmount} onChange={e => onMinAmount(e.target.value)} />
      </div>
    </div>
  )
}

// pk_test_... vs pk_live_... tells us which Stripe dashboard (test or live
// mode) the "vérifier sur Stripe" link on a paid reservation should open —
// the two modes have entirely separate payment lists.
const STRIPE_DASHBOARD_URL = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').startsWith('pk_live_')
  ? 'https://dashboard.stripe.com/payments'
  : 'https://dashboard.stripe.com/test/payments'

// Single combobox for every status transition — replaces the old set of
// status-specific buttons (Accepter/Marquer payé/Matériel rendu/Refuser) so
// there's one consistent control everywhere a reservation's status can be
// changed (list card footer on desktop, detail popup on both), instead of
// only some transitions being one click away and others needing a delete +
// recreate. Manages its own open/closed state — give it `key={resa.id}`
// wherever the same slot can render different reservations (e.g. ResaDetail
// swapping between cards) so that state resets on switch.
function StatusChanger({ resa, onStatus }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`status-changer${open ? ' is-open' : ''}`} onClick={e => e.stopPropagation()}>
      <button type="button" className="status-changer-trigger" onClick={() => setOpen(o => !o)}>
        <span><i className="fas fa-arrows-rotate" style={{marginRight:8}} />Changer de statut</span>
        <i className={`fas fa-chevron-down${open ? ' is-open' : ''}`} />
      </button>
      {open && (
        <div className="status-changer-list">
          {/* Every status is listed, including the current one — shown
              disabled + checked instead of filtered out, so the list reads
              as a full picture of "here's where this sits" rather than just
              "here's where you can send it". */}
          {Object.keys(STATUS_LABEL).map(s => {
            const isCurrent = s === resa.status
            return (
              <button
                key={s}
                type="button"
                className={`status-changer-option${isCurrent ? ' is-current' : ''}`}
                disabled={isCurrent}
                onClick={() => { onStatus(resa.id, s); setOpen(false) }}
              >
                <span className={`status-badge ${STATUS_CLASS[s]||''}`}>{STATUS_LABEL[s]}</span>
                {isCurrent ? (
                  <span className="status-changer-current-tag"><i className="fas fa-check" />Actuel</span>
                ) : (
                  <i className="fas fa-arrow-right" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ResaList({ reservations, paymentSummaries, filter, search, onStatus, onDelete, onContact, onViewPricing }) {
  const byStatus = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)
  const q = (search || '').trim().toLowerCase()
  const filtered = !q ? byStatus : byStatus.filter(r => {
    const name = [r.prenom, r.nom].filter(Boolean).join(' ').toLowerCase()
    return name.includes(q)
      || (r.prenom || '').toLowerCase().includes(q)
      || (r.nom || '').toLowerCase().includes(q)
      || (r.reference || '').toLowerCase().includes(q)
      || (r.id || '').toLowerCase().includes(q)
  })
  if (!filtered.length) return (
    <div className="adm-empty"><i className="fas fa-inbox" /><p>{q ? 'Aucune demande ne correspond à votre recherche.' : `Aucune demande${filter!=='all'?' dans cette catégorie':''}.`}</p></div>
  )
  return (
    <div id="reservations-list">
      {filtered.map(r => {
        const name = [r.prenom, r.nom].filter(Boolean).join(' ')
        return (
          <div
            key={r.id}
            className="resa-card"
            data-status={r.status}
            onClick={() => onViewPricing(r)}
          >
            <div className="resa-card-head">
              <div className="resa-card-head-main">
                {r.reference && (
                  <div className="resa-card-ref-line">
                    <span className="resa-card-ref"><i className="fas fa-hashtag" />{r.reference}</span>
                    <button className="resa-detail-link" onClick={e => { e.stopPropagation(); onViewPricing(r) }}><i className="fas fa-receipt" />Voir le détail</button>
                  </div>
                )}
                <div className="resa-name-row">
                  {name && <span className="resa-card-name"><i className="fas fa-user" style={{marginRight:6}} />{name}</span>}
                  <div className="resa-icon-actions">
                    {r.phone && <a className="resa-icon-btn" href={`tel:${r.phone}`} title="Appeler" onClick={e => e.stopPropagation()}><i className="fas fa-phone" /></a>}
                    <button className="resa-icon-btn" onClick={e => { e.stopPropagation(); onContact(r) }} title="Email"><i className="fas fa-envelope" /></button>
                  </div>
                </div>
                <span className="resa-card-email"><i className="fas fa-envelope" style={{marginRight:6}} />{r.email}</span>
                {r.phone && <span className="resa-card-phone"><i className="fas fa-phone" style={{marginRight:6}} />{r.phone}</span>}
                {/* Mobile-only compact preview — the card collapses to just
                    this + the ref/name/status above on small screens (see
                    admin.css), tapping it opens the same detail popup that
                    "Voir le détail" opens on desktop. */}
                <span className="resa-card-date-compact"><i className="fas fa-calendar" style={{marginRight:6}} />{fmtResaDate(r)}</span>
              </div>
              <div className="resa-card-head-side">
                <span className={`status-badge ${STATUS_CLASS[r.status]||''}`}>{STATUS_LABEL[r.status]||r.status}</span>
                {paymentSummaries?.[r.id]?.paidCount > 0 && (() => {
                  const s = paymentSummaries[r.id]
                  return (
                    <div className="resa-payment-block">
                      <span className="resa-payment-notice">
                        <i className="fas fa-bell" /><i className="fas fa-check" /> Paiement de {s.paidAmount.toFixed(2)} € reçu ({s.paidCount}/{s.total})
                      </span>
                      <div className="resa-payment-verify">
                        <span>Cliquer ici pour vérifier :</span>
                        <a href={STRIPE_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="resa-verify-btn" onClick={e => e.stopPropagation()}>
                          Stripe <i className="fas fa-arrow-right" />
                        </a>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
            <div className="resa-card-body">
              <div className="resa-meta">
                <span><i className="fas fa-calendar" style={{marginRight:4}} />{fmtResaDate(r)}</span>
                {r.event_type && <span><i className="fas fa-tag" style={{marginRight:4}} />{r.event_type}</span>}
                {r.nb_persons && <span><i className="fas fa-users" style={{marginRight:4}} />{r.nb_persons} pers.</span>}
              </div>
              {r.materials?.length > 0 && <p className="resa-mats"><i className="fas fa-boxes" style={{marginRight:6}} />{r.materials.map(m=>m.name+' × '+m.quantity).join(', ')}</p>}
              {r.delivery_address && <p className="resa-mats"><i className="fas fa-truck" style={{marginRight:6}} />{r.delivery_address}{r.distance_km!=null?` — ${r.distance_km} km`:''}{r.delivery_fee!=null?` — livraison ${r.delivery_fee.toFixed(2)} €`:''}</p>}
              {r.grand_total!=null && <p className="resa-mats"><i className="fas fa-euro-sign" style={{marginRight:6}} /><strong>Total estimé : {r.grand_total.toFixed(2)} €</strong></p>}
              {r.message && <p className="resa-msg"><i className="fas fa-comment" style={{marginRight:6}} />{r.message}</p>}
              <p className="resa-created">Reçue le {new Date(r.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</p>
            </div>
            <div className="resa-card-actions" onClick={e => e.stopPropagation()}>
              <div className="detail-actions-block">
                <StatusChanger resa={r} onStatus={onStatus} />
                {r.status!=='confirmed' && <button className="detail-delete-link" onClick={() => onDelete(r.id)}><i className="fas fa-trash" />Supprimer la demande</button>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CalNav({ year, month, view, onPrev, onNext, onToday, onViewChange }) {
  const monthName = view==='year' ? String(year) : (() => { const s=new Date(year,month,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}); return s.charAt(0).toUpperCase()+s.slice(1) })()
  return (
    <div className="cal-nav">
      <button className="cal-nav-btn" onClick={onPrev}><i className="fas fa-chevron-left" /></button>
      <span className="cal-month-label">{monthName}</span>
      <button className="cal-nav-btn" onClick={onNext}><i className="fas fa-chevron-right" /></button>
      <button className="cal-today-btn" onClick={onToday}><i className="fas fa-calendar-day" style={{marginRight:4}} />Aujourd'hui</button>
      <div className="cal-view-toggle">
        <button className={`cal-view-btn${view==='month'?' active':''}`} onClick={() => onViewChange('month')}>Mois</button>
        <button className={`cal-view-btn${view==='year'?' active':''}`} onClick={() => onViewChange('year')}>Année</button>
      </div>
    </div>
  )
}

function CalLegend() {
  return (
    <div className="cal-legend">
      <span className="leg-item"><span className="leg-dot leg-booked" /> Confirmée</span>
      <span className="leg-item"><span className="leg-dot leg-pending" /> En attente</span>
      <span className="leg-item"><span className="leg-dot leg-blocked" /> Bloqué (journée)</span>
      <span className="leg-item"><span className="leg-dot leg-partial" /> Créneaux bloqués</span>
    </div>
  )
}

function CalGrid({ year, month, reservations, blockedDatesMap, blockedHoursMap, onDayClick }) {
  const today = fmtDate(new Date())
  const firstDay = (new Date(year,month,1).getDay()+6)%7
  const daysInMonth = new Date(year,month+1,0).getDate()
  const monthStr = year+'-'+String(month+1).padStart(2,'0')
  const monthStart = monthStr+'-01'
  const monthEnd = monthStr+'-'+String(daysInMonth).padStart(2,'0')

  const eventMap = {}
  reservations.forEach(r => {
    getRDates(r).filter(d => d>=monthStart&&d<=monthEnd).forEach(d => {
      const rd=getRDates(r); const spanType=rd.length===1?'single':d===rd[0]?'start':d===rd[rd.length-1]?'end':'mid'
      if(!eventMap[d])eventMap[d]=[]; eventMap[d].push({ r, spanType })
    })
  })

  const cells = []
  for(let i=0;i<firstDay;i++) cells.push({ empty:true })
  for(let d=1;d<=daysInMonth;d++) {
    const ds=monthStr+'-'+String(d).padStart(2,'0')
    cells.push({ d, ds, isPast:ds<today, isToday:ds===today, isBlocked:!!blockedDatesMap[ds], dayHours:blockedHoursMap[ds]||[], dayEvents:(eventMap[ds]||[]).filter(e=>e.r.status!=='refused'), reason:blockedDatesMap[ds]?.reason })
  }

  return (
    <div className="cal-grid">
      {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => <div key={d} className="cal-day-header">{d}</div>)}
      {cells.map((cell,i) => {
        if(cell.empty) return <div key={i} className="cal-day-empty" />
        const { d, ds, isPast, isToday, isBlocked, dayHours, dayEvents, reason } = cell
        const hasHours = dayHours.length>0
        let cls='cal-day'+(isPast?' cal-past':'')+(isToday?' cal-today':'')+(isBlocked?' cal-blocked':hasHours?' cal-partial':'')
        return (
          <div key={ds} className={cls} onClick={() => onDayClick(ds)}>
            <div className="cal-day-top"><span className="cal-day-num">{d}{isToday&&<span className="today-dot" />}</span></div>
            {dayEvents.length>0 && (
              <div className="cal-ev-bars">
                {dayEvents.slice(0,3).map((ev,j) => (
                  <div key={j} className={`cal-ev-bar ev-${ev.spanType} ${ev.r.status==='confirmed'?'ev-conf':'ev-pend'}`} title={ev.r.email}>
                    <span className="ev-bar-label">{ev.r.email.split('@')[0].slice(0,12)}</span>
                  </div>
                ))}
                {dayEvents.length>3&&<div className="cal-ev-more">+{dayEvents.length-3}</div>}
              </div>
            )}
            {isBlocked&&<div className="cal-block-full"><i className="fas fa-ban" /> {reason||'Journée bloquée'}</div>}
            {!isBlocked&&hasHours&&(
              <div className="cal-hour-tags">
                {dayHours.slice().sort().slice(0,4).map(h=><span key={h} className="cal-hour-tag">{h.replace(':00','h')}</span>)}
                {dayHours.length>4&&<span className="cal-hour-more">+{dayHours.length-4}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function YearGrid({ year, reservations, blockedDatesMap, blockedHoursMap, onDayClick }) {
  const today = fmtDate(new Date())
  const now = new Date()
  return (
    <div className="cal-year-wrap">
      {Array.from({length:12},(_,m) => {
        const monthStr=year+'-'+String(m+1).padStart(2,'0')
        const daysInMonth=new Date(year,m+1,0).getDate()
        const firstDay=(new Date(year,m,1).getDay()+6)%7
        const isCurrent=year===now.getFullYear()&&m===now.getMonth()
        const eventMap={}
        reservations.forEach(r => { getRDates(r).filter(d=>d.startsWith(monthStr)).forEach(d => { if(!eventMap[d])eventMap[d]=[]; eventMap[d].push(r) }) })
        return (
          <div key={m} className={`cal-mini-month${isCurrent?' cal-mini-current':''}`}>
            <div className="cal-mini-label">{MONTHS_FR[m]}</div>
            <div className="cal-mini-grid">
              {['L','M','M','J','V','S','D'].map((d,i)=><div key={i} className="cal-mini-hdr">{d}</div>)}
              {Array.from({length:firstDay},(_,i)=><div key={'e'+i} className="cal-mini-empty" />)}
              {Array.from({length:daysInMonth},(_,i)=>{
                const d=i+1; const ds=monthStr+'-'+String(d).padStart(2,'0')
                const isBlocked=!!blockedDatesMap[ds]; const hours=blockedHoursMap[ds]||[]
                const dayRes=(eventMap[ds]||[]).filter(r=>r.status!=='refused')
                const hasConf=dayRes.some(r=>r.status==='confirmed'), hasPend=dayRes.some(r=>r.status==='pending')
                let cls='cal-mini-day'+(ds<today?' is-past':'')+(ds===today?' is-today':'')+(isBlocked?' is-blocked':hours.length>0?' is-partial':'')
                return (
                  <div key={d} className={cls} onClick={()=>onDayClick(ds)}>
                    {d}
                    {(hasConf||hasPend||hours.length>0)&&(
                      <div className="cal-mini-dots">
                        {hasConf&&<span className="cal-mini-dot dot-conf" />}
                        {hasPend&&<span className="cal-mini-dot dot-pend" />}
                        {hours.length>0&&!isBlocked&&<span className="cal-mini-dot dot-part" />}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayCalModal({ dateStr, page, reservations, blockedDatesMap, blockedHoursMap, onPage, onResaClick }) {
  const dt = new Date(dateStr+'T12:00:00')
  const dateTitle = (() => { const s=dt.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); return s.charAt(0).toUpperCase()+s.slice(1) })()
  const dayResas = reservations.filter(r => { const rd=getRDates(r); return rd.includes(dateStr) })
  const isBlocked = !!blockedDatesMap[dateStr]
  const hourBlocks = (blockedHoursMap[dateStr]||[]).slice().sort()
  const today = fmtDate(new Date()); const isPast = dateStr < today
  const totalPages = Math.ceil(dayResas.length/DAY_PAGE_SIZE)
  const pageResas = dayResas.slice(page*DAY_PAGE_SIZE,(page+1)*DAY_PAGE_SIZE)

  return (
    <div>
      <h3 className="day-modal-title">{dateTitle}{dayResas.length>1&&<span className="day-title-count">{dayResas.length} événements</span>}</h3>
      {dayResas.length>0 ? (
        <div className="day-resas">
          {pageResas.map(r => {
            const rd=getRDates(r); const dateLabel=rd.length<=1?new Date((rd[0]||r.date)+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long'}):(new Date(rd[0]+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})+' → '+new Date(rd[rd.length-1]+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}))
            return (
              <div key={r.id} className="day-resa-card day-resa-clickable" data-status={r.status} onClick={() => onResaClick(r.id)}>
                <div className="day-resa-head">
                  <span className="day-resa-email"><i className="fas fa-envelope" style={{marginRight:6}} />{r.email}</span>
                  <span className={`status-badge ${STATUS_CLASS[r.status]||''}`}>{STATUS_LABEL[r.status]||r.status}</span>
                </div>
                <div className="day-resa-details">
                  <span><i className="fas fa-calendar" style={{marginRight:4}} />{dateLabel}</span>
                  {r.event_type&&<span><i className="fas fa-tag" style={{marginRight:4}} />{r.event_type}</span>}
                  {r.nb_persons&&<span><i className="fas fa-users" style={{marginRight:4}} />{r.nb_persons} pers.</span>}
                </div>
                {r.materials?.length>0&&<div className="day-resa-mats">{r.materials.map((m,i)=><span key={i} className="day-mat-chip"><i className="fas fa-box" style={{marginRight:4}} />{m.name} × {m.quantity}</span>)}</div>}
                <div className="day-resa-cta"><span>Voir les détails</span><i className="fas fa-chevron-right" /></div>
              </div>
            )
          })}
        </div>
      ) : !isBlocked&&!isPast ? (
        <div className="day-no-event"><i className="fas fa-calendar-check" /> Aucun événement ce jour</div>
      ) : null}
      {totalPages>1&&(
        <div className="day-pagination">
          <button className="day-page-btn" disabled={page===0} onClick={() => onPage(page-1)}><i className="fas fa-chevron-left" /></button>
          <span className="day-page-info">{page+1} / {totalPages}</span>
          <button className="day-page-btn" disabled={page>=totalPages-1} onClick={() => onPage(page+1)}><i className="fas fa-chevron-right" /></button>
        </div>
      )}
      {isBlocked&&<div className="day-banner day-banner-blocked"><i className="fas fa-ban" /> Journée bloquée{blockedDatesMap[dateStr]?.reason?' — '+blockedDatesMap[dateStr].reason:''}</div>}
      {!isBlocked&&hourBlocks.length>0&&<div className="day-banner day-banner-partial"><i className="fas fa-clock" /> Créneaux bloqués : {hourBlocks.join(', ')}</div>}
      {!dayResas.length&&isPast&&<div className="day-banner day-banner-past"><i className="fas fa-history" /> Jour passé — aucune réservation</div>}
    </div>
  )
}

function DayBlocModal({ dateStr, reservations, blockedDatesMap, blockedHoursMap, blockTab, onBlockTabChange, blockReason, onReasonChange, blockSelHours, onToggleHour, onSaveFull, onUnblock, onSaveHours, onClearHours }) {
  const dt = new Date(dateStr+'T12:00:00')
  const dateTitle = (() => { const s=dt.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); return s.charAt(0).toUpperCase()+s.slice(1) })()
  const isBlocked = !!blockedDatesMap[dateStr]
  const hourBlocks = (blockedHoursMap[dateStr]||[]).slice().sort()
  const dayResas = reservations.filter(r => getRDates(r).includes(dateStr))
  const confirmed = dayResas.filter(r=>r.status==='confirmed'), pending = dayResas.filter(r=>r.status==='pending')

  return (
    <div>
      <h3 className="day-modal-title">{dateTitle}</h3>
      {(confirmed.length||pending.length)>0&&(
        <div className="day-banner" style={{background:'#fffbeb',color:'#92400e',borderColor:'#fcd34d'}}>
          <i className="fas fa-exclamation-triangle" /> {[confirmed.length&&confirmed.length+' réservation(s) confirmée(s)',pending.length&&pending.length+' en attente'].filter(Boolean).join(' et ')} ce jour — elles ne seront pas annulées.
        </div>
      )}
      {isBlocked&&<div className="day-banner day-banner-blocked"><i className="fas fa-ban" /> Journée entièrement bloquée{blockedDatesMap[dateStr]?.reason?' — '+blockedDatesMap[dateStr].reason:''}</div>}
      {hourBlocks.length>0&&<div className="day-banner day-banner-partial"><i className="fas fa-clock" /> Créneaux bloqués : {hourBlocks.join(', ')}</div>}
      <div className={`block-section${isBlocked?' block-section-muted':''}`}>
        <h4 className="block-section-title"><i className="fas fa-lock" style={{marginRight:8}} />{isBlocked?'Modifier le blocage':'Bloquer ce jour'}</h4>
        <div className="block-tabs">
          <button className={`block-tab${blockTab==='full'?' active':''}`} onClick={() => onBlockTabChange('full')}>Journée entière</button>
          <button className={`block-tab${blockTab==='hours'?' active':''}`} onClick={() => onBlockTabChange('hours')}>Heures spécifiques</button>
        </div>
        {blockTab==='full'&&(
          <div className="block-panel">
            <div className="adm-form-group">
              <label>Raison <span style={{fontWeight:400,color:'#999'}}>(optionnel)</span></label>
              <input type="text" className="adm-input" placeholder="Ex : Congés, événement privé…" value={blockReason} onChange={e=>onReasonChange(e.target.value)} />
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <button className="adm-btn-danger" onClick={onSaveFull}><i className="fas fa-ban" style={{marginRight:8}} />Bloquer la journée entière</button>
              {isBlocked&&<button className="adm-btn-ghost" onClick={onUnblock}><i className="fas fa-unlock" style={{marginRight:8}} />Débloquer la journée</button>}
            </div>
          </div>
        )}
        {blockTab==='hours'&&(
          <div className="block-panel">
            <p className="hours-hint">Sélectionnez les créneaux à bloquer :</p>
            <div className="hours-grid">
              {HOURS.map(h => (
                <label key={h} className={`hour-label${blockSelHours.includes(h)?' hour-checked':''}`}>
                  <input type="checkbox" className="hour-cb" value={h} checked={blockSelHours.includes(h)} onChange={() => onToggleHour(h)} />{h}
                </label>
              ))}
            </div>
            <div className="hours-actions">
              <button className="adm-btn-primary" onClick={onSaveHours}><i className="fas fa-save" style={{marginRight:8}} />Enregistrer</button>
              {hourBlocks.length>0&&<button className="adm-btn-ghost" onClick={onClearHours}><i className="fas fa-times" style={{marginRight:4}} />Tout débloquer</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const PAY_STATUS_LABEL = { pending:'En attente', paid:'Payé', failed:'Échoué' }
const PAY_STATUS_CLASS = { pending:'badge-pending', paid:'badge-confirmed', failed:'badge-refused' }

function PaymentsBlock({ reservationId }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  async function load() {
    const { data } = await supabase.from('payments').select('*').eq('reservation_id', reservationId).order('installment_index')
    setPayments(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [reservationId])

  async function markReceived(paymentId) {
    setUpdatingId(paymentId)
    await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId)
    await load()
    setUpdatingId(null)
  }

  if (loading) return null
  if (!payments.length) return null

  return (
    <div className="detail-block">
      <h4 className="detail-block-title"><i className="fas fa-euro-sign" style={{marginRight:8}} />Paiements</h4>
      <div className="detail-mats">
        {payments.map(p => (
          <div key={p.id} className="detail-mat-row" style={{alignItems:'center'}}>
            <span className="detail-mat-name">
              <i className={p.method === 'virement' ? 'fas fa-university' : 'fas fa-credit-card'} style={{marginRight:8}} />
              {p.installment_label} {p.due_date && <small style={{color:'var(--gray)',marginLeft:6}}>({new Date(p.due_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})})</small>}
            </span>
            <span style={{display:'flex',alignItems:'center',gap:10}}>
              <strong>{p.amount.toFixed(2)} €</strong>
              <span className={`status-badge ${PAY_STATUS_CLASS[p.status]||''}`}>{PAY_STATUS_LABEL[p.status]||p.status}</span>
              {p.method === 'virement' && p.status === 'pending' && (
                <button className="adm-btn-success btn-sm" onClick={() => markReceived(p.id)} disabled={updatingId === p.id}>
                  {updatingId === p.id ? <i className="fas fa-circle-notch fa-spin" /> : <><i className="fas fa-check" style={{marginRight:4}} />Marquer reçu</>}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      {payments.some(p => p.status === 'failed') && (
        <p style={{color:'var(--danger)',fontSize:'.82rem',marginTop:8}}>
          <i className="fas fa-exclamation-triangle" style={{marginRight:4}} />Au moins un versement a échoué — le client devra mettre à jour son moyen de paiement.
        </p>
      )}
    </div>
  )
}

function ResaDetail({ resa, backDate, onBack, onStatus, onDelete }) {
  if (!resa) return null
  const rd = getRDates(resa)
  const dateDisplay = rd.length<=1
    ? (() => { const s=new Date((rd[0]||resa.date)+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); return s.charAt(0).toUpperCase()+s.slice(1) })()
    : new Date(rd[0]+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})+' → '+new Date(rd[rd.length-1]+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})+' · '+rd.length+' jour'+(rd.length>1?'s':'')
  const name = [resa.prenom, resa.nom].filter(Boolean).join(' ') || 'Client'
  const created = new Date(resa.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})
  const hasPricing = resa.materials?.length > 0 || resa.delivery_address || resa.grand_total != null
  return (
    <div>
      {onBack && (
        <button className="detail-back" onClick={onBack}><i className="fas fa-arrow-left" style={{marginRight:8}} />Retour au {backDate&&new Date(backDate+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}</button>
      )}
      <div className="detail-head">
        <div>
          {resa.reference && <div className="detail-email" style={{fontWeight:700}}><i className="fas fa-hashtag" style={{marginRight:8}} />{resa.reference}</div>}
          <div className="detail-name"><i className="fas fa-user" style={{marginRight:8}} />{name}</div>
          <div className="detail-email"><i className="fas fa-envelope" style={{marginRight:8}} />{resa.email}</div>
          {resa.phone&&<div className="detail-phone"><i className="fas fa-phone" style={{marginRight:8}} />{resa.phone}</div>}
        </div>
        <span className={`status-badge ${STATUS_CLASS[resa.status]||''} badge-lg`}>{STATUS_LABEL[resa.status]||resa.status}</span>
      </div>
      <div className="detail-info-grid">
        <div className="detail-info-item"><i className="fas fa-calendar" /><div><small>Date(s)</small><strong>{dateDisplay}</strong></div></div>
        <div className="detail-info-item"><i className="fas fa-tag" /><div><small>Événement</small><strong>{resa.event_type||'—'}</strong></div></div>
        {resa.nb_persons&&<div className="detail-info-item"><i className="fas fa-users" /><div><small>Personnes</small><strong>{resa.nb_persons}</strong></div></div>}
        <div className="detail-info-item"><i className="fas fa-clock" /><div><small>Reçue le</small><strong>{created}</strong></div></div>
      </div>

      {hasPricing && (
        <div className="detail-block">
          <h4 className="detail-block-title"><i className="fas fa-receipt" style={{marginRight:8}} />Détail du prix</h4>
          <div className="price-detail-card">
            {resa.materials?.length > 0 ? resa.materials.map((m,i) => (
              <div key={i} className="price-detail-row">
                <span className="price-detail-label">
                  <i className="fas fa-box" style={{marginRight:8,color:'var(--rose-gold)'}} />{m.name} × {m.quantity}
                  {m.price!=null && <span className="price-detail-sub">{m.price.toFixed(2)} €/unité</span>}
                </span>
                {m.price!=null && <span className="price-detail-amount">{(m.price*m.quantity).toFixed(2)} €</span>}
              </div>
            )) : (
              <div className="price-detail-row"><span className="price-detail-label">Aucun matériel sélectionné</span></div>
            )}
            {resa.materials_total != null && resa.materials?.length > 0 && (
              <div className="price-detail-row">
                <span className="price-detail-label"><strong>Sous-total matériaux</strong></span>
                <span className="price-detail-amount">{resa.materials_total.toFixed(2)} €</span>
              </div>
            )}
            {resa.delivery_address && (
              <>
                <div className="price-detail-row">
                  <span className="price-detail-label">
                    <i className="fas fa-map-marker-alt" style={{marginRight:8,color:'var(--rose-gold)'}} />Livraison
                    <span className="price-detail-sub">{resa.delivery_address}{resa.distance_km!=null?` — ${resa.distance_km} km`:''}</span>
                  </span>
                </div>
                {resa.quote_base_fee != null && (
                  <div className="price-detail-row">
                    <span className="price-detail-label">Frais de base</span>
                    <span className="price-detail-amount">{resa.quote_base_fee.toFixed(2)} €</span>
                  </div>
                )}
                {resa.quote_per_km != null && resa.distance_km != null && (
                  <div className="price-detail-row">
                    <span className="price-detail-label">Frais kilométrique<span className="price-detail-sub">{resa.quote_per_km.toFixed(2)} €/km × {resa.distance_km} km</span></span>
                    <span className="price-detail-amount">{(resa.quote_per_km*resa.distance_km).toFixed(2)} €</span>
                  </div>
                )}
                {resa.delivery_fee != null && (
                  <div className="price-detail-row">
                    <span className="price-detail-label"><strong>Total livraison</strong></span>
                    <span className="price-detail-amount">{resa.delivery_fee.toFixed(2)} €</span>
                  </div>
                )}
              </>
            )}
            {resa.grand_total != null && (
              <div className="price-detail-row price-detail-total">
                <span className="price-detail-label">Total estimé</span>
                <span className="price-detail-amount">{resa.grand_total.toFixed(2)} €</span>
              </div>
            )}
          </div>
        </div>
      )}
      <PaymentsBlock reservationId={resa.id} />
      {resa.message&&<div className="detail-block"><h4 className="detail-block-title"><i className="fas fa-comment" style={{marginRight:8}} />Message / Créneau</h4><p className="detail-message">{resa.message}</p></div>}
      {/* Same status-change/delete actions as the card footer — added so the
          mobile compact-tile flow (tap tile -> this popup) can actually
          act on a request, not just read it. `key={resa.id}` so the
          combobox's open/closed state resets when this popup is reused for
          a different reservation (e.g. calendar day-view navigation). */}
      {onStatus && (
        <div className="detail-actions-block">
          <StatusChanger key={resa.id} resa={resa} onStatus={onStatus} />
          {onDelete && resa.status!=='confirmed' && (
            <button className="detail-delete-link" onClick={() => onDelete(resa.id)}><i className="fas fa-trash" />Supprimer la demande</button>
          )}
        </div>
      )}
    </div>
  )
}

function MsgList({ messages, filter, onOpen, onDelete }) {
  const filtered = filter==='all'?messages:filter==='unread'?messages.filter(m=>!m.read):messages.filter(m=>m.read)
  if (!filtered.length) return (
    <div className="adm-empty"><i className="fas fa-envelope-open" /><p>{filter==='unread'?'Aucun message non lu.':filter==='read'?'Aucun message lu.':'Aucun message reçu.'}</p></div>
  )
  return (
    <div id="messages-list">
      {filtered.map(m => {
        const fullName=[m.prenom,m.nom].filter(Boolean).join(' ')||m.email
        const created=new Date(m.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})
        const preview=(m.message||'').replace(/\n/g,' ').slice(0,90)+(m.message?.length>90?'…':'')
        return (
          <div key={m.id} className={`msg-card${!m.read?' msg-unread':''}`} onClick={() => onOpen(m)}>
            <div className="msg-card-head">
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <span className="msg-name"><i className="fas fa-user" style={{marginRight:4,color:'var(--rose-gold)'}} />{fullName}</span>
                {!m.read&&<span className="msg-badge-new">Nouveau</span>}
              </div>
              <span className="msg-date"><i className="fas fa-clock" style={{marginRight:4}} />{created}</span>
            </div>
            <div className="msg-body">
              <div className="msg-meta">
                <span><i className="fas fa-envelope" style={{marginRight:4}} />{m.email}</span>
                {m.telephone&&<span><i className="fas fa-phone" style={{marginRight:4}} />{m.telephone}</span>}
                {m.type_evenement&&<span><i className="fas fa-tag" style={{marginRight:4}} />{TYPE_LABELS[m.type_evenement]||m.type_evenement}</span>}
              </div>
              <p className="msg-preview">{preview}</p>
            </div>
            <div className="msg-actions">
              <span className="msg-read-lbl">{!m.read?<><i className="fas fa-circle" style={{color:'var(--rose-gold)',fontSize:'.55rem',marginRight:4}} />Non lu</>:<><i className="fas fa-check-double" style={{marginRight:4}} />Lu</>}</span>
              <button className="adm-btn-delete btn-sm" onClick={e => { e.stopPropagation(); onDelete(m.id) }}><i className="fas fa-trash" /></button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MsgDetail({ msg, onDelete }) {
  if (!msg) return null
  const fullName=[msg.prenom,msg.nom].filter(Boolean).join(' ')||'—'
  const created=(() => { const s=new Date(msg.created_at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}); return s.charAt(0).toUpperCase()+s.slice(1) })()
  const typeLabel=TYPE_LABELS[msg.type_evenement]||msg.type_evenement||'—'
  const replyBody=`Bonjour ${fullName},\n\nMerci pour votre message concernant ${TYPE_LABELS[msg.type_evenement]||'votre projet'}.\n\n[Votre réponse ici]\n\nCordialement,\nL'équipe OA Événementiel`
  const mailto=`mailto:${msg.email}?subject=${encodeURIComponent('Réponse à votre demande — OA Événementiel')}&body=${encodeURIComponent(replyBody)}`
  return (
    <div>
      <div className="msg-detail-head">
        <div className="msg-detail-avatar"><i className="fas fa-user" /></div>
        <div><div className="msg-detail-name">{fullName}</div><div className="msg-detail-date">{created}</div></div>
      </div>
      <div className="detail-info-grid" style={{margin:'18px 0'}}>
        <div className="detail-info-item"><i className="fas fa-envelope" /><div><small>Email</small><strong>{msg.email}</strong></div></div>
        {msg.telephone&&<div className="detail-info-item"><i className="fas fa-phone" /><div><small>Téléphone</small><strong>{msg.telephone}</strong></div></div>}
        <div className="detail-info-item"><i className="fas fa-tag" /><div><small>Type d'événement</small><strong>{typeLabel}</strong></div></div>
      </div>
      <div className="detail-block">
        <h4 className="detail-block-title"><i className="fas fa-comment" style={{marginRight:8}} />Message</h4>
        <div className="msg-detail-text">{msg.message||''}</div>
      </div>
      <div className="detail-actions">
        <a href={mailto} className="adm-btn-primary"><i className="fas fa-reply" style={{marginRight:8}} />Répondre par email</a>
        {msg.telephone&&<a href={`tel:${msg.telephone}`} className="adm-btn-success"><i className="fas fa-phone" style={{marginRight:8}} />Appeler</a>}
        <button className="adm-btn-delete" onClick={onDelete}><i className="fas fa-trash" style={{marginRight:4}} />Supprimer</button>
      </div>
    </div>
  )
}

// Generic per-page image editor for Espace OA > Visuel Site. `contentKey` is
// a site_content row key (e.g. "images_home"), `slots` is an ordered list of
// { key, label, group? } describing every swappable photo on that page —
// missing/null slots just mean "public page falls back to its own default
// image", so nothing needs filling in here for the site to look normal.
function ImageSlotGrid({ contentKey, slots, bucket }) {
  const [urls, setUrls] = useState({})
  const [files, setFiles] = useState({})
  const [previews, setPreviews] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRefs = useRef({})

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    supabase.from('site_content').select('*').eq('key', contentKey).then(({ data }) => {
      if (cancelled) return
      const row = data && data[0]
      let parsed = {}
      try { parsed = row ? JSON.parse(row.value) : {} } catch {}
      setUrls(parsed)
      setPreviews(parsed)
      setFiles({})
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [contentKey])

  function handleFile(slotKey, file) {
    if (!file) return
    if (file.size > 5*1024*1024) { alert('Image trop lourde (max 5 Mo).'); return }
    setFiles(f => ({ ...f, [slotKey]: file }))
    const reader = new FileReader()
    reader.onload = () => setPreviews(p => ({ ...p, [slotKey]: reader.result }))
    reader.readAsDataURL(file)
  }
  function removeSlot(slotKey) {
    setFiles(f => { const n = {...f}; delete n[slotKey]; return n })
    setUrls(u => ({ ...u, [slotKey]: null }))
    setPreviews(p => ({ ...p, [slotKey]: null }))
  }

  async function save() {
    setSaving(true)
    try {
      const nextUrls = { ...urls }
      for (const slot of slots) {
        const file = files[slot.key]
        if (!file) continue
        const oldUrl = urls[slot.key]
        if (oldUrl && oldUrl.startsWith('/uploads/')) {
          try { await supabase.storage.from(bucket).remove([oldUrl.slice('/uploads/'.length)]) } catch {}
        }
        const ext = file.name.split('.').pop().toLowerCase()
        const path = Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
        if (upErr) throw upErr
        nextUrls[slot.key] = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
      }
      await supabase.from('site_content').update({ value: JSON.stringify(nextUrls) }).eq('key', contentKey)
      setUrls(nextUrls)
      setPreviews(nextUrls)
      setFiles({})
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert('Erreur : ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return <div className="adm-empty"><i className="fas fa-circle-notch fa-spin" /><p>Chargement…</p></div>

  let lastGroup = null
  return (
    <div className="mat-form-card">
      <div className="img-slot-grid">
        {slots.map(slot => {
          const showGroup = slot.group && slot.group !== lastGroup
          lastGroup = slot.group || lastGroup
          return (
            <div key={slot.key} style={showGroup ? { gridColumnStart: 1 } : undefined}>
              {showGroup && <h4 className="img-slot-group-title">{slot.group}</h4>}
              <div className="adm-form-group">
                <label>{slot.label}</label>
                <div className="img-upload-area" onClick={() => inputRefs.current[slot.key]?.click()}>
                  {previews[slot.key]
                    ? <img src={previews[slot.key]} alt="" className="img-preview-thumb" />
                    : <div className="img-upload-placeholder"><i className="fas fa-image" /><p>Image par défaut</p><span>JPG, PNG, WEBP — max 5 Mo</span></div>
                  }
                </div>
                <input ref={el => inputRefs.current[slot.key] = el} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{display:'none'}} onChange={e => handleFile(slot.key, e.target.files[0])} />
                <div className="img-upload-btns">
                  <button className="adm-btn-ghost btn-sm" onClick={() => inputRefs.current[slot.key]?.click()}><i className="fas fa-upload" style={{marginRight:4}} />Choisir</button>
                  {previews[slot.key] && <button className="adm-btn-delete btn-sm" onClick={() => removeSlot(slot.key)}><i className="fas fa-times" style={{marginRight:4}} />Réinitialiser</button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mat-form-actions">
        <button className="adm-btn-primary" onClick={save} disabled={saving}>
          {saving ? <><i className="fas fa-circle-notch fa-spin" style={{marginRight:8}} />Enregistrement…</> : <><i className="fas fa-save" style={{marginRight:8}} />Enregistrer</>}
        </button>
        {saved && <span style={{marginLeft:12,color:'#2e7d32',fontWeight:700,fontSize:'.85rem'}}><i className="fas fa-check" style={{marginRight:4}} />Enregistré</span>}
      </div>
    </div>
  )
}

// Galerie tab of Visuel Site — unlike the other pages' fixed image slots,
// the gallery is a real add/remove list: admin picks a photo + a category,
// it's appended to the site_content "images_galerie" row's `photos` array,
// and pages/galerie.jsx renders whatever's in that array (with its own
// hardcoded DEFAULT_PHOTOS only as a fallback for a never-touched row).
function GalerieManager() {
  const [pageHeaderUrl, setPageHeaderUrl] = useState('')
  const [pageHeaderPreview, setPageHeaderPreview] = useState(null)
  const headerInputRef = useRef(null)
  const [photos, setPhotos] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [newFile, setNewFile] = useState(null)
  const [newPreview, setNewPreview] = useState(null)
  const [newCat, setNewCat] = useState(GALERIE_CATEGORIES[0].key)
  const newFileInputRef = useRef(null)
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState(null)

  async function load() {
    setLoaded(false)
    const { data } = await supabase.from('site_content').select('*').eq('key', 'images_galerie')
    const row = data && data[0]
    let parsed = { page_header: null, photos: [] }
    try { parsed = row ? JSON.parse(row.value) : parsed } catch {}
    setPageHeaderUrl(parsed.page_header || '')
    setPageHeaderPreview(parsed.page_header || null)
    setPhotos(Array.isArray(parsed.photos) ? parsed.photos : [])
    setLoaded(true)
  }
  useEffect(() => { load() }, [])

  async function persist(nextPageHeader, nextPhotos) {
    const value = JSON.stringify({ page_header: nextPageHeader || null, photos: nextPhotos })
    await supabase.from('site_content').update({ value }).eq('key', 'images_galerie')
  }

  async function uploadFile(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    const path = Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext
    const { error } = await supabase.storage.from('galerie').upload(path, file, { upsert: false })
    if (error) throw error
    return supabase.storage.from('galerie').getPublicUrl(path).data.publicUrl
  }

  function handleHeaderFile(file) {
    if (!file) return
    if (file.size > 5*1024*1024) { alert('Image trop lourde (max 5 Mo).'); return }
    const reader = new FileReader()
    reader.onload = async () => {
      setPageHeaderPreview(reader.result)
      try {
        const url = await uploadFile(file)
        setPageHeaderUrl(url)
        setPageHeaderPreview(url)
        await persist(url, photos)
      } catch (err) { alert('Erreur : ' + (err.message || err)) }
    }
    reader.readAsDataURL(file)
  }

  function handleNewFile(file) {
    if (!file) return
    if (file.size > 5*1024*1024) { alert('Image trop lourde (max 5 Mo).'); return }
    setNewFile(file)
    const reader = new FileReader()
    reader.onload = () => setNewPreview(reader.result)
    reader.readAsDataURL(file)
  }

  async function addPhoto() {
    if (!newFile) return
    setAdding(true)
    try {
      const url = await uploadFile(newFile)
      const catInfo = GALERIE_CATEGORIES.find(c => c.key === newCat)
      const nextPhotos = [...photos, { id: 'g-'+Date.now(), src: url, cat: newCat, label: catInfo?.label || newCat }]
      await persist(pageHeaderUrl, nextPhotos)
      setPhotos(nextPhotos)
      setNewFile(null)
      setNewPreview(null)
      if (newFileInputRef.current) newFileInputRef.current.value = ''
    } catch (err) {
      alert('Erreur : ' + (err.message || err))
    } finally {
      setAdding(false)
    }
  }

  async function deletePhoto(id) {
    setBusyId(id)
    try {
      const photo = photos.find(p => p.id === id)
      if (photo?.src?.startsWith('/uploads/')) {
        try { await supabase.storage.from('galerie').remove([photo.src.slice('/uploads/'.length)]) } catch {}
      }
      const nextPhotos = photos.filter(p => p.id !== id)
      await persist(pageHeaderUrl, nextPhotos)
      setPhotos(nextPhotos)
    } catch (err) {
      alert('Erreur : ' + (err.message || err))
    } finally {
      setBusyId(null)
    }
  }

  if (!loaded) return <div className="adm-empty"><i className="fas fa-circle-notch fa-spin" /><p>Chargement…</p></div>

  return (
    <div className="mat-form-card">
      <div className="adm-form-group">
        <label>Bannière de page <span className="adm-label-opt">(optionnel)</span></label>
        <div className="img-upload-area" onClick={() => headerInputRef.current?.click()}>
          {pageHeaderPreview
            ? <img src={pageHeaderPreview} alt="" className="img-preview-thumb" />
            : <div className="img-upload-placeholder"><i className="fas fa-image" /><p>Image par défaut</p><span>JPG, PNG, WEBP — max 5 Mo</span></div>
          }
        </div>
        <input ref={headerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{display:'none'}} onChange={e => handleHeaderFile(e.target.files[0])} />
        <div className="img-upload-btns">
          <button className="adm-btn-ghost btn-sm" onClick={() => headerInputRef.current?.click()}><i className="fas fa-upload" style={{marginRight:4}} />Choisir</button>
        </div>
      </div>

      <p style={{fontWeight:700, fontSize:'.85rem', margin:'24px 0 10px'}}>Ajouter une photo</p>
      <div className="galerie-add-row">
        <div className="img-upload-area galerie-add-preview" onClick={() => newFileInputRef.current?.click()}>
          {newPreview
            ? <img src={newPreview} alt="" className="img-preview-thumb" />
            : <div className="img-upload-placeholder"><i className="fas fa-plus" /><p>Choisir une photo</p></div>
          }
        </div>
        <input ref={newFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{display:'none'}} onChange={e => handleNewFile(e.target.files[0])} />
        <div className="galerie-add-controls">
          <select className="adm-input" value={newCat} onChange={e => setNewCat(e.target.value)}>
            {GALERIE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button className="adm-btn-primary" onClick={addPhoto} disabled={!newFile || adding}>
            {adding ? <><i className="fas fa-circle-notch fa-spin" style={{marginRight:8}} />Ajout…</> : <><i className="fas fa-plus" style={{marginRight:8}} />Ajouter à la galerie</>}
          </button>
        </div>
      </div>

      <p style={{fontWeight:700, fontSize:'.85rem', margin:'28px 0 10px'}}>Photos actuelles ({photos.length})</p>
      {!photos.length && <p style={{color:'var(--gray)', fontSize:'.85rem'}}>Aucune photo pour l'instant.</p>}
      {GALERIE_CATEGORIES.map(cat => {
        const catPhotos = photos.filter(p => p.cat === cat.key)
        if (!catPhotos.length) return null
        return (
          <div key={cat.key} className="galerie-cat-group">
            <h4 className="img-slot-group-title" style={{marginTop:0}}>{cat.label} ({catPhotos.length})</h4>
            <div className="galerie-photo-row">
              {catPhotos.map(p => (
                <div key={p.id} className="galerie-photo-card">
                  <img src={p.src} alt={p.label} />
                  <button className="galerie-photo-delete" onClick={() => deletePhoto(p.id)} disabled={busyId===p.id} aria-label="Supprimer">
                    {busyId===p.id ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-trash" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MatTable({ materials, tiersByMaterial, page, onPageChange, onEdit, onDelete, onToggle }) {
  if (!materials.length) return (
    <div className="adm-empty"><i className="fas fa-boxes" /><p>Aucun article. Cliquez sur "Ajouter un article".</p></div>
  )
  const totalPages = Math.ceil(materials.length/MAT_PAGE_SIZE)
  const p = Math.max(0, Math.min(page, totalPages-1))
  const slice = materials.slice(p*MAT_PAGE_SIZE,(p+1)*MAT_PAGE_SIZE)
  return (
    <div id="materials-table-wrap">
      <table className="adm-table">
        <thead><tr>
          <th style={{width:56}}>Photo</th>
          <th style={{textAlign:'center'}}>Nom</th>
          <th style={{textAlign:'center'}}>Catégorie</th>
          <th style={{textAlign:'center'}}>Description</th>
          <th style={{textAlign:'center'}}>Qté max</th>
          <th style={{textAlign:'center'}}>Prix</th>
          <th style={{textAlign:'center'}}>Dispo</th>
          <th style={{textAlign:'center'}}>Actions</th>
        </tr></thead>
        <tbody>
          {slice.map(m => {
            const tiers = tiersByMaterial[String(m.id)] || []
            const baseTier = tiers[0]
            return (
            <tr key={m.id}>
              <td data-label="Photo">{m.image_url?<img src={m.image_url} alt="" className="mat-thumb" />:<div className="mat-thumb-empty"><i className="fas fa-image" /></div>}</td>
              <td data-label="Nom" style={{textAlign:'center'}}><strong>{m.name}</strong></td>
              <td data-label="Catégorie" style={{textAlign:'center'}}>{m.category||'—'}</td>
              <td data-label="Description" style={{textAlign:'center'}}>{m.description||'—'}</td>
              <td data-label="Qté max" style={{textAlign:'center'}}>{m.max_quantity}</td>
              <td data-label="Prix" style={{textAlign:'center'}}>
                {baseTier ? (
                  <>
                    {tiers.length > 1
                      ? <>à partir de {ttcFromHt(baseTier.price_weekend_ht).toFixed(2)} € TTC<div style={{fontSize:'.75rem',color:'var(--gray)'}}>{tiers.length} paliers</div></>
                      : baseTier.price_weekday_ht === baseTier.price_weekend_ht
                        ? <>{ttcFromHt(baseTier.price_weekend_ht).toFixed(2)} € TTC</>
                        : <>{ttcFromHt(baseTier.price_weekday_ht).toFixed(2)} € / {ttcFromHt(baseTier.price_weekend_ht).toFixed(2)} € TTC<div style={{fontSize:'.75rem',color:'var(--gray)'}}>semaine / week-end</div></>}
                    {baseTier.min_qty > 1 && <div style={{fontSize:'.75rem',color:'var(--gray)'}}>min. {baseTier.min_qty} unités</div>}
                  </>
                ) : '—'}
              </td>
              <td data-label="Dispo" style={{textAlign:'center'}}>
                <button className={`toggle-avail ${m.available?'avail-on':'avail-off'}`} onClick={() => onToggle(m.id, m.available)}>{m.available?'Oui':'Non'}</button>
              </td>
              <td data-label="Actions" style={{textAlign:'center'}}>
                <div className="adm-table-actions">
                  <button className="adm-btn-ghost btn-sm" onClick={() => onEdit(m.id)}><i className="fas fa-pen" /></button>
                  <button className="adm-btn-delete btn-sm" onClick={() => onDelete(m.id)}><i className="fas fa-trash" /></button>
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
      {totalPages>1&&(
        <div className="mat-pagination">
          <button className="cat-pg-btn" disabled={p===0} onClick={() => onPageChange(p-1)}><i className="fas fa-chevron-left" /></button>
          <span className="cat-pg-info">{p+1} / {totalPages} <span className="mat-pg-total">({materials.length} articles)</span></span>
          <button className="cat-pg-btn" disabled={p>=totalPages-1} onClick={() => onPageChange(p+1)}><i className="fas fa-chevron-right" /></button>
        </div>
      )}
    </div>
  )
}

function CatList({ categories, page, onPage, onDelete }) {
  if (!categories.length) return <p style={{color:'var(--gray)',fontSize:'.85rem',textAlign:'center',padding:'12px 0'}}>Aucune catégorie.</p>
  const totalPages = Math.ceil(categories.length/CAT_PAGE_SIZE)
  const p = Math.max(0, Math.min(page, totalPages-1))
  const slice = categories.slice(p*CAT_PAGE_SIZE,(p+1)*CAT_PAGE_SIZE)
  return (
    <div id="cat-list" style={{marginTop:8}}>
      {slice.map(c => (
        <div key={c.id} className="cat-list-item">
          <span className="cat-list-name">{c.name}</span>
          <button className="adm-btn-delete btn-sm" onClick={() => onDelete(c.id, c.name)}><i className="fas fa-trash" /></button>
        </div>
      ))}
      {totalPages>1&&(
        <div className="cat-pagination">
          <button className="cat-pg-btn" disabled={p===0} onClick={() => onPage(p-1)}><i className="fas fa-chevron-left" /></button>
          <span className="cat-pg-info">{p+1} / {totalPages}</span>
          <button className="cat-pg-btn" disabled={p>=totalPages-1} onClick={() => onPage(p+1)}><i className="fas fa-chevron-right" /></button>
        </div>
      )}
    </div>
  )
}

function ContactModal({ resa }) {
  const name = [resa.prenom, resa.nom].filter(Boolean).join(' ') || 'Client'
  const rd = getRDates(resa)
  const dateStr = rd.length>1
    ? new Date(rd[0]+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long'})+' au '+new Date(rd[rd.length-1]+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})
    : new Date((rd[0]||resa.date)+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})
  const body = `Bonjour ${name},\n\nNous avons bien reçu votre demande de réservation pour le ${dateStr}.\n\n[Votre réponse ici]\n\nCordialement,\nL'équipe OA Événementiel`
  const mailto = `mailto:${resa.email}?subject=${encodeURIComponent('Votre demande de réservation — OA Événementiel')}&body=${encodeURIComponent(body)}`
  return (
    <div>
      <div className="contact-client-name"><i className="fas fa-user" style={{marginRight:8}} />{name}</div>
      <p className="contact-detail"><i className="fas fa-envelope" style={{marginRight:6}} /><a href={mailto}>{resa.email}</a></p>
      {resa.phone&&<p className="contact-detail"><i className="fas fa-phone" style={{marginRight:6}} /><a href={`tel:${resa.phone}`}>{resa.phone}</a></p>}
      <div className="contact-actions">
        <a href={mailto} className="adm-btn-primary"><i className="fas fa-envelope" style={{marginRight:8}} />Répondre par email</a>
        {resa.phone&&<a href={`tel:${resa.phone}`} className="adm-btn-success"><i className="fas fa-phone" style={{marginRight:8}} />Appeler</a>}
      </div>
    </div>
  )
}
