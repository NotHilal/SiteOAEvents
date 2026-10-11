import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { ttcFromHt } from '../../lib/pricing.js'
import PricingEditor from './PricingEditor.jsx'
import ImagePicker from './ImagePicker.jsx'
import {
  emptyPricing, emptyOption, newOptionKey, pricingFromTiers, parsePricing, tierRowsFor,
  validateArticle, optionName,
} from './materialForm.js'

// Espace OA > Matériel: add / edit window for an article, either
//   - "Article simple": one configuration (one price grid, stock, photo) —
//     the single-option product page; or
//   - "Article à options": several selectable versions (15 kg / 30 kg,
//     5 m / 10 m…), each its own material with its own price grid, stock,
//     photo and availability — the multiple-options product page.
// Rules and the data model: ./materialForm.js.
//
// `target`: { mode: 'new' } | { materialId } | { productId, focusOptionId? }

const TABS = {
  single: [{ key: 'infos', label: 'Informations' }, { key: 'tarification', label: 'Tarification' }],
  multiple: [{ key: 'infos', label: 'Informations' }, { key: 'options', label: 'Options' }],
}

// The DB client resolves to { data, error } instead of throwing; every
// write here must stop the save on failure rather than carry on silently.
async function must(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}

// Old Supabase-hosted URLs only; local /uploads files are left in place,
// same as the previous editor.
async function removeStorageImg(url) {
  try {
    const marker = '/object/public/materials/'
    const i = url.indexOf(marker)
    if (i !== -1) await supabase.storage.from('materials').remove([url.slice(i + marker.length)])
  } catch {}
}

// New file → upload it (replacing the previous one); photo removed →
// delete the old one; otherwise keep what's there.
async function resolveImage({ imageFile, imageUrl }, originalUrl) {
  if (imageFile) {
    if (originalUrl) await removeStorageImg(originalUrl)
    const ext = imageFile.name.split('.').pop().toLowerCase()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('materials').upload(path, imageFile, { upsert: false })
    if (error) throw error
    return supabase.storage.from('materials').getPublicUrl(path).data.publicUrl
  }
  if (!imageUrl && originalUrl) { await removeStorageImg(originalUrl); return null }
  return imageUrl || null
}

async function replaceTiers(materialId, tiers) {
  await must(supabase.from('material_price_tiers').delete().eq('material_id', materialId))
  await must(supabase.from('material_price_tiers').insert(tierRowsFor(materialId, tiers)))
}

const blankForm = () => ({
  kind: 'single', name: '', category: '', description: '',
  qty: 1, available: true, pricing: emptyPricing(), imageUrl: '', imageFile: null, imagePreview: null,
  options: [], keepMaterialId: null,
})

function optionFromMaterial(m, tiers, open = false) {
  return {
    key: newOptionKey(), id: m.id, label: m.variant_label || '', qty: m.max_quantity ?? 1,
    description: m.description || '', available: m.available !== false,
    pricing: pricingFromTiers(tiers), imageUrl: m.image_url || '', imageFile: null, imagePreview: m.image_url || null, open,
  }
}

function priceSummary(pricing) {
  const { tiers } = parsePricing(pricing)
  if (!tiers) return null
  return `dès ${ttcFromHt(Math.min(...tiers.map(t => t.weekday))).toFixed(2)} € TTC`
}

export default function MaterialEditor({ target, categories, onClose, onSaved }) {
  const [form, setForm] = useState(blankForm)
  // What was in the DB when the editor opened — to know what to update,
  // which options were removed, and which old photos to clean up.
  const [original, setOriginal] = useState({ materialId: null, productId: null, optionIds: [], images: {}, slug: null })
  const [loading, setLoading] = useState(target.mode !== 'new')
  const [tab, setTab] = useState('infos')
  const [problem, setProblem] = useState(null)
  const [saving, setSaving] = useState(false)
  // Confirmation before going back to "Article simple" would drop options.
  const [confirmSimple, setConfirmSimple] = useState(false)
  const confirmCancelRef = useRef(null)
  const optionRefs = useRef({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (target.mode === 'new') return
      let productId = target.productId || null
      let focusId = target.focusOptionId || null
      if (target.materialId) {
        const m = await must(supabase.from('materials').select('*').eq('id', target.materialId).single())
        if (m?.product_id) { productId = m.product_id; focusId = m.id }
        else if (m) {
          const tiers = await must(supabase.from('material_price_tiers').select('*').eq('material_id', m.id).order('min_qty'))
          if (cancelled) return
          setForm({
            ...blankForm(), name: m.name, category: m.category || '', description: m.description || '',
            qty: m.max_quantity ?? 1, available: m.available !== false, pricing: pricingFromTiers(tiers),
            imageUrl: m.image_url || '', imagePreview: m.image_url || null,
          })
          setOriginal({ materialId: m.id, productId: null, optionIds: [], images: { [m.id]: m.image_url || null }, slug: m.slug || null })
          setLoading(false)
          return
        }
      }
      if (productId) {
        const [p, mats] = await Promise.all([
          must(supabase.from('products').select('*').eq('id', productId).single()),
          must(supabase.from('materials').select('*').eq('product_id', productId).order('variant_order')),
        ])
        const ids = (mats || []).map(m => m.id)
        const tierRows = ids.length ? await must(supabase.from('material_price_tiers').select('*').in('material_id', ids).order('min_qty')) : []
        if (cancelled) return
        const options = (mats || []).map(m => optionFromMaterial(m, tierRows.filter(t => t.material_id === m.id), m.id === focusId))
        setForm({ ...blankForm(), kind: 'multiple', name: p?.name || '', category: p?.category || '', description: p?.description || '', options })
        setOriginal({ materialId: null, productId, optionIds: ids, images: Object.fromEntries((mats || []).map(m => [m.id, m.image_url || null])), slug: p?.slug || null })
        if (focusId) setTab('options')
        setLoading(false)
      }
    }
    load().catch(err => { alert('Erreur de chargement : ' + (err.message || err)); onClose() })
    return () => { cancelled = true }
  }, [target])

  // Scroll the option opened from the list ("Modifier" on an option row)
  // into view once it has rendered.
  useEffect(() => {
    if (loading || tab !== 'options' || !target.focusOptionId && !target.materialId) return
    const open = form.options.find(o => o.open)
    if (open) optionRefs.current[open.key]?.scrollIntoView({ block: 'nearest' })
  }, [loading])

  const set = patch => { setForm(f => ({ ...f, ...patch })); setProblem(null) }
  const setOption = (key, patch) => { setForm(f => ({ ...f, options: f.options.map(o => (o.key === key ? { ...o, ...patch } : o)) })); setProblem(null) }

  // Switching type keeps the shared fields (name, category, description).
  // Simple → options: the current configuration (price grid, stock, photo,
  // availability — and, for an existing article, its id, so carts and links
  // keep working) becomes option 1; option 2 starts empty.
  // Options → simple: option 1 becomes the article; any other option is
  // dropped (deleted on save if it was already saved) — after a
  // confirmation whenever that would lose something (see dropsOptions).
  function switchKind(kind) {
    if (kind === form.kind) return
    if (kind === 'multiple') {
      const first = {
        ...emptyOption(), id: original.materialId || form.keepMaterialId || null, qty: form.qty, available: form.available, pricing: form.pricing,
        imageUrl: form.imageUrl, imageFile: form.imageFile, imagePreview: form.imagePreview,
      }
      set({ kind, options: [first, emptyOption()] })
      // A new article starts on Informations (name, category first); an
      // existing one being converted goes straight to its options.
      setTab(target.mode === 'new' ? 'infos' : 'options')
    } else {
      if (dropsOptions()) { setConfirmSimple(true); return }
      toSimple()
    }
  }

  // Would switching to "Article simple" lose anything? Yes if an option
  // other than the first is already saved, or has been filled in at all.
  // An untouched blank option 2 (the one added automatically) doesn't count.
  const extraOptions = () => form.options.slice(1)
  const savedExtraOptions = () => extraOptions().filter(o => o.id)
  function dropsOptions() {
    return extraOptions().some(o =>
      o.id || o.label.trim() || o.description.trim() || o.imageFile || o.imagePreview ||
      String(o.qty) !== '1' || o.available === false || o.pricing.tieredPricing ||
      o.pricing.tiers.some(t => String(t.weekday).trim() !== '' || String(t.weekend).trim() !== ''))
  }

  function toSimple() {
    setConfirmSimple(false)
    const o = form.options[0] || emptyOption()
    set({
      kind: 'single', options: [], qty: o.qty, available: o.available, pricing: o.pricing,
      imageUrl: o.imageUrl, imageFile: o.imageFile, imagePreview: o.imagePreview,
      description: form.description || o.description,
      // The option's material becomes the simple article (same id, so
      // carts and links keep working).
      keepMaterialId: o.id || null,
    })
    setTab('infos')
  }

  // Escape cancels the confirmation; focus starts on "Annuler", the safe
  // choice.
  useEffect(() => {
    if (!confirmSimple) return
    confirmCancelRef.current?.focus()
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); setConfirmSimple(false) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [confirmSimple])

  function addOption() {
    setForm(f => ({ ...f, options: [...f.options.map(o => ({ ...o, open: false })), emptyOption()] }))
    setProblem(null)
  }
  function removeOption(key) {
    const o = form.options.find(x => x.key === key)
    const msg = o?.id
      ? `Supprimer l'option « ${o.label || 'sans libellé'} » ? Elle sera supprimée à l'enregistrement, avec sa photo et ses tarifs.`
      : 'Retirer cette option ?'
    if (!window.confirm(msg)) return
    setForm(f => ({ ...f, options: f.options.filter(x => x.key !== key) }))
  }
  function moveOption(key, delta) {
    setForm(f => {
      const i = f.options.findIndex(o => o.key === key)
      const j = i + delta
      if (i < 0 || j < 0 || j >= f.options.length) return f
      const options = [...f.options]
      ;[options[i], options[j]] = [options[j], options[i]]
      return { ...f, options }
    })
  }

  async function save() {
    const check = validateArticle(form)
    if (!check.ok) {
      setProblem(check)
      setTab(check.tab)
      if (check.optionKey) setForm(f => ({ ...f, options: f.options.map(o => (o.key === check.optionKey ? { ...o, open: true } : o)) }))
      return
    }
    setSaving(true)
    try {
      const name = form.name.trim()
      const category = form.category || null
      const keptIds = []

      if (form.kind === 'single') {
        const materialId = original.materialId || form.keepMaterialId || null
        const { tiers } = parsePricing(form.pricing)
        const payload = {
          name, category, description: form.description.trim() || null,
          max_quantity: parseInt(String(form.qty), 10), available: form.available,
          image_url: await resolveImage(form, materialId ? original.images[materialId] : null),
          product_id: null, variant_label: null, variant_order: null,
        }
        let id = materialId
        if (id) await must(supabase.from('materials').update(payload).eq('id', id))
        else id = (await must(supabase.from('materials').insert(payload))).id
        await replaceTiers(id, tiers)
        keptIds.push(id)
      } else {
        const productPayload = { name, category, description: form.description.trim() || null }
        let productId = original.productId
        if (productId) await must(supabase.from('products').update(productPayload).eq('id', productId))
        else {
          // A simple article turned into one with options hands its web
          // address to the new article, so links already shared still open
          // it (now with its options). Otherwise the server picks one.
          if (original.materialId && original.slug) productPayload.slug = original.slug
          productId = (await must(supabase.from('products').insert(productPayload))).id
        }

        for (const [i, o] of form.options.entries()) {
          const { tiers } = parsePricing(o.pricing)
          const payload = {
            name: optionName(name, o.label), category, description: o.description.trim() || null,
            max_quantity: parseInt(String(o.qty), 10), available: o.available,
            image_url: await resolveImage(o, o.id ? original.images[o.id] : null),
            product_id: productId, variant_label: o.label.trim(), variant_order: i + 1,
          }
          let id = o.id
          if (id) await must(supabase.from('materials').update(payload).eq('id', id))
          else id = (await must(supabase.from('materials').insert(payload))).id
          await replaceTiers(id, tiers)
          keptIds.push(id)
        }
      }

      // Options removed in the editor (or every option but the one kept
      // when turning an article à options back into a simple one).
      for (const id of original.optionIds.filter(id => !keptIds.includes(id))) {
        if (original.images[id]) await removeStorageImg(original.images[id])
        await must(supabase.from('material_price_tiers').delete().eq('material_id', id))
        await must(supabase.from('materials').delete().eq('id', id))
      }
      // Article à options turned simple: its product row goes away, and the
      // remaining article takes over its web address when that's free, so
      // the article's links keep working.
      if (form.kind === 'single' && original.productId) {
        await must(supabase.from('products').delete().eq('id', original.productId))
        if (original.slug) {
          const holders = await must(supabase.from('materials').select('id').eq('slug', original.slug))
          if (!holders.some(h => h.id !== keptIds[0])) await must(supabase.from('materials').update({ slug: original.slug }).eq('id', keptIds[0]))
        }
      }
      await onSaved()
    } catch (err) {
      // Closed and reloaded rather than left open: part of the article may
      // already be saved, and retrying from this stale form could create it
      // twice.
      alert('Erreur : ' + (err.message || err) + '\nCertaines modifications ont pu être enregistrées : vérifiez la liste avant de réessayer.')
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  const isEdit = target.mode !== 'new'
  const tabs = TABS[form.kind]
  const savedExtra = confirmSimple ? savedExtraOptions() : []
  const firstLabel = form.options[0]?.label.trim()

  return (
    <>
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="modal-card detail-modal-card mat-edit-modal-card" role="dialog" aria-modal="true" aria-labelledby="mat-editor-title">
        <button className="modal-close" onClick={onClose} disabled={saving} aria-label="Fermer"><i className="fas fa-times" /></button>
        <h3 className="modal-title" id="mat-editor-title">
          <i className={`fas ${isEdit ? 'fa-pen' : 'fa-plus'}`} style={{ marginRight: 8, color: 'var(--rose-gold)' }} />
          {isEdit ? "Modifier l'article" : 'Nouvel article'}
        </h3>

        {loading ? (
          <p className="mat-editor-loading"><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Chargement…</p>
        ) : (
          <>
            <fieldset className="mat-kind-picker">
              <legend>Type d'article</legend>
              <label className={`mat-kind-card${form.kind === 'single' ? ' is-selected' : ''}`}>
                <input type="radio" name="mat-kind" checked={form.kind === 'single'} onChange={() => switchKind('single')} />
                <span className="mat-kind-title"><i className="fas fa-cube" /> Article simple</span>
                <span className="mat-kind-text">Une seule version : un prix, un stock, une photo.</span>
              </label>
              <label className={`mat-kind-card${form.kind === 'multiple' ? ' is-selected' : ''}`}>
                <input type="radio" name="mat-kind" checked={form.kind === 'multiple'} onChange={() => switchKind('multiple')} />
                <span className="mat-kind-title"><i className="fas fa-layer-group" /> Article à options</span>
                <span className="mat-kind-text">Plusieurs versions au choix (taille, longueur, poids, coloris…), chacune avec son prix, son stock et sa photo.</span>
              </label>
            </fieldset>

            <div className="mat-form-tabs">
              {tabs.map(t => (
                <button key={t.key} type="button" className={`mat-form-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                  {t.label}{t.key === 'options' ? ` (${form.options.length})` : ''}
                </button>
              ))}
            </div>

            {problem && (
              <div className="mat-form-problem" role="alert"><i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />{problem.message}</div>
            )}

            {tab === 'infos' && (
              <>
                <div className="mat-form-grid">
                  <div className="adm-form-group">
                    <label htmlFor="mat-name">{form.kind === 'multiple' ? "Nom de l'article" : 'Nom'} <span className="req">*</span></label>
                    <input id="mat-name" className="adm-input" value={form.name} onChange={e => set({ name: e.target.value })} style={!form.name.trim() ? { borderColor: 'var(--danger)' } : {}} placeholder={form.kind === 'multiple' ? 'ex : Poids de lestage' : ''} />
                  </div>
                  <div className="adm-form-group">
                    <label htmlFor="mat-cat">Catégorie</label>
                    <select id="mat-cat" className="adm-input" value={form.category} onChange={e => set({ category: e.target.value })}>
                      <option value="">— Sans catégorie —</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="adm-form-group">
                    <label htmlFor="mat-desc">{form.kind === 'multiple' ? 'Description commune' : 'Description'}</label>
                    <input id="mat-desc" className="adm-input" placeholder="Courte description" value={form.description} onChange={e => set({ description: e.target.value })} />
                  </div>
                  {form.kind === 'single' && (
                    <div className="adm-form-group">
                      <label htmlFor="mat-qty">Stock initial <span className="req">*</span></label>
                      <input id="mat-qty" type="number" min={1} className="adm-input" value={form.qty} onChange={e => set({ qty: e.target.value })} />
                    </div>
                  )}
                </div>
                {form.kind === 'single' ? (
                  <ImagePicker
                    preview={form.imagePreview}
                    onFile={(file, preview) => set({ imageFile: file, imagePreview: preview })}
                    onRemove={() => set({ imageFile: null, imageUrl: '', imagePreview: null })}
                  />
                ) : (
                  <p className="mat-kind-note">Le stock, les tarifs, la photo et la disponibilité se règlent pour chaque option, dans l'onglet <button type="button" className="mat-link-btn" onClick={() => setTab('options')}>Options</button>.</p>
                )}
              </>
            )}

            {tab === 'tarification' && form.kind === 'single' && (
              <PricingEditor pricing={form.pricing} onChange={pricing => set({ pricing })} />
            )}

            {tab === 'options' && form.kind === 'multiple' && (
              <div className="mat-options">
                <p className="mat-kind-note">
                  Proposées au client dans un tableau sur la fiche produit, dans cet ordre. Le nom affiché d'une option est le nom de l'article suivi de son libellé.
                </p>
                {form.options.map((o, i) => {
                  const summary = priceSummary(o.pricing)
                  return (
                    <div key={o.key} ref={el => { optionRefs.current[o.key] = el }} className={`mat-option-card${o.open ? ' is-open' : ''}${problem?.optionKey === o.key ? ' has-error' : ''}`}>
                      <div className="mat-option-head">
                        <span className="mat-option-index">{i + 1}</span>
                        <button type="button" className="mat-option-summary" onClick={() => setOption(o.key, { open: !o.open })} aria-expanded={o.open}>
                          {o.imagePreview ? <img src={o.imagePreview} alt="" /> : <span className="mat-option-noimg"><i className="fas fa-image" /></span>}
                          <span>
                            <strong>{o.label.trim() || 'Nouvelle option'}</strong>
                            <small>Stock {o.qty || '—'}{summary ? ` · ${summary}` : ''}{o.id ? '' : ' · nouvelle'}</small>
                          </span>
                        </button>
                        <label className="mat-option-avail" title="Proposée à la location">
                          <input type="checkbox" checked={o.available} onChange={e => setOption(o.key, { available: e.target.checked })} /> Dispo
                        </label>
                        <div className="mat-option-tools">
                          <button type="button" className="adm-btn-ghost btn-sm" onClick={() => moveOption(o.key, -1)} disabled={i === 0} aria-label="Monter"><i className="fas fa-arrow-up" /></button>
                          <button type="button" className="adm-btn-ghost btn-sm" onClick={() => moveOption(o.key, 1)} disabled={i === form.options.length - 1} aria-label="Descendre"><i className="fas fa-arrow-down" /></button>
                          <button type="button" className="adm-btn-ghost btn-sm" onClick={() => setOption(o.key, { open: !o.open })} aria-label={o.open ? 'Replier' : 'Modifier'}><i className={`fas ${o.open ? 'fa-chevron-up' : 'fa-pen'}`} /></button>
                          <button type="button" className="adm-btn-delete btn-sm" onClick={() => removeOption(o.key)} aria-label="Supprimer l'option"><i className="fas fa-trash" /></button>
                        </div>
                      </div>
                      {o.open && (
                        <div className="mat-option-body">
                          <div className="mat-form-grid">
                            <div className="adm-form-group">
                              <label htmlFor={`${o.key}-label`}>Libellé <span className="req">*</span></label>
                              <input id={`${o.key}-label`} className="adm-input" placeholder="ex : 15 kg, 5 mètres, Beige" value={o.label} onChange={e => setOption(o.key, { label: e.target.value })} style={!o.label.trim() ? { borderColor: 'var(--danger)' } : {}} />
                              <div className="mat-option-preview">Nom affiché : <strong>{optionName(form.name || "Nom de l'article", o.label || '…')}</strong></div>
                            </div>
                            <div className="adm-form-group">
                              <label htmlFor={`${o.key}-qty`}>Stock <span className="req">*</span></label>
                              <input id={`${o.key}-qty`} type="number" min={1} className="adm-input" value={o.qty} onChange={e => setOption(o.key, { qty: e.target.value })} />
                            </div>
                            <div className="adm-form-group mat-span-2">
                              <label htmlFor={`${o.key}-desc`}>Description de l'option <span className="adm-label-opt">(optionnel)</span></label>
                              <input id={`${o.key}-desc`} className="adm-input" placeholder="Ce qui est propre à cette version" value={o.description} onChange={e => setOption(o.key, { description: e.target.value })} />
                            </div>
                          </div>
                          <ImagePicker
                            label="Photo de l'option"
                            preview={o.imagePreview}
                            onFile={(file, preview) => setOption(o.key, { imageFile: file, imagePreview: preview })}
                            onRemove={() => setOption(o.key, { imageFile: null, imageUrl: '', imagePreview: null })}
                          />
                          <h4 className="mat-option-subtitle">Tarification</h4>
                          <PricingEditor pricing={o.pricing} onChange={pricing => setOption(o.key, { pricing })} />
                        </div>
                      )}
                    </div>
                  )
                })}
                <button type="button" className="adm-btn-ghost" onClick={addOption}><i className="fas fa-plus" style={{ marginRight: 6 }} />Ajouter une option</button>
              </div>
            )}

            <div className="mat-form-actions">
              <button type="button" className="adm-btn-primary" onClick={save} disabled={saving}>
                {saving ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Enregistrement…</> : <><i className="fas fa-save" style={{ marginRight: 8 }} />Enregistrer</>}
              </button>
              <button type="button" className="adm-btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
            </div>
          </>
        )}
      </div>
    </div>

    {confirmSimple && (
      <div className="modal-overlay mat-confirm-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmSimple(false) }}>
        <div className="modal-card delete-modal-card" role="alertdialog" aria-modal="true" aria-labelledby="mat-confirm-title" aria-describedby="mat-confirm-text">
          <div className="del-modal-icon mat-confirm-icon"><i className="fas fa-exclamation-triangle" /></div>
          <h3 className="del-modal-title" id="mat-confirm-title">Revenir à un article simple ?</h3>
          <div className="del-modal-sub" id="mat-confirm-text">
            <p>
              Seule la première option{firstLabel ? ` (« ${firstLabel} »)` : ''} sera conservée : son prix, son stock et sa photo deviendront ceux de l'article.
              {' '}{savedExtra.length > 0
                ? `Les ${extraOptions().length} autres options seront définitivement supprimées à l'enregistrement, avec leurs photos et leurs tarifs.`
                : `Les autres options que vous avez commencé à remplir seront perdues.`}
            </p>
            {savedExtra.length > 0 && (
              <p className="mat-confirm-hint">Pour les garder comme articles séparés, utilisez plutôt « Dissocier » dans la liste.</p>
            )}
          </div>
          <div className="del-modal-actions">
            <button type="button" ref={confirmCancelRef} className="adm-btn-ghost" onClick={() => setConfirmSimple(false)}>Annuler</button>
            <button type="button" className="adm-btn-danger" onClick={toSimple}>Oui, article simple</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
