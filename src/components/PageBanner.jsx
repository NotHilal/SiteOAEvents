import Link from 'next/link'

// Photo banner with the page title and breadcrumb, shared by the inner pages
// (À propos, Contact, Nos réalisations, Catalogue). `editable` marks the
// title for the live preview of Espace OA (data-cms attribute).
export default function PageBanner({ title, image, crumb = title, editable }) {
  return (
    <div className="page-header" style={{ backgroundImage: `url(${JSON.stringify(image)})` }}>
      <div className="page-header-overlay" />
      <div className="container">
        <h1 {...editable}>{title}</h1>
        <nav aria-label="Fil d’Ariane">
          <ol className="breadcrumb justify-content-center">
            <li className="breadcrumb-item"><Link href="/">Accueil</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{crumb}</li>
          </ol>
        </nav>
      </div>
    </div>
  )
}
