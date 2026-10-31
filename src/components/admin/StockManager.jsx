import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

// Espace OA > Stock: what OA owns per article, what is out today, the
// busiest upcoming day, upcoming orders holding it, and quick +/− with a
// reason (purchase, breakage, loss…) — every change is logged.
// Server side: pages/api/admin/stock.js, src/lib/stock.js.

const REASONS = ['Achat / réassort', 'Retour de réparation', 'Casse', 'Perte', 'Inventaire', 'Autre']
const STATUS = { confirmed: 'Confirmée', pending: 'En attente', awaiting_payment: 'À payer' }
const LOW = 5

async function request(method = 'GET', body) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/admin/stock', {
    method,
    headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'Stock indisponible. Réessayez.')
  return result.data
}

const day = ds => new Date(ds + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const stamp = iso => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export default function StockManager({ onChanged }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [adjust, setAdjust] = useState(null) // { item, sign, qty, reason, note }
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState('')

  async function load() {
    setError('')
    try { setData(await request()) } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  const items = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.items.filter(i => {
      if (q && !i.name.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q)) return false
      if (filter === 'low') return i.stock - i.peak <= LOW
      if (filter === 'out') return i.outToday > 0
      if (filter === 'booked') return i.upcoming.length > 0
      return true
    })
  }, [data, search, filter])

  const totals = useMemo(() => {
    if (!data) return null
    return {
      units: data.items.reduce((n, i) => n + i.stock, 0),
      outToday: data.items.reduce((n, i) => n + i.outToday, 0),
      low: data.items.filter(i => i.stock - i.peak <= LOW).length,
      orders: new Set(data.items.flatMap(i => i.upcoming.map(u => u.reference))).size,
    }
  }, [data])

  async function submitAdjust(e) {
    e.preventDefault()
    const qty = parseInt(adjust.qty, 10)
    if (!qty || qty < 1) { setError('Indiquez une quantité (1 ou plus).'); return }
    setBusy(true); setError('')
    try {
      const reason = [adjust.reason, adjust.note.trim()].filter(Boolean).join(' — ')
      const res = await request('POST', { materialId: adjust.item.id, delta: adjust.sign * qty, reason })
      setFlash(`${adjust.item.name} : stock passé à ${res.stock}.`)
      setTimeout(() => setFlash(''), 4000)
      setAdjust(null)
      await load()
      onChanged?.()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="stk">
      <div className="adm-header">
        <div>
          <p className="adm-eyebrow">Inventaire</p>
          <h1 className="adm-title">Stock</h1>
        </div>
        <button type="button" className="adm-btn-ghost" onClick={load}><i className="fas fa-sync-alt" style={{ marginRight: 8 }} />Actualiser</button>
      </div>

      {totals && (
        <div className="stk-kpis">
          <div className="stk-kpi"><span>Unités en stock</span><strong>{totals.units}</strong></div>
          <div className="stk-kpi"><span>Sorties aujourd’hui</span><strong>{totals.outToday}</strong></div>
          <div className="stk-kpi"><span>Commandes à venir</span><strong>{totals.orders}</strong></div>
          <div className={`stk-kpi${totals.low ? ' is-warn' : ''}`}><span>Articles en tension</span><strong>{totals.low}</strong></div>
        </div>
      )}

      {flash && <p className="stk-flash" role="status"><i className="fas fa-check-circle" /> {flash}</p>}
      {error && <p className="stk-error" role="alert"><i className="fas fa-exclamation-circle" /> {error}</p>}

      <div className="stk-toolbar">
        <div className="mat-search" style={{ maxWidth: 320 }}>
          <i className="fas fa-search" />
          <input type="text" placeholder="Rechercher un article…" aria-label="Rechercher un article" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="adm-filters">
          {[['all', 'Tous'], ['booked', 'Réservés'], ['out', 'Sortis aujourd’hui'], ['low', 'En tension']].map(([k, label]) => (
            <button key={k} type="button" className={`filter-btn${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
      </div>

      {!data && !error && <p className="stk-empty"><i className="fas fa-circle-notch fa-spin" /> Chargement…</p>}
      {data && !items.length && <p className="stk-empty">Aucun article ne correspond.</p>}

      {items.length > 0 && (
        <div className="stk-table-wrap">
          <table className="stk-table">
            <thead>
              <tr>
                <th scope="col">Article</th>
                <th scope="col" className="num">Stock</th>
                <th scope="col" className="num">Sorti aujourd’hui</th>
                <th scope="col" className="num">Dispo aujourd’hui</th>
                <th scope="col" className="num">Pic à venir</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const margin = i.stock - i.peak
                const open = openId === i.id
                return (
                  <FragmentRow key={i.id}>
                    <tr className={margin <= LOW ? 'is-tight' : ''}>
                      <td>
                        <div className="stk-item">
                          {i.imageUrl ? <img src={i.imageUrl} alt="" /> : <span className="stk-noimg"><i className="fas fa-image" /></span>}
                          <span>
                            <strong>{i.name}</strong>
                            <small>{i.category}{!i.online && ' · hors ligne'}</small>
                          </span>
                        </div>
                      </td>
                      <td className="num"><strong className="stk-stock">{i.stock}</strong></td>
                      <td className="num">{i.outToday || '—'}</td>
                      <td className="num">{i.availableToday}</td>
                      <td className="num">
                        {i.peak ? <span className={`stk-peak${margin <= LOW ? ' is-warn' : ''}`}>{i.peak}<small> le {day(i.peakDate)}</small></span> : '—'}
                      </td>
                      <td className="stk-actions">
                        <button type="button" className="stk-btn" onClick={() => setAdjust({ item: i, sign: 1, qty: '1', reason: REASONS[0], note: '' })} aria-label={`Ajouter du stock à ${i.name}`}><i className="fas fa-plus" /></button>
                        <button type="button" className="stk-btn" onClick={() => setAdjust({ item: i, sign: -1, qty: '1', reason: 'Casse', note: '' })} disabled={i.stock === 0} aria-label={`Retirer du stock à ${i.name}`}><i className="fas fa-minus" /></button>
                        <button type="button" className={`stk-btn stk-btn-text${open ? ' is-open' : ''}`} onClick={() => setOpenId(open ? null : i.id)} aria-expanded={open} disabled={!i.upcoming.length}>
                          {i.upcoming.length} commande{i.upcoming.length > 1 ? 's' : ''} <i className={`fas fa-chevron-${open ? 'up' : 'down'}`} />
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="stk-detail">
                        <td colSpan={6}>
                          <ul>
                            {i.upcoming.map(u => (
                              <li key={u.reference + u.from}>
                                <span className="stk-ref">{u.reference || '—'}</span>
                                <span>{u.client || 'Client'}</span>
                                <span>{u.from === u.to ? day(u.from) : `${day(u.from)} → ${day(u.to)}`}</span>
                                <span><strong>{u.quantity}</strong> unité{u.quantity > 1 ? 's' : ''}</span>
                                <span className={`stk-status is-${u.status}`}>{STATUS[u.status] || u.status}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data?.movements?.length > 0 && (
        <section className="stk-log">
          <h2>Derniers mouvements</h2>
          <ul>
            {data.movements.map(m => (
              <li key={m.id}>
                <span className={`stk-delta${m.delta > 0 ? ' is-in' : ' is-out'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                <span className="stk-log-name">{m.materialName}</span>
                <span className="stk-log-reason">{m.reason || '—'}</span>
                <span className="stk-log-after">Stock : {m.stockAfter}</span>
                <time dateTime={m.createdAt}>{stamp(m.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}

      {adjust && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget && !busy) setAdjust(null) }}>
          <form className="modal-card stk-modal" role="dialog" aria-modal="true" aria-labelledby="stk-modal-title" onSubmit={submitAdjust}>
            <h3 id="stk-modal-title">{adjust.sign > 0 ? 'Ajouter du stock' : 'Retirer du stock'}</h3>
            <p className="stk-modal-item">{adjust.item.name} · stock actuel <strong>{adjust.item.stock}</strong></p>
            <div className="adm-form-group">
              <label htmlFor="stk-qty">Quantité</label>
              <input id="stk-qty" className="adm-input" type="number" min={1} value={adjust.qty} autoFocus onChange={e => setAdjust(a => ({ ...a, qty: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label htmlFor="stk-reason">Motif</label>
              <select id="stk-reason" className="adm-input" value={adjust.reason} onChange={e => setAdjust(a => ({ ...a, reason: e.target.value }))}>
                {REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="adm-form-group">
              <label htmlFor="stk-note">Précision <span className="adm-label-opt">(optionnel)</span></label>
              <input id="stk-note" className="adm-input" maxLength={120} value={adjust.note} onChange={e => setAdjust(a => ({ ...a, note: e.target.value }))} placeholder="ex : 2 chaises cassées au mariage Dupont" />
            </div>
            {(() => {
              const next = adjust.item.stock + adjust.sign * (parseInt(adjust.qty, 10) || 0)
              return <p className={`stk-modal-next${adjust.sign < 0 && next < adjust.item.peak ? ' is-warn' : ''}`}>Nouveau stock : <strong>{next}</strong>{adjust.sign < 0 && adjust.item.peak > 0 && <> · {adjust.item.peak} déjà réservé{adjust.item.peak > 1 ? 's' : ''} le {day(adjust.item.peakDate)}</>}</p>
            })()}
            <div className="mat-form-actions">
              <button type="button" className="adm-btn-ghost" onClick={() => setAdjust(null)} disabled={busy}>Annuler</button>
              <button type="submit" className="adm-btn-primary" disabled={busy}>{busy ? 'Enregistrement…' : 'Valider'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function FragmentRow({ children }) { return <>{children}</> }
