import { useEffect, useState } from 'react'

export default function Loader() {
  const [visible, setVisible] = useState(true)

  // The overlay fades itself out in CSS (it used to wait for window "load"
  // and then for React to hide it, covering a ready page for seconds).
  useEffect(() => {
    let done = false
    const hide = () => { if (!done) { done = true; setVisible(false) } }
    // The CSS fade (style.css #overlayer) finishes at ~0.8s; this just
    // removes the nodes afterwards.
    const timer = setTimeout(hide, 900)
    return () => { done = true; clearTimeout(timer) }
  }, [])

  if (!visible) return null

  return (
    <>
      <div id="overlayer" />
      <div className="loader">
        <div className="loader-ring" />
      </div>
    </>
  )
}
