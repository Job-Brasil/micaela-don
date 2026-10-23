import { getPublicSite } from '@/lib/public-data'
import { PublicSite } from '@/components/public-site'

export const dynamic = 'force-dynamic'

// The home route serves the default campaign (Micaela) for backward compatibility.
// Other campaigns are served at /{slug}.
export default async function Home() {
  const data = await getPublicSite('micaela')
  return <PublicSite initial={data} />
}
