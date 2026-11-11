import Link from 'next/link'
import Seo from '../src/components/Seo.jsx'
import PageBanner from '../src/components/PageBanner.jsx'
import { SITE } from '../src/lib/site.js'
import { cms, Emph, useCmsContent, useSiteContact } from '../src/lib/cms/client.js'

// Fixed icons for the "Nos valeurs" blocks — same 4 icons reused on the
// homepage's "Pourquoi OA" section. Texts and photos are edited in
// Espace OA > Contenu des pages > À propos (defaults: src/lib/cms/schema.js).
const VALUE_ICONS = ['/return.avif', '/delivery-truck.avif', '/customer-service.avif', '/money-back.avif']

export async function getServerSideProps() {
  const { getPageProps } = await import('../src/lib/cms/server.js')
  return { props: await getPageProps('about') }
}

// The story is plain text: blank lines start a new paragraph and the
// contact address becomes a mailto link. The original address written in the
// text follows the e-mail set in Coordonnées.
function StoryText({ text, email }) {
  return text.split(SITE.email).join(email).split(/\n\s*\n/).map((paragraph, i) => (
    <p className="section-text" key={i}>
      {paragraph.split(email).map((part, j) => (
        <span key={j}>{j > 0 && <a href={`mailto:${email}`}>{email}</a>}{part}</span>
      ))}
    </p>
  ))
}

export default function APropos({ cms: initialContent }) {
  const c = useCmsContent('about', initialContent)
  const { email } = useSiteContact()
  const at = path => cms('about', path)

  return (
    <>
      <Seo
        title={c.seo.title}
        description={c.seo.description}
        path="/a-propos"
        breadcrumb={[{ name: 'À propos', path: '/a-propos' }]}
        preloadImage={c.header.image}
      />

      <div className="site-wrap">
        <PageBanner title={c.header.title} image={c.header.image} editable={at('header.title')} />

        {/* QUI SOMMES-NOUS */}
        <section className="why-choose-us pb-zero">
          <div className="why-us-outer">
            <div className="w-layout-blockcontainer container-small w-container">
              <div className="w-layout-grid why-us-grid">

                <div className="why-us-content-box">
                  <div className="section-title-box why-us-title-box">
                    {c.intro.eyebrow && (
                      <div className="section-subtitle-box">
                        <div className="section-subtitle-icon"></div>
                        <p className="section-subtitle" {...at('intro.eyebrow')}>{c.intro.eyebrow}</p>
                      </div>
                    )}
                    <h2 className="section-title" {...at('intro.headline')}><Emph text={c.intro.headline} /></h2>
                    <div {...at('intro.story')}><StoryText text={c.intro.story} email={email} /></div>
                  </div>
                  {c.counters.items.length > 0 && (
                    <div className="why-us-counter-outer" {...at('counters.items')}>
                      {c.counters.items.map((item, i) => (
                        <div className="counter-block" key={i}>
                          <h2 className="counter-count">{item.count}</h2>
                          <div className="counter-title-box">
                            <div className="counter-dot"></div>
                            <p className="counter-title">{item.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="why-us-image-box" {...at('intro.photo')}>
                  {c.intro.photo ? (
                    <img src={c.intro.photo} alt="OA Événementiel" className="apropos-photo" loading="lazy" decoding="async" />
                  ) : (
                    <div className="apropos-logo-box">
                      <img src="/logo-mark.png" alt="OA Événementiel — Événementiel, location" width="859" height="922" loading="lazy" decoding="async" />
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* NOS VALEURS */}
        <section className="feature-section">
          <div className="w-layout-blockcontainer container w-container">
            <div className="section-title-box" style={{ textAlign: 'center', marginBottom: 40 }}>
              {c.values.eyebrow && (
                <div className="section-subtitle-box" style={{ justifyContent: 'center' }}>
                  <div className="section-subtitle-icon"></div>
                  <p className="section-subtitle" {...at('values.eyebrow')}>{c.values.eyebrow}</p>
                </div>
              )}
              <h2 className="section-title" {...at('values.title')}><Emph text={c.values.title} /></h2>
            </div>
            <div className="w-layout-grid feature-grid">
              {c.values.items.map((v, i) => (
                <div className="feature-block" key={i} {...at(`values.items.${i}`)}>
                  <img src={VALUE_ICONS[i % VALUE_ICONS.length]} loading="lazy" alt="" className="feature-icon" />
                  <h4 style={{ color: 'rgb(0,0,0)' }} className="feature-title">{v.title}</h4>
                  <p style={{ color: 'rgb(0,0,0)' }} className="feature-text">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="apropos-cta-section">
          <div className="container">
            <h2 className="apropos-cta-title" {...at('cta.title')}>{c.cta.title}</h2>
            {c.cta.text && <p className="apropos-cta-text" {...at('cta.text')}>{c.cta.text}</p>}
            <Link href="/contact" className="btn btn-rose-gold" {...at('cta.buttonLabel')}>{c.cta.buttonLabel}</Link>
            <p className="apropos-cta-mail">ou écrivez-nous à <a href={`mailto:${email}`}>{email}</a></p>
          </div>
        </section>
      </div>
    </>
  )
}
