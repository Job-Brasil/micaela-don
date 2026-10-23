import { db } from '../src/lib/db'
await db.pixConfig.updateMany({ where: {}, data: { approved: true, published: true } })
await db.paymentConfig.updateMany({ where: {}, data: { approved: true, published: true } })
console.log('configs activated')
await db.$disconnect()
