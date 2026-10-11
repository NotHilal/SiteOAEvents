import Head from 'next/head'

// Design reference only: a saved copy of options.fr (public/example/options.html),
// shown in a full-viewport iframe so its Magento CSS/JS can't leak into the
// site's own styles. Excluded from the public Navbar/Footer in _app.jsx.
export default function Example() {
  return (
    <>
      <Head>
        <title>Référence — options.fr</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <iframe
        src="/example/options.html"
        title="Référence options.fr"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, zIndex: 9999, background: '#fff' }}
      />
    </>
  )
}
