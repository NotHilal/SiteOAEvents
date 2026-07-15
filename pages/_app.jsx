import '../src/index.css'
import { useEffect } from 'react'

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        // Avoid duplicate script insertion
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = src
        script.async = false // maintains execution order
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load: ${src}`))
        document.body.appendChild(script)
      })
    }

    const loadWebflowEngine = async () => {
      try {
        // Load jQuery first
        await loadScript('https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=686b79afb668ce59a9047b8f')
        
        // Load Webflow dependencies in sequence
        await loadScript('https://cdn.prod.website-files.com/686b79afb668ce59a9047b8f/js/webflow.schunk.b2397b2502f6f17b.js')
        await loadScript('https://cdn.prod.website-files.com/686b79afb668ce59a9047b8f/js/webflow.schunk.8ec9fd06545d0b40.js')
        await loadScript('https://cdn.prod.website-files.com/686b79afb668ce59a9047b8f/js/webflow.schunk.d659be6dcd9af708.js')
        await loadScript('https://cdn.prod.website-files.com/686b79afb668ce59a9047b8f/js/webflow.schunk.8d3482e319db3f9d.js')
        await loadScript('https://cdn.prod.website-files.com/686b79afb668ce59a9047b8f/js/webflow.schunk.3646b0bdbfc7a235.js')
        await loadScript('https://cdn.prod.website-files.com/686b79afb668ce59a9047b8f/js/webflow.7f7d7f6e.bd44278dc0d2c015.js')

        // Initialize Webflow after scripts are fully parsed
        if (window.Webflow) {
          window.Webflow.destroy()
          window.Webflow.ready()
          if (window.Webflow.require('ix2')) {
            window.Webflow.require('ix2').init()
          }
        }
      } catch (err) {
        console.error('Error loading Webflow assets:', err)
      }
    }

    loadWebflowEngine()
  }, [])

  return (
    <>
      <div className="marble-layer" aria-hidden="true" />
      <Component {...pageProps} />
    </>
  )
}
