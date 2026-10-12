import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import ImagePicker from './ImagePicker.jsx'
import { removeStorageImg } from './MaterialEditor.jsx'
import {
  TILES_PER_PAGE, cataloguePagePath, cataloguePageCount, categoryTitle,
  categoryKeyFromTitle, normalizeCategoryTitle, sortCategories,
} from '../../lib/catalogue-pages.js'

// Espace OA > Catalogue: the category tiles of /catalogue. Each category is a
// tile (title, description, photo) and a filter of the Matériel editor and
// of /catalogue/complet. Tiles fill pages of 6 in order: /catalogue, then
// /catalogue-2, /catalogue-3…

async function must(promise) {
  const { data, error } = await promise
  if (error) throw error
  return data
}

async function uploadPhoto(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const path = `catalogue-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('materials').upload(path, file, { upsert: false })
  if (error) throw error
  return supabase.storage.from('materials').getPublicUrl(path).data.publicUrl
}

function articleCount(category, materials, products) {
  const productIds = new Set(products.filter(p => p.category === category.name).map(p => String(p.id)))
  const keys = new Set()
  for (const m of materials) {
    if (m.product_id && productIds.has(String(m.product_id))) keys.add(`p:${m.product_id}`)
    else if (m.category === category.name) keys.add(`m:${m.id}`)
  }
  return keys.size
}

export default function CatalogueManager({ categories, materials, products, onChanged, onConfirmDelete }) {
  const sorted = sortCategories(categories)
  const pageCount = cataloguePageCount(sorted.length)
  const pages = Array.from({ length: pageCount }, (_, i) => sorted.slice(i * TILES_PER_PAGE, (i + 1) * TILES_PER_PAGE))
  const nextPage = Math.floor(sorted.length / TILES_PER_PAGE) + 1
  const [editor, setEditor] = useState(null) // null | { category?: row }
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function move(index, delta) {
    const other = sorted[index + delta]
    if (!other || busy) return
    setBusy(true)
    try {
      // Rewrite every position from the current order, so gaps or ties left
      // by older data never make a swap ambiguous.
      const order = sorted.map(c => c.id)
      ;[order[index], order[index + delta]] = [order[index + delta], order[index]]
      await savePositions(order)
      await onChanged()
    } finally { setBusy(false) }
  }

  async function savePositions(order) {
    const byId = Object.fromEntries(sorted.map(c => [c.id, c]))
    for (const [i, id] of order.entries()) {
      if (byId[id]?.position !== i) await must(supabase.from('categories').update({ position: i }).eq('id', id))
    }
  }

  function remove(category) {
    const count = articleCount(category, materials, products)
    if (count) {
      setNotice(`« ${categoryTitle(category)} » contient ${count} article${count > 1 ? 's' : ''} : changez-${count > 1 ? 'les' : 'le'} de catégorie dans Matériel avant de la supprimer.`)
      return
    }
    setNotice('')
    onConfirmDelete(`La catégorie « ${categoryTitle(category)} » et sa photo seront supprimées du catalogue. Les catégories suivantes avanceront d'une place.`, async () => {
      await must(supabase.from('categories').delete().eq('id', category.id))
      await removeStorageImg(category.image_url)
      await savePositions(sorted.filter(c => c.id !== category.id).map(c => c.id))
      await onChanged()
    })
  }

  return (
    <>
      <div className="adm-header">
        <div>
          <p className="adm-eyebrow">Site public</p>
          <h1 className="adm-title">Catalogue</h1>
          <p className="adm-sub">Chaque catégorie est une vignette de la page Catalogue et un filtre du Matériel. 6 vignettes par page : au-delà, une nouvelle page est créée.</p>
        </div>
        <button type="button" className="adm-btn-primary" onClick={() => { setNotice(''); setEditor({}) }}>
          <i className="fas fa-plus" style={{ marginRight: 8 }} />Ajouter une catégorie
        </button>
      </div>

      {notice && <div className="mat-form-problem cat-mgr-notice" role="alert"><i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />{notice}</div>}

      {pages.map((tiles, p) => (
        <section key={p} className="cat-mgr-page">
          <header className="cat-mgr-page-head">
            <h2>Page {p + 1}</h2>
            <a href={cataloguePagePath(p + 1)} target="_blank" rel="noreferrer" className="cat-mgr-page-link">
              {cataloguePagePath(p + 1)} <i className="fas fa-external-link-alt" />
            </a>
            <span className={`cat-mgr-page-count${tiles.length >= TILES_PER_PAGE ? ' is-full' : ''}`}>{tiles.length} / {TILES_PER_PAGE}</span>
          </header>
          {tiles.length ? (
            <ul className="cat-mgr-grid">
              {tiles.map((c, i) => {
                const index = p * TILES_PER_PAGE + i
                const count = articleCount(c, materials, products)
                return (
                  <li key={c.id} className="cat-mgr-tile">
                    <div className={`cat-mgr-thumb${c.image_url ? '' : ' is-empty'}`}>
                      {c.image_url ? <img src={c.image_url} alt="" loading="lazy" /> : <span><i className="fas fa-image" />Pas de photo</span>}
                      <span className="cat-mgr-pos">{index + 1}</span>
                    </div>
                    <div className="cat-mgr-body">
                      <strong className="cat-mgr-title">{categoryTitle(c)}</strong>
                      <p className="cat-mgr-desc">{c.description || <em>Pas de description</em>}</p>
                      <span className="cat-mgr-count">{count} article{count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="cat-mgr-actions">
                      <button type="button" className="cat-pg-btn" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`Avancer ${categoryTitle(c)}`} title="Avancer"><i className="fas fa-arrow-left" /></button>
                      <button type="button" className="cat-pg-btn" disabled={busy || index === sorted.length - 1} onClick={() => move(index, 1)} aria-label={`Reculer ${categoryTitle(c)}`} title="Reculer"><i className="fas fa-arrow-right" /></button>
                      <span className="cat-mgr-actions-gap" />
                      <button type="button" className="adm-btn-ghost btn-sm" onClick={() => { setNotice(''); setEditor({ category: c }) }}><i className="fas fa-pen" style={{ marginRight: 4 }} />Modifier</button>
                      <button type="button" className="adm-btn-delete btn-sm" onClick={() => remove(c)} aria-label={`Supprimer ${categoryTitle(c)}`}><i className="fas fa-trash" /></button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="adm-empty"><i className="fas fa-th-large" /><p>Aucune catégorie pour le moment.</p></div>
          )}
        </section>
      ))}
      <p className="cat-mgr-next">
        <i className="fas fa-info-circle" style={{ marginRight: 6 }} />
        La prochaine catégorie s'ajoutera sur <strong>{cataloguePagePath(nextPage)}</strong>
        {nextPage > pageCount ? ' (nouvelle page, avec des flèches pour passer d\'une page à l\'autre).' : '.'}
      </p>

      {editor && (
        <CategoryEditor
          category={editor.category}
          categories={sorted}
          onClose={() => setEditor(null)}
          onSaved={async () => { setEditor(null); await onChanged() }}
        />
      )}
    </>
  )
}

function CategoryEditor({ category, categories, onClose, onSaved }) {
  const isEdit = !!category
  const [title, setTitle] = useState(isEdit ? categoryTitle(category) : '')
  const [description, setDescription] = useState(category?.description || '')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(category?.image_url || null)
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const titleRef = useRef(null)

  useEffect(() => { titleRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !saving) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saving, onClose])

  const wanted = normalizeCategoryTitle(title)
  const taken = !!wanted && categories.some(c => c.id !== category?.id && [c.name, c.label].filter(Boolean).map(normalizeCategoryTitle).includes(wanted))
  const problems = {
    title: !title.trim() ? 'Le titre est obligatoire.' : taken ? 'Ce titre est déjà utilisé par une autre catégorie.' : '',
    description: !description.trim() ? 'La description est obligatoire.' : '',
    image: !imagePreview ? 'La photo est obligatoire.' : '',
  }
  const show = key => (tried || (key === 'title' && taken)) && problems[key]

  async function save() {
    setTried(true)
    setError('')
    if (Object.values(problems).some(Boolean)) return
    setSaving(true)
    let uploaded = null
    try {
      const label = title.replace(/\s+/g, ' ').trim()
      const name = categoryKeyFromTitle(label)
      if (imageFile) uploaded = await uploadPhoto(imageFile)
      const image_url = uploaded || category?.image_url
      if (isEdit) {
        await must(supabase.from('categories').update({ name, label, description: description.trim(), image_url }).eq('id', category.id))
        // The category key is stored on each article: follow a rename.
        if (name !== category.name) {
          await must(supabase.from('materials').update({ category: name }).eq('category', category.name))
          await must(supabase.from('products').update({ category: name }).eq('category', category.name))
        }
        if (uploaded && category.image_url) await removeStorageImg(category.image_url)
      } else {
        const position = categories.reduce((max, c) => Math.max(max, c.position ?? -1), -1) + 1
        await must(supabase.from('categories').insert({ name, label, description: description.trim(), image_url, position }))
      }
      await onSaved()
    } catch (e) {
      if (uploaded) await removeStorageImg(uploaded)
      setError(e.status === 409 ? 'Ce titre est déjà utilisé par une autre catégorie.' : `Enregistrement impossible : ${e.message || e}`)
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ display: 'flex' }} onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <div className="modal-card cat-mgr-modal" role="dialog" aria-modal="true" aria-labelledby="cat-editor-title">
        <button className="modal-close" onClick={onClose} disabled={saving} aria-label="Fermer"><i className="fas fa-times" /></button>
        <h3 className="modal-title" id="cat-editor-title">
          <i className={`fas ${isEdit ? 'fa-pen' : 'fa-folder-plus'}`} style={{ marginRight: 8, color: 'var(--rose-gold)' }} />
          {isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </h3>

        {error && <div className="mat-form-problem" role="alert"><i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />{error}</div>}

        <div className="adm-form-group">
          <label htmlFor="cat-title">Titre <span className="req">*</span></label>
          <input
            id="cat-title"
            ref={titleRef}
            className="adm-input"
            value={title}
            maxLength={60}
            placeholder="ex : Art de la table"
            onChange={e => setTitle(e.target.value)}
            aria-invalid={!!show('title')}
            aria-describedby={show('title') ? 'cat-title-err' : undefined}
            style={show('title') ? { borderColor: 'var(--danger)' } : undefined}
          />
          {show('title') && <p className="cat-mgr-err" id="cat-title-err">{problems.title}</p>}
          {isEdit && categoryKeyFromTitle(title) !== category.name && !problems.title && (
            <p className="cat-mgr-hint">Les articles de cette catégorie suivront le nouveau titre.</p>
          )}
        </div>

        <div className="adm-form-group">
          <label htmlFor="cat-desc">Description <span className="req">*</span></label>
          <textarea
            id="cat-desc"
            className="adm-input"
            rows={3}
            maxLength={220}
            value={description}
            placeholder="Affichée au survol de la vignette"
            onChange={e => setDescription(e.target.value)}
            aria-invalid={!!show('description')}
            style={show('description') ? { borderColor: 'var(--danger)', resize: 'vertical' } : { resize: 'vertical' }}
          />
          {show('description') && <p className="cat-mgr-err">{problems.description}</p>}
        </div>

        <ImagePicker
          label="Photo"
          required
          invalid={!!show('image')}
          preview={imagePreview}
          onFile={(file, preview) => { setImageFile(file); setImagePreview(preview) }}
          onRemove={() => { setImageFile(null); setImagePreview(null) }}
        />
        {show('image') && <p className="cat-mgr-err" style={{ marginTop: -10 }}>{problems.image}</p>}

        <div className="mat-form-actions">
          <button type="button" className="adm-btn-primary" onClick={save} disabled={saving}>
            {saving ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: 8 }} />Enregistrement…</> : <><i className="fas fa-save" style={{ marginRight: 8 }} />{isEdit ? 'Enregistrer' : 'Créer la catégorie'}</>}
          </button>
          <button type="button" className="adm-btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
