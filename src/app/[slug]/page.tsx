import { notFound } from 'next/navigation'
import { getPublicSite, getCampaignIdBySlug } from '@/lib/public-data'
import { PublicSite } from '@/components/public-site'

export const dynamic = 'force-dynamic'

// Reserved slugs that should NOT be treated as campaigns (they conflict with
// Next.js internal routes or API routes).
const RESERVED_SLUGS = new Set(['api', 'admin', '_next', 'favicon.ico', 'icon.svg', 'robots.txt', 'sitemap.xml', 'pagamento'])

type Params = { params: Promise<{ slug: string }> }

export default async function CampaignPage({ params }: Params) {
  const { slug } = await params
  if (RESERVED_SLUGS.has(slug)) {
    notFound()
  }
  const campaignId = await getCampaignIdBySlug(slug)
  if (!campaignId) {
    notFound()
  }
  const data = await getPublicSite(campaignId)
  if (!data.campaign) {
    notFound()
  }
  return <PublicSite initial={data} />
}
