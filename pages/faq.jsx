import Seo, { faqLd } from '../src/components/Seo.jsx'
import LandingPage from '../src/components/seo/LandingPage.jsx'
import Faq from '../src/components/seo/Faq.jsx'
import { cms, useCmsContent } from '../src/lib/cms/client.js'

const PATH = '/faq'

export async function getServerSideProps() {
  const { getPageProps } = await import('../src/lib/cms/server.js')
  return { props: await getPageProps('faq') }
}

// Questions edited in Espace OA > Contenu des pages > Questions fréquentes
// (defaults: FAQ_GROUPS in src/lib/seo/landings.js).
export default function FaqPage({ cms: initialContent }) {
  const c = useCmsContent('faq', initialContent)
  // `index` keeps the position in the editor even when empty groups are skipped.
  const groups = c.groups.items.map((g, index) => ({ ...g, index })).filter(g => g.items.length)
  const name = c.intro.title
  return (
    <>
      <Seo
        title={c.seo.title}
        description={c.seo.description}
        path={PATH}
        breadcrumb={[{ name, path: PATH }]}
        jsonLd={faqLd(groups.flatMap(g => g.items))}
      />
      <LandingPage page={{ lead: c.intro.lead }} h1={name} crumbs={[{ name, path: PATH }]} cta={false}>
        {groups.map(g => (
          <div key={g.index} {...cms('faq', `groups.items.${g.index}`)}>
            <Faq items={g.items} title={g.h} itemProps={(_, qi) => cms('faq', `groups.items.${g.index}.items.${qi}`)} />
          </div>
        ))}
      </LandingPage>
    </>
  )
}
