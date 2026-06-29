import { useEffect, useState } from 'react'

export default function Loader() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500)
    const onLoad = () => { clearTimeout(timer); setTimeout(() => setVisible(false), 300) }
    window.addEventListener('load', onLoad)
    return () => { clearTimeout(timer); window.removeEventListener('load', onLoad) }
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
