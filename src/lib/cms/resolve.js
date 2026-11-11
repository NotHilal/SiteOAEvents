import { FAQ_GROUPS } from '../seo/landings.js'
import { getCmsPage } from './schema.js'

// Pure helpers (no DB): usable by the public pages, the API and the admin.

const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)))

// Defaults that live outside the schema file (shared with other pages).
const EXTRA_DEFAULTS = {
  faq: { groups: { items: FAQ_GROUPS.map(g => ({ h: g.h, items: g.items.map(i => ({ q: i.q, a: i.a, home: !!i.home })) })) } },
}

export function pageDefaults(pageId) {
  const page = getCmsPage(pageId)
  if (!page) return {}
  const out = {}
  for (const s of page.sections) {
    out[s.id] = {}
    for (const f of s.fields) out[s.id][f.id] = clone(EXTRA_DEFAULTS[pageId]?.[s.id]?.[f.id] ?? f.default)
  }
  return out
}

export function sectionDefaults(pageId, sectionId) {
  return pageDefaults(pageId)[sectionId] || {}
}

// Content saved by the previous editors (Site > Images / À propos), used
// until the page is saved once from the new editor.
export const LEGACY_KEYS = {
  home: ['images_home', 'home_categories_style'],
  about: ['about_page'],
  contact: ['images_contact'],
}

// The À propos text first seeded in the database (Île-de-France era), never
// edited since: the current copy (schema defaults) replaces it. A text edited
// by hand in the old editor differs from it and is kept.
const SEEDED_ABOUT = {
  headline: "Location et décoration d'événements en Île-de-France",
  story: "OA Événementiel est née en 2026 d'une conviction simple : chaque réception mérite un décor à la hauteur de ce qu'elle célèbre. Installée à Chanteloup-les-Vignes, dans les Yvelines, l'entreprise accompagne particuliers et professionnels partout en Île-de-France.\n\nMariages, anniversaires, baptêmes, séminaires ou soirées d'entreprise : nous louons le mobilier, la vaisselle et la décoration de vos événements, et nous pouvons aussi les imaginer, les coordonner et les installer de A à Z. Vous composez votre sélection en ligne, nous livrons, montons et reprenons le matériel.\n\nUne question, un projet ? Écrivez-nous à contact@oa-evenementiel.fr, nous vous répondons rapidement.",
}

export function legacyToContent(pageId, legacy = {}) {
  const parse = raw => { try { return typeof raw === 'string' ? JSON.parse(raw) : raw || null } catch { return null } }
  const out = {}
  if (pageId === 'home') {
    const images = parse(legacy.images_home)
    const colors = parse(legacy.home_categories_style)
    if (images?.univers_1) out.banner = { image: images.univers_1 }
    if (colors) out.categories = { ...(colors.textColor && { textColor: colors.textColor }), ...(colors.hoverColor && { hoverColor: colors.hoverColor }) }
  }
  if (pageId === 'about') {
    const a = parse(legacy.about_page)
    if (a) {
      out.header = { ...(a.headerImg && { image: a.headerImg }) }
      const edited = key => a[key] && a[key].trim() !== SEEDED_ABOUT[key]
      out.intro = { ...(edited('headline') && { headline: a.headline }), ...(edited('story') && { story: a.story }), ...(a.photoUrl && { photo: a.photoUrl }) }
      if (Array.isArray(a.counters)) out.counters = { items: a.counters.filter(c => c && (c.count || c.label)) }
      if (Array.isArray(a.values) && a.values.length === 4) out.values = { items: a.values }
    }
  }
  if (pageId === 'contact') {
    const images = parse(legacy.images_contact)
    if (images?.page_header) out.header = { image: images.page_header }
  }
  return out
}

const isEmpty = v => v == null || (typeof v === 'string' && !v.trim())

function resolveField(field, value, fallback) {
  if (field.type === 'list') {
    const list = Array.isArray(value) ? value : fallback
    if (!Array.isArray(list)) return []
    return list.map(item => {
      const o = {}
      for (const sub of field.fields) o[sub.id] = resolveField(sub, item?.[sub.id], sub.type === 'list' ? [] : sub.default)
      return o
    })
  }
  if (value === undefined) return clone(fallback)
  if (field.type === 'toggle') return value === true
  if (field.required && isEmpty(value)) return clone(fallback)
  return value
}

// defaults ← legacy ← saved: the content the public page renders.
export function resolveContent(pageId, saved, legacy) {
  const page = getCmsPage(pageId)
  if (!page) return {}
  const defaults = pageDefaults(pageId)
  const layers = [legacy ? legacyToContent(pageId, legacy) : {}, saved && typeof saved === 'object' ? saved : {}]
  const out = {}
  for (const s of page.sections) {
    out[s.id] = {}
    for (const f of s.fields) {
      let value
      for (const layer of layers) if (layer?.[s.id]?.[f.id] !== undefined) value = layer[s.id][f.id]
      out[s.id][f.id] = resolveField(f, value, defaults[s.id][f.id])
    }
  }
  return out
}

// ---- Validation of what the admin saves --------------------------------

export class CmsError extends Error {
  constructor(message) { super(message); this.status = 400 }
}

const HEX = /^#[0-9a-f]{6}$/i
// Uploaded photos, files from /public, or https photos (Unsplash…).
const IMAGE = /^(\/uploads\/[a-zA-Z0-9_./-]+|\/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp|avif|gif)|https:\/\/[^\s"'<>()]+)$/i
const URL_RE = /^https?:\/\/[^\s"'<>]+$/i

function sanitizeField(field, value, where) {
  const label = `${where} › ${field.label}`
  switch (field.type) {
    case 'list': {
      if (!Array.isArray(value)) throw new CmsError(`${label} : liste invalide.`)
      const min = field.min ?? 0
      const max = field.max ?? 50
      if (value.length < min || value.length > max) {
        throw new CmsError(min === max ? `${label} : exactement ${min} élément(s).` : `${label} : entre ${min} et ${max} élément(s).`)
      }
      return value.map((item, i) => {
        const o = {}
        for (const sub of field.fields) o[sub.id] = sanitizeField(sub, item?.[sub.id], `${label} ${i + 1}`)
        return o
      })
    }
    case 'toggle':
      return value === true
    case 'color': {
      const v = String(value ?? '').trim()
      if (v && !HEX.test(v)) throw new CmsError(`${label} : couleur invalide.`)
      return v || field.default
    }
    case 'image': {
      const v = String(value ?? '').trim()
      if (v && !IMAGE.test(v)) throw new CmsError(`${label} : photo invalide.`)
      if (!v && field.required) return field.default
      return v
    }
    case 'url': {
      const v = String(value ?? '').trim()
      if (v && !URL_RE.test(v)) throw new CmsError(`${label} : l'adresse doit commencer par https://`)
      return v.slice(0, 500)
    }
    default: {
      const v = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
      const max = field.max ?? 2000
      if (v.length > max) throw new CmsError(`${label} : ${max} caractères maximum.`)
      if (!v && field.required) throw new CmsError(`${label} : ce champ est obligatoire.`)
      return v
    }
  }
}

// Keeps only the schema's fields, checked and trimmed.
export function sanitizeContent(pageId, input) {
  const page = getCmsPage(pageId)
  if (!page) throw Object.assign(new CmsError('Page inconnue.'), { status: 404 })
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new CmsError('Contenu invalide.')
  const out = {}
  for (const s of page.sections) {
    out[s.id] = {}
    for (const f of s.fields) {
      const value = input[s.id]?.[f.id]
      out[s.id][f.id] = sanitizeField(f, value === undefined ? pageDefaults(pageId)[s.id][f.id] : value, s.label)
    }
  }
  return out
}

// Questions of the FAQ page also shown on the home page.
// `path` locates the question in the FAQ page (live preview).
export function homeFaqItems(faqContent) {
  return (faqContent?.groups?.items || []).flatMap((g, gi) => (g.items || []).map((item, i) => ({ ...item, path: `groups.items.${gi}.items.${i}` }))).filter(i => i.home)
}

// "*mot*" → [{ text, em }] for titles with an italic gold word.
export function emphasisParts(text) {
  return String(text || '').split(/(\*[^*]+\*)/).filter(Boolean).map(part =>
    part.length > 2 && part.startsWith('*') && part.endsWith('*') ? { text: part.slice(1, -1), em: true } : { text: part, em: false })
}

// Strips the *emphasis* markers (for plain-text uses: SEO, aria…).
export function plainText(text) {
  return String(text || '').replace(/\*([^*]+)\*/g, '$1')
}
