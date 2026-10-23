import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

/**
 * Cancel page — the user cancelled the checkout. No payment was made.
 */
export default async function PagamentoCancelado() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
            <XCircle className="h-8 w-8 text-rose-600" />
          </div>
          <CardTitle className="text-xl">Pagamento cancelado</CardTitle>
          <CardDescription>
            O processo de pagamento foi cancelado. Nenhum valor foi cobrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Voltar à página inicial</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
