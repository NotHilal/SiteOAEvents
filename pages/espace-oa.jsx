import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../src/lib/supabase.js'

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const TYPE_LABELS = { mariage:'Mariage', anniversaire:'Anniversaire', 'evenement-pro':'Événement professionnel', 'location-deco':'Location de décoration', autre:'Autre' }
const STATUS_LABEL = { pending:'En attente', confirmed:'Confirmée', refused:'Refusée' }
const STATUS_CLASS = { pending:'badge-pending', confirmed:'badge-confirmed', refused:'badge-refused' }
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
  const [reservations, setReservations] = useState([])
  const [messages, setMessages] = useState([])
  const [materials, setMaterials] = useState([])
  const [categories, setCategories] = useState([])
  const [blockedDatesMap, setBlockedDatesMap] = useState({})
  const [blockedHoursMap, setBlockedHoursMap] = useState({})
  const [resaFilter, setResaFilter] = useState('all')
  const [msgFilter, setMsgFilter] = useState('all')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calView, setCalView] = useState('month')
  const [blocYear, setBlocYear] = useState(new Date().getFullYear())
  const [blocMonth, setBlocMonth] = useState(new Date().getMonth())
  const [blocView, setBlocView] = useState('month')
  const [matPage, setMatPage] = useState(0)
  const [matFormVisible, setMatFormVisible] = useState(false)
  const [editingMat, setEditingMat] = useState(null)
  const [matForm, setMatForm] = useState({ name:'', category:'', description:'', qty:1, price:'' })
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
  const [settingsForm, setSettingsForm] = useState({ depot_address:'', delivery_base_fee:'', delivery_per_km:'', bank_holder:'', bank_iban:'', bank_bic:'' })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState('')

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
    await Promise.all([loadReservations(), loadMessages(), loadBlockedData(), loadMaterials(), loadCategories(), loadSettings()])
  }
  async function loadReservations() {
    const { data } = await supabase.from('reservations').select('*').order('created_at', { ascending: false })
    setReservations(data || [])
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
    const { data } = await supabase.from('materials').select('*').order('category').order('name')
    setMaterials(data || [])
  }
  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*')
    const map = {}
    ;(data||[]).forEach(s => { map[s.key] = s.value })
    setSettingsForm({
      depot_address: map.depot_address || '',
      delivery_base_fee: map.delivery_base_fee || '',
      delivery_per_km: map.delivery_per_km || '',
      bank_holder: map.bank_holder || '',
      bank_iban: map.bank_iban || '',
      bank_bic: map.bank_bic || '',
    })
  }
  async function saveSettings() {
    setSettingsError('')
    if (!settingsForm.depot_address.trim()) { setSettingsError('Adresse de départ requise.'); return }
    const baseFee = parseFloat(String(settingsForm.delivery_base_fee).replace(',', '.'))
    const perKm = parseFloat(String(settingsForm.delivery_per_km).replace(',', '.'))
    if (isNaN(baseFee) || baseFee < 0 || isNaN(perKm) || perKm < 0) { setSettingsError('Frais invalides (doivent être ≥ 0).'); return }
    setSettingsSaving(true)
    try {
      await Promise.all([
        supabase.from('settings').update({ value: settingsForm.depot_address.trim() }).eq('key', 'depot_address'),
        supabase.from('settings').update({ value: String(baseFee) }).eq('key', 'delivery_base_fee'),
        supabase.from('settings').update({ value: String(perKm) }).eq('key', 'delivery_per_km'),
        supabase.from('settings').update({ value: settingsForm.bank_holder.trim() }).eq('key', 'bank_holder'),
        supabase.from('settings').update({ value: settingsForm.bank_iban.trim() }).eq('key', 'bank_iban'),
        supabase.from('settings').update({ value: settingsForm.bank_bic.trim() }).eq('key', 'bank_bic'),
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
    setEditingMat(null); setMatForm({ name:'', category:'', description:'', qty:1, price:'' })
    setMatImageUrl(''); setMatImageFile(null); setMatImagePreview(null); setMatQtyError(false); setMatPriceError(false); setMatFormVisible(true)
  }
  async function openEditMat(id) {
    const { data: m } = await supabase.from('materials').select('*').eq('id', id).single()
    if (!m) return
    setEditingMat(m); setMatForm({ name: m.name, category: m.category||'', description: m.description||'', qty: m.max_quantity, price: m.price||0 })
    setMatImageUrl(m.image_url||''); setMatImageFile(null); setMatImagePreview(m.image_url||null); setMatQtyError(false); setMatPriceError(false); setMatFormVisible(true)
  }
  async function saveMaterial() {
    const qtyNum = parseInt(String(matForm.qty))
    const priceNum = parseFloat(String(matForm.price).replace(',', '.'))
    let valid = true
    if (!matForm.name.trim()) valid = false
    if (!qtyNum || qtyNum < 1 || !/^\d+$/.test(String(matForm.qty))) { setMatQtyError(true); valid = false }
    if (isNaN(priceNum) || priceNum < 0) { setMatPriceError(true); valid = false }
    if (!valid) return
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
      const payload = { name: matForm.name.trim(), category: matForm.category||null, description: matForm.description.trim()||null, max_quantity: qtyNum, price: priceNum, image_url: imageUrl, available: true }
      if (editingMat) await supabase.from('materials').update(payload).eq('id', editingMat.id)
      else await supabase.from('materials').insert(payload)
      setMatFormVisible(false); await loadMaterials()
    } catch (err) { alert('Erreur : '+(err.message||err)) } finally { setMatSaving(false) }
  }
  async function removeStorageImg(url) {
    try { const m='/object/public/materials/'; const i=url.indexOf(m); if(i===-1)return; await supabase.storage.from('materials').remove([url.slice(i+m.length)]) } catch {}
  }
  async function toggleAvail(id, current) { await supabase.from('materials').update({ available: !current }).eq('id', id); await loadMaterials() }
  function deleteMat(id) {
    confirmDelete('Cet article et son image seront définitivement supprimés.', async () => {
      const { data: m } = await supabase.from('materials').select('image_url').eq('id', id).single()
      if (m?.image_url) await removeStorageImg(m.image_url)
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
          <div className="login-logo">OA <span>Événementiel</span></div>
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

  return (
    <>
      <Head>
        <title>Espace OA — Gestion</title>
      </Head>
      <div className="dashboard-wrap">
        <aside className="sidebar">
          <div className="sidebar-logo">OA <span>Événementiel</span></div>
          <nav className="sidebar-nav">
            {[
              { key:'demandes',   icon:'fas fa-inbox',        label:'Demandes',   badge:pendingCount,  blink:false },
              { key:'calendrier', icon:'fas fa-calendar-alt', label:'Calendrier', badge:0,             blink:false },
              { key:'blocages',   icon:'fas fa-ban',          label:'Blocages',   badge:0,             blink:false },
              { key:'messagerie', icon:'fas fa-envelope',     label:'Messagerie', badge:unreadCount,   blink:unreadCount>0 },
              { key:'materiaux',  icon:'fas fa-boxes',        label:'Matériel',   badge:0,             blink:false },
              { key:'reglages',   icon:'fas fa-cog',          label:'Réglages',   badge:0,             blink:false },
            ].map(item => (
              <button key={item.key} className={`sidebar-btn${activeTab===item.key?' active':''}`} onClick={() => setActiveTab(item.key)}>
                <i className={item.icon} /> {item.label}
                {item.badge > 0 && <span className={`badge-count${item.blink?' badge-blink':''}`}>{item.badge}</span>}
              </button>
            ))}
          </nav>
          <button className="sidebar-logout" onClick={handleLogout}><i className="fas fa-sign-out-alt" /> Déconnexion</button>
        </aside>

        <main className="admin-main">

          {/* DEMANDES */}
          <div className={`tab-content${activeTab==='demandes'?' active':''}`} id="tab-demandes">
            <div className="adm-header">
              <h1 className="adm-title">Demandes de réservation</h1>
              <div className="adm-filters">
                {['all','pending','confirmed','refused'].map(f => (
                  <button key={f} className={`filter-btn${resaFilter===f?' active':''}`} onClick={() => setResaFilter(f)}>
                    {f==='all'?'Toutes':STATUS_LABEL[f]}
                  </button>
                ))}
              </div>
            </div>
            <ResaList reservations={reservations} filter={resaFilter} onStatus={updateResaStatus} onDelete={id => deleteResa(id, null)} onContact={r => setContactModal(r)} />
          </div>

          {/* CALENDRIER */}
          <div className={`tab-content${activeTab==='calendrier'?' active':''}`} id="tab-calendrier">
            <div className="adm-header"><h1 className="adm-title">Calendrier</h1></div>
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
              <h1 className="adm-title">Blocages</h1>
              <p className="adm-sub">Cliquez sur un jour pour le bloquer ou gérer ses créneaux.</p>
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
              <h1 className="adm-title">Messagerie</h1>
              <div className="adm-filters">
                {['all','unread','read'].map(f => (
                  <button key={f} className={`filter-btn${msgFilter===f?' active':''}`} onClick={() => setMsgFilter(f)}>
                    {f==='all'?'Tous':f==='unread'?'Non lus':'Lus'}
                  </button>
                ))}
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
              <h1 className="adm-title">Matériel</h1>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button className="adm-btn-ghost" onClick={() => setCatModalOpen(true)}><i className="fas fa-folder-plus" style={{marginRight:8}} />Ajouter une catégorie</button>
                <button className="adm-btn-primary" onClick={openAddMat}><i className="fas fa-plus" style={{marginRight:8}} />Ajouter un article</button>
              </div>
            </div>
            {matFormVisible && (
              <div className="mat-form-card">
                <h3>{editingMat ? "Modifier l'article" : 'Nouvel article'}</h3>
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
                  <div className="adm-form-group">
                    <label>Prix unitaire (€) <span className="req">*</span></label>
                    <input type="number" min={0} step="0.01" className="adm-input" placeholder="Ex : 3.50" value={matForm.price} onChange={e => { setMatForm(f=>({...f,price:e.target.value})); setMatPriceError(false) }} style={matPriceError?{borderColor:'var(--danger)'}:{}} />
                    {matPriceError && <div style={{marginTop:6,color:'var(--danger)',fontSize:'.8rem',fontWeight:600}}><i className="fas fa-exclamation-circle" style={{marginRight:4}} />Veuillez entrer un prix valide (≥ 0).</div>}
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
                <div className="mat-form-actions">
                  <button className="adm-btn-primary" onClick={saveMaterial} disabled={matSaving}>
                    {matSaving ? <><i className="fas fa-circle-notch fa-spin" style={{marginRight:8}} />Enregistrement…</> : <><i className="fas fa-save" style={{marginRight:8}} />Enregistrer</>}
                  </button>
                  <button className="adm-btn-ghost" onClick={() => setMatFormVisible(false)}>Annuler</button>
                </div>
              </div>
            )}
            <MatTable materials={materials} page={matPage} onPageChange={setMatPage} onEdit={openEditMat} onDelete={deleteMat} onToggle={toggleAvail} />
          </div>

          {/* RÉGLAGES */}
          <div className={`tab-content${activeTab==='reglages'?' active':''}`} id="tab-reglages">
            <div className="adm-header">
              <h1 className="adm-title">Réglages</h1>
              <p className="adm-sub">Point de départ et frais de livraison utilisés pour le calcul automatique lors d'une réservation.</p>
            </div>
            <div className="mat-form-card" style={{maxWidth:560}}>
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

              <h3 style={{marginTop:28,marginBottom:4,fontSize:'1rem'}}>Virement bancaire</h3>
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
            <div className="modal-card day-modal-card">
              <button className="modal-close" onClick={closeModal}><i className="fas fa-times" /></button>
              {resaDetail && (
                <ResaDetail
                  resa={reservations.find(r => r.id === resaDetail.id)}
                  backDate={resaDetail.backDate}
                  onBack={() => { setResaDetail(null); setDayModal({ dateStr: resaDetail.backDate, mode:'calendar', page:0 }) }}
                  onStatus={updateResaStatus}
                  onDelete={() => deleteResa(resaDetail.id, resaDetail.backDate)}
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

function ResaList({ reservations, filter, onStatus, onDelete, onContact }) {
  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter)
  if (!filtered.length) return (
    <div className="adm-empty"><i className="fas fa-inbox" /><p>Aucune demande{filter!=='all'?' dans cette catégorie':''}.</p></div>
  )
  return (
    <div id="reservations-list">
      {filtered.map(r => {
        const name = [r.prenom, r.nom].filter(Boolean).join(' ')
        return (
          <div key={r.id} className="resa-card">
            <div className="resa-card-head">
              <div>
                {name && <span className="resa-card-name"><i className="fas fa-user" style={{marginRight:6}} />{name}</span>}
                <span className="resa-card-email"><i className="fas fa-envelope" style={{marginRight:6}} />{r.email}</span>
                {r.phone && <span className="resa-card-phone"><i className="fas fa-phone" style={{marginRight:6}} />{r.phone}</span>}
              </div>
              <span className={`status-badge ${STATUS_CLASS[r.status]||''}`}>{STATUS_LABEL[r.status]||r.status}</span>
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
            <div className="resa-card-actions">
              {r.status!=='confirmed' && <button className="adm-btn-success" onClick={() => onStatus(r.id,'confirmed')}><i className="fas fa-check" style={{marginRight:4}} />Confirmer</button>}
              {r.status!=='refused' && <button className="adm-btn-danger" onClick={() => onStatus(r.id,'refused')}><i className="fas fa-times" style={{marginRight:4}} />Refuser</button>}
              <button className="adm-btn-ghost" onClick={() => onContact(r)}><i className="fas fa-envelope" style={{marginRight:4}} />Email</button>
              {r.phone && <a className="adm-btn-success" href={`tel:${r.phone}`}><i className="fas fa-phone" style={{marginRight:4}} />Appeler</a>}
              <button className="adm-btn-delete" onClick={() => onDelete(r.id)}><i className="fas fa-trash" /></button>
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
              <div key={r.id} className="day-resa-card day-resa-clickable" onClick={() => onResaClick(r.id)}>
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
  const emailBody = `Bonjour ${name},\n\nNous avons bien reçu votre demande de réservation pour le ${dateDisplay}.\n\n[Votre réponse ici]\n\nCordialement,\nL'équipe OA Événementiel`
  const mailto = `mailto:${resa.email}?subject=${encodeURIComponent('Votre demande de réservation — OA Événementiel')}&body=${encodeURIComponent(emailBody)}`
  const created = new Date(resa.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})
  return (
    <div>
      <button className="detail-back" onClick={onBack}><i className="fas fa-arrow-left" style={{marginRight:8}} />Retour au {backDate&&new Date(backDate+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}</button>
      <div className="detail-head">
        <div>
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
      <div className="detail-block">
        <h4 className="detail-block-title"><i className="fas fa-boxes" style={{marginRight:8}} />Matériel demandé</h4>
        <div className="detail-mats">
          {resa.materials?.length>0
            ? resa.materials.map((m,i)=><div key={i} className="detail-mat-row"><span className="detail-mat-name"><i className="fas fa-box" style={{marginRight:8}} />{m.name}</span><span className="detail-mat-qty">× {m.quantity}</span></div>)
            : <p className="detail-empty-mat">Aucun matériel sélectionné</p>
          }
        </div>
      </div>
      <PaymentsBlock reservationId={resa.id} />
      {resa.message&&<div className="detail-block"><h4 className="detail-block-title"><i className="fas fa-comment" style={{marginRight:8}} />Message / Créneau</h4><p className="detail-message">{resa.message}</p></div>}
      <div className="detail-actions">
        {resa.status!=='confirmed'&&<button className="adm-btn-success" onClick={() => onStatus(resa.id,'confirmed')}><i className="fas fa-check" style={{marginRight:4}} />Confirmer</button>}
        {resa.status!=='refused'&&<button className="adm-btn-danger" onClick={() => onStatus(resa.id,'refused')}><i className="fas fa-times" style={{marginRight:4}} />Refuser</button>}
        <a href={mailto} className="adm-btn-ghost"><i className="fas fa-envelope" style={{marginRight:4}} />Répondre par email</a>
        {resa.phone&&<a href={`tel:${resa.phone}`} className="adm-btn-success"><i className="fas fa-phone" style={{marginRight:4}} />Appeler</a>}
        <button className="adm-btn-delete" onClick={onDelete}><i className="fas fa-trash" /></button>
      </div>
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

function MatTable({ materials, page, onPageChange, onEdit, onDelete, onToggle }) {
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
          {slice.map(m => (
            <tr key={m.id}>
              <td>{m.image_url?<img src={m.image_url} alt="" className="mat-thumb" />:<div className="mat-thumb-empty"><i className="fas fa-image" /></div>}</td>
              <td style={{textAlign:'center'}}><strong>{m.name}</strong></td>
              <td style={{textAlign:'center'}}>{m.category||'—'}</td>
              <td style={{textAlign:'center'}}>{m.description||'—'}</td>
              <td style={{textAlign:'center'}}>{m.max_quantity}</td>
              <td style={{textAlign:'center'}}>{(parseFloat(m.price)||0).toFixed(2)} €</td>
              <td style={{textAlign:'center'}}>
                <button className={`toggle-avail ${m.available?'avail-on':'avail-off'}`} onClick={() => onToggle(m.id, m.available)}>{m.available?'Oui':'Non'}</button>
              </td>
              <td style={{textAlign:'center'}}>
                <div className="adm-table-actions">
                  <button className="adm-btn-ghost btn-sm" onClick={() => onEdit(m.id)}><i className="fas fa-pen" /></button>
                  <button className="adm-btn-delete btn-sm" onClick={() => onDelete(m.id)}><i className="fas fa-trash" /></button>
                </div>
              </td>
            </tr>
          ))}
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
