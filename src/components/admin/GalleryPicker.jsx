import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase.js'

const MAX = 12
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Extra photos of an article (after the main one): shown as thumbnails on
// the product page and in the catalogue quick view. Files upload as soon
// as they are chosen; the list itself is saved with the article.
export default function GalleryPicker({ value, onChange, label = 'Photos supplémentaires' }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(files) {
    const list = [...files]
    if (!list.length) return
    setError('')
    if (value.length + list.length > MAX) { setError(`Maximum ${MAX} photos supplémentaires.`); return }
    setBusy(true)
    const added = []
    try {
      for (const file of list) {
        if (!TYPES.includes(file.type)) throw new Error(`${file.name} : choisissez une image JPG, PNG, WebP ou GIF.`)
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} : image trop lourde (max 5 Mo).`)
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop().toLowerCase()}`
        const { error: uploadError } = await supabase.storage.from('materials').upload(path, file, { upsert: false })
        if (uploadError) throw uploadError
        added.push(supabase.storage.from('materials').getPublicUrl(path).data.publicUrl)
      }
    } catch (err) {
      setError(err.message || 'Envoi impossible. Réessayez.')
    } finally {
      if (added.length) onChange([...value, ...added])
      setBusy(false)
    }
  }

  const move = (i, delta) => {
    const next = [...value]
    const [item] = next.splice(i, 1)
    next.splice(i + delta, 0, item)
    onChange(next)
  }

  return (
    <div className="adm-form-group gal-picker">
      <label>{label} <span className="adm-label-opt">(optionnel, {value.length}/{MAX})</span></label>
      <ul className="gal-list">
        {value.map((src, i) => (
          <li key={src} className="gal-item">
            <img src={src} alt={`Photo ${i + 2}`} />
            <div className="gal-tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Déplacer avant"><i className="fas fa-arrow-left" /></button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Déplacer après"><i className="fas fa-arrow-right" /></button>
              <button type="button" className="is-danger" onClick={() => onChange(value.filter(u => u !== src))} aria-label="Retirer la photo"><i className="fas fa-times" /></button>
            </div>
          </li>
        ))}
        {value.length < MAX && (
          <li>
            <button type="button" className="gal-add" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-plus" />}
              <span>{busy ? 'Envoi…' : 'Ajouter'}</span>
            </button>
          </li>
        )}
      </ul>
      <input ref={inputRef} type="file" multiple accept={TYPES.join(',')} style={{ display: 'none' }} onChange={e => { pick(e.target.files); e.target.value = '' }} />
      {error && <p className="gal-error" role="alert">{error}</p>}
      <p className="gal-hint">La photo principale reste celle du dessus. Ces photos s’affichent en miniatures sur la fiche produit, avec zoom.</p>
    </div>
  )
}
