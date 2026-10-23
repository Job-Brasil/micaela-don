import Link from 'next/link'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

type OrderInfo = {
  status: string
  amount: { toString(): string }
  currency: string
}

/**
 * Success page — shows the CURRENT payment status. Does NOT confirm payment.
 * Only the Stripe webhook can confirm a payment.
 */
export default async function PagamentoSucesso({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  if (!ref) notFound()

  let order: OrderInfo | null = null
  try {
    order = await db.paymentOrder.findUnique({
      where: { internalReference: ref },
      select: { status: true, amount: true, currency: true },
    })
  } catch {
    order = null
  }

  const isPaid = order?.status === 'paid'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            {isPaid ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : (
              <Clock className="h-8 w-8 text-amber-600" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isPaid ? 'Pagamento confirmado' : 'Pagamento em processamento'}
          </CardTitle>
          <CardDescription>
            {isPaid
              ? 'Obrigado pelo seu gesto de apoio. A confirmação foi recebida.'
              : 'Recebemos o seu pedido. A confirmação do pagamento é feita automaticamente via o seu banco/MB WAY e pode demorar alguns minutos. Esta página não confirma o pagamento por si.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {order && (
            <div className="rounded-md bg-muted p-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referência</span>
                <span className="font-mono text-xs">{ref}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <span>{order.amount.toString()} {order.currency}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Estado</span>
                <span className="font-medium">{order.status}</span>
              </div>
            </div>
          )}
          <Button asChild className="w-full">
            <Link href="/">Voltar à página inicial</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
