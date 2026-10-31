import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { slugify } from '../../lib/slug.js'
import { MEDIA_LIMIT } from '../../lib/realisations.js'

const empty = () => ({ title: '', slug: '', summary: '', body: '', cover: '', media: [] })

async function request(method = 'GET', body) {
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch('/api/realisations', {
    method,
    headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || 'Chargement impossible. Réessayez.')
  return result.data
}

export default function RealisationsManager() {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const editorRef = useRef(null)

  async function load() {
    setError('')
    try { setItems(await request()); setLoaded(true) } catch (e) { setError(e.message) }
  }
  useEffect(() => { load() }, [])

  function edit(item) {
    if (draft && !window.confirm('Abandonner les modifications en cours ?')) return
    setDraft(item ? { ...item, media: item.media.map(m => ({ ...m })) } : empty())
    setError(''); setMessage('')
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  function change(key, value) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  async function upload(files, cover = false) {
    if (!files.length) return
    setBusy(true); setError(''); setMessage('')
    try {
      if (!cover && draft.media.length + files.length > 40) throw new Error('Maximum 40 médias par réalisation. Retirez un média avant d’en ajouter.')
      for (const file of files) {
        if (file.size > MEDIA_LIMIT) throw new Error(`${file.name} : maximum 10 Mo par fichier.`)
        const video = ['video/mp4', 'video/webm'].includes(file.type)
        if (!(video && !cover) && !['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.type)) throw new Error('Choisissez une image JPG, PNG, WebP, AVIF, GIF ou une vidéo MP4 / WebM.')
        const path = `realisations/${crypto.randomUUID()}.${file.name.split('.').pop().toLowerCase()}`
        const { error } = await supabase.storage.from('realisations').upload(path, file)
        if (error) throw error
        const src = supabase.storage.from('realisations').getPublicUrl(path).data.publicUrl
        setDraft(d => cover ? { ...d, cover: src } : { ...d, media: [...d.media, { type: video ? 'video' : 'image', src, caption: '' }] })
      }
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const saved = await request(draft.id ? 'PUT' : 'POST', draft)
      setItems(list => [saved, ...list.filter(item => item.id !== saved.id)])
      setDraft(null); setMessage('Réalisation enregistrée et publiée sur le site.')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function remove(item) {
    if (!window.confirm(`Supprimer « ${item.title} » du site ?`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      await request('DELETE', { id: item.id })
      setItems(list => list.filter(i => i.id !== item.id))
      setMessage('Réalisation supprimée du site.')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return <div className="mat-form-card">
    <p>Ajoutez vos événements avec une couverture, un récit, des photos et des vidéos. L’enregistrement publie la fiche et l’ajoute à l’accueil.</p>
    {error && <div role="alert" className="alert alert-danger">{error}{!loaded && <button type="button" className="adm-btn-ghost" onClick={load}>Réessayer</button>}</div>}
    {message && <p role="status">{message}</p>}
    {!loaded ? <p role="status">Chargement des réalisations…</p> : <>
      {!draft && <button className="adm-btn-primary" type="button" disabled={busy} onClick={() => edit(null)}>Ajouter une réalisation</button>}
      {draft && <form onSubmit={save}>
        <h3 tabIndex={-1} ref={editorRef}>{draft.id ? 'Modifier la réalisation' : 'Nouvelle réalisation'}</h3>
        <fieldset disabled={busy}>
          <div className="adm-form-group"><label htmlFor="real-title">Titre *</label><input id="real-title" className="adm-input" required maxLength={150} value={draft.title} onChange={e => {
            const title = e.target.value
            setDraft(d => ({ ...d, title, slug: !d.id && (!d.slug || d.slug === slugify(d.title)) ? slugify(title) : d.slug }))
          }} /></div>
          <div className="adm-form-group"><label htmlFor="real-slug">Adresse de la fiche *</label><input id="real-slug" className="adm-input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={180} value={draft.slug} onChange={e => change('slug', e.target.value)} aria-describedby="real-slug-help" /><p id="real-slug-help">/nos-realisations/{draft.slug || 'nom-de-votre-evenement'}{draft.id && ' — Modifier cette adresse rendra l’ancien lien inaccessible.'}</p></div>
          <div className="adm-form-group"><label htmlFor="real-summary">Courte description *</label><textarea id="real-summary" className="adm-input" required rows={3} maxLength={400} value={draft.summary} onChange={e => change('summary', e.target.value)} /></div>
          <div className="adm-form-group"><label htmlFor="real-body">Récit de l’événement *</label><textarea id="real-body" className="adm-input" required rows={9} maxLength={20000} value={draft.body} onChange={e => change('body', e.target.value)} /><p>Séparez les paragraphes par une ligne vide.</p></div>
          <div className="adm-form-group"><label htmlFor="real-cover">Photo de couverture *</label>{draft.cover && <div className="realisation-editor-media"><img src={draft.cover} alt="Couverture sélectionnée" /></div>}<input id="real-cover" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={e => { upload(Array.from(e.target.files || []), true); e.target.value = '' }} /></div>
          <div className="adm-form-group"><label htmlFor="real-media">Ajouter des photos ou vidéos</label><p>JPG, PNG, WebP, AVIF, GIF, MP4 ou WebM. Maximum 10 Mo par fichier et 40 médias par fiche. Pour une vidéo parlée, ajoutez sa transcription dans le récit.</p><input id="real-media" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm" onChange={e => { upload(Array.from(e.target.files || [])); e.target.value = '' }} /></div>
          {draft.media.map((m, i) => <div key={m.src + i} className="realisation-editor-media">
            {m.type === 'video' ? <video src={m.src} controls preload="metadata" /> : <img src={m.src} alt="Photo sélectionnée" />}
            <label htmlFor={`real-caption-${i}`}>Légende {i + 1}</label><input id={`real-caption-${i}`} className="adm-input" maxLength={300} value={m.caption} onChange={e => change('media', draft.media.map((entry, n) => n === i ? { ...entry, caption: e.target.value } : entry))} />
            <button type="button" className="adm-btn-delete btn-sm" onClick={() => change('media', draft.media.filter((_, n) => n !== i))}>Retirer ce média</button>
          </div>)}
          <div className="realisation-editor-actions"><button className="adm-btn-primary" type="submit">Enregistrer et publier</button><button className="adm-btn-ghost" type="button" onClick={() => { if (window.confirm('Abandonner les modifications en cours ?')) setDraft(null) }}>Annuler</button></div>
        </fieldset>
        {busy && <p role="status">Enregistrement en cours…</p>}
      </form>}
      {!draft && <div className="realisation-admin-list">{!items.length && <p>Aucune réalisation publiée. Ajoutez votre premier événement.</p>}{items.map(item => <article key={item.id} className="realisation-admin-item"><img src={item.cover} alt="" /><h3>{item.title}</h3><p>{item.summary}</p><div className="realisation-editor-actions"><a href={`/nos-realisations/${item.slug}`} target="_blank" rel="noreferrer" className="adm-btn-ghost">Voir la fiche</a><button type="button" className="adm-btn-ghost" disabled={busy} onClick={() => edit(item)}>Modifier</button><button type="button" className="adm-btn-delete" disabled={busy} onClick={() => remove(item)}>Supprimer</button></div></article>)}</div>}
    </>}
  </div>
}
