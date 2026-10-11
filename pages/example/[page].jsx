import Head from 'next/head'

// Design references only: saved copies of options.fr pages in
// public/example/, each shown in a full-viewport iframe like /example so
// their Magento CSS/JS can't leak into the site. Excluded from the public
// Navbar/Footer in _app.jsx.
const PAGES = {
  contact: { file: 'contact.html', title: 'options.fr/contacts' },
  // Templates for the catalogue product pages (/catalogue/[slug]):
  'product-single': { file: 'product-single.html', title: 'fiche produit, option unique' },
  'product-multiple': { file: 'product-multiple.html', title: 'fiche produit, options multiples' },
}

export function getStaticPaths() {
  return { paths: Object.keys(PAGES).map(page => ({ params: { page } })), fallback: false }
}

export function getStaticProps({ params }) {
  return { props: { page: params.page } }
}

export default function ExampleReference({ page }) {
  const { file, title } = PAGES[page]
  return (
    <>
      <Head>
        <title>{`Référence — ${title}`}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <iframe
        src={`/example/${file}`}
        title={`Référence ${title}`}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 0, zIndex: 9999, background: '#fff' }}
      />
    </>
  )
}
