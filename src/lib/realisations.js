import { slugify } from './slug.js'

export const REALISATION_PREFIX = 'realisation:'
export const MEDIA_LIMIT = 10 * 1024 * 1024

// New editorial content only: legacy gallery photos are kept in their own row.
export function validateRealisation(input) {
  const text = (key, max) => typeof input?.[key] === 'string' ? input[key].trim().slice(0, max) : ''
  const title = text('title', 150)
  const slug = text('slug', 180)
  const summary = text('summary', 400)
  const body = text('body', 20000)
  const cover = text('cover', 500)
  const localMedia = value => typeof value === 'string' && /^\/uploads\/[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+$/.test(value)
  const image = value => localMedia(value) && /\.(jpe?g|png|webp|avif|gif)$/i.test(value)
  if (!title || !summary || !body || !slug || slugify(slug) !== slug || !image(cover)) {
    throw new Error('Renseignez le titre, une adresse valide, la description, le texte et une photo de couverture.')
  }
  if (!Array.isArray(input.media) || input.media.length > 40) throw new Error('Maximum 40 médias par réalisation.')
  const media = input.media.map(item => {
    if (!item || !['image', 'video'].includes(item.type) || !(item.type === 'image' ? image(item.src) : localMedia(item.src) && /\.(mp4|webm)$/i.test(item.src))) {
      throw new Error('Média invalide. Utilisez une photo ou une vidéo MP4 / WebM téléversée sur le site.')
    }
    return { type: item.type, src: item.src, caption: String(item.caption || '').trim().slice(0, 300) }
  })
  return { title, slug, summary, body, cover, media }
}
