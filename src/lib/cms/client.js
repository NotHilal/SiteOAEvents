import { createContext, createElement, Fragment, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/router'
import { emphasisParts, resolveContent } from './resolve.js'
import { SITE } from '../site.js'

// Public side of the page editor.
//
// - useCmsContent(page, initial): the page's content. In the admin's live
//   preview (the site loaded in an iframe of /admin/contenu), the unsaved
//   draft sent by the editor replaces it as you type.
// - cms(page, path): data-cms attribute marking an editable element; in the
//   preview, clicking it opens the matching field in the editor.

export const CMS_SOURCE = 'oa-cms'
export const CMS_ADMIN_SOURCE = 'oa-cms-admin'

// ---- Draft overrides pushed by the editor ------------------------------
const drafts = {}
const listeners = new Set()
const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn) }
function setDraft(page, content) {
  drafts[page] = content
  for (const fn of listeners) fn()
}

let previewMode = null
export function isPreview() {
  if (previewMode !== null) return previewMode
  if (typeof window === 'undefined') return false
  try {
    previewMode = window.parent !== window && window.parent.location.origin === window.location.origin && window.parent.location.pathname.startsWith('/admin')
  } catch {
    previewMode = false
  }
  return previewMode
}

export function useCmsContent(pageId, initial) {
  const draft = useSyncExternalStore(subscribe, () => drafts[pageId], () => undefined)
  return draft || initial || resolveContent(pageId)
}

export function cms(pageId, path) {
  return { 'data-cms': `${pageId}:${path}` }
}

// "*mot*" → <em>mot</em> (titles with an italic gold word).
export function Emph({ text }) {
  return emphasisParts(text).map((p, i) => (p.em ? createElement('em', { key: i }, p.text) : createElement(Fragment, { key: i }, p.text)))
}

// ---- Content shared by every page (header, footer, coordinates) --------
const GlobalContext = createContext(null)
let globalCache = null

export function CmsGlobalProvider({ initial, children }) {
  const [fetched, setFetched] = useState(globalCache)
  useEffect(() => {
    if (initial) { globalCache = initial; return }
    if (globalCache) { setFetched(globalCache); return }
    let alive = true
    fetch('/api/page-content?page=global')
      .then(r => (r.ok ? r.json() : null))
      .then(json => { if (json?.data && alive) { globalCache = json.data; setFetched(json.data) } })
      .catch(() => {})
    return () => { alive = false }
  }, [initial])
  return createElement(GlobalContext.Provider, { value: initial || fetched || globalCache }, children)
}

export function useCmsGlobal() {
  return useCmsContent('global', useContext(GlobalContext))
}

// Phone / e-mail shown on the site: the editor's value, else src/lib/site.js.
export function useSiteContact() {
  const { contact } = useCmsGlobal()
  return { ...contact, phone: contact.phone || SITE.phone, email: contact.email || SITE.email }
}

export const telHref = phone => `tel:${String(phone).replace(/[^\d+]/g, '')}`

// ---- Preview bridge (mounted once in _app) -----------------------------
const PREVIEW_CSS = `
.cc-banner{display:none!important}
[data-cms]{cursor:pointer;transition:outline-color .15s;outline:2px dashed transparent;outline-offset:4px}
[data-cms]:hover{outline-color:rgba(179,141,71,.85)}
[data-cms].oa-cms-flash{outline:2px solid #b38d47;outline-offset:4px;animation:oaCmsFlash 1.4s ease-out}
@keyframes oaCmsFlash{0%{outline-color:#b38d47;box-shadow:0 0 0 8px rgba(179,141,71,.25)}100%{box-shadow:0 0 0 0 rgba(179,141,71,0)}}
`

function post(message) {
  try { window.parent.postMessage({ source: CMS_SOURCE, ...message }, window.location.origin) } catch {}
}

function findTarget(target) {
  const all = document.querySelectorAll('[data-cms]')
  // Exact field first, then any element of the same section.
  for (const el of all) if (el.getAttribute('data-cms') === target) return el
  const prefix = target.split('.')[0]
  for (const el of all) if (el.getAttribute('data-cms').startsWith(`${prefix}.`)) return el
  for (const el of all) if (el.getAttribute('data-cms').startsWith(target)) return el
  return null
}

export function CmsPreviewBridge() {
  const router = useRouter()

  useEffect(() => {
    if (!isPreview()) return
    const style = document.createElement('style')
    style.textContent = PREVIEW_CSS
    document.head.appendChild(style)

    const onMessage = event => {
      if (event.origin !== window.location.origin || event.data?.source !== CMS_ADMIN_SOURCE) return
      const { type } = event.data
      if (type === 'content' && event.data.page && event.data.content) setDraft(event.data.page, event.data.content)
      if (type === 'highlight' && event.data.target) {
        // Wait for React to render the new draft first.
        requestAnimationFrame(() => {
          const el = findTarget(event.data.target)
          if (!el) return
          const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3
          if (window.__lenis) window.__lenis.scrollTo(Math.max(0, top), { duration: 0.6 })
          else window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
          el.classList.remove('oa-cms-flash')
          void el.offsetWidth
          el.classList.add('oa-cms-flash')
        })
      }
    }
    // Clicking an editable element opens its field instead of following links.
    const onClick = event => {
      const el = event.target instanceof Element && event.target.closest('[data-cms]')
      if (!el) return
      event.preventDefault()
      event.stopPropagation()
      post({ type: 'focus', target: el.getAttribute('data-cms') })
    }
    window.addEventListener('message', onMessage)
    document.addEventListener('click', onClick, true)
    post({ type: 'ready', path: window.location.pathname })
    return () => {
      window.removeEventListener('message', onMessage)
      document.removeEventListener('click', onClick, true)
      style.remove()
    }
  }, [])

  useEffect(() => {
    if (!isPreview()) return
    const onRoute = url => post({ type: 'ready', path: String(url).split(/[?#]/)[0] })
    router.events.on('routeChangeComplete', onRoute)
    return () => router.events.off('routeChangeComplete', onRoute)
  }, [router.events])

  return null
}
