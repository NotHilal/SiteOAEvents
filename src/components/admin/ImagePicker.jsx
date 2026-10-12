import { useRef } from 'react'

// Photo field of the article editor (was inline in pages/espace-oa.jsx):
// click-to-choose area with preview, "Choisir" / "Retirer". The file is only
// uploaded when the article is saved.
export default function ImagePicker({ preview, onFile, onRemove, label = 'Image', required = false, invalid = false }) {
  const inputRef = useRef(null)
  function pick(file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image trop lourde (max 5 Mo).'); return }
    const reader = new FileReader()
    reader.onload = e => onFile(file, e.target.result)
    reader.readAsDataURL(file)
  }
  return (
    <div className="adm-form-group" style={{ marginTop: 8 }}>
      <label>{label} {required ? <span className="req">*</span> : <span className="adm-label-opt">(optionnel)</span>}</label>
      <div className="img-upload-area" onClick={() => inputRef.current?.click()} style={invalid ? { borderColor: 'var(--danger)' } : undefined}>
        {preview
          ? <img src={preview} alt="" className="img-preview-thumb" />
          : <div className="img-upload-placeholder"><i className="fas fa-image" /><p>Aucune image sélectionnée</p><span>JPG, PNG, WEBP — max 5 Mo</span></div>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={e => { pick(e.target.files[0]); e.target.value = '' }} />
      <div className="img-upload-btns">
        <button type="button" className="adm-btn-ghost btn-sm" onClick={() => inputRef.current?.click()}><i className="fas fa-upload" style={{ marginRight: 4 }} />Choisir une image</button>
        {preview && <button type="button" className="adm-btn-delete btn-sm" onClick={onRemove}><i className="fas fa-times" style={{ marginRight: 4 }} />Retirer</button>}
      </div>
    </div>
  )
}
