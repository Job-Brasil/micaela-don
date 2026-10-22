import { getPublicSite } from '@/lib/public-data'
import { PublicSite } from '@/components/public-site'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const data = await getPublicSite()
  return <PublicSite initial={data} />
}
