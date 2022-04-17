import { Prisma, TransactionType, TransactionFrequency } from '@prisma/client'
import type { User, Transaction } from '@prisma/client'

import { prisma } from '~/db.server'

export { TransactionType, TransactionFrequency }
export type { Transaction } from '@prisma/client'

export function getTransaction({
  id,
  userId,
}: Pick<Transaction, 'id'> & {
  userId: User['id']
}) {
  return prisma.transaction.findFirst({
    where: { id, userId },
  })
}

export function getTransactionListItems({ userId }: { userId: User['id'] }) {
  return prisma.transaction.findMany({
    where: { userId },
    select: { id: true, title: true, amount: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export function createTransaction({
  title,
  amount,
  type,
  frequency,
  userId,
}: Pick<Transaction, 'title' | 'type' | 'frequency'> & {
  amount: number
  userId: User['id']
}) {
  return prisma.transaction.create({
    data: {
      title,
      amount: new Prisma.Decimal(amount),
      type,
      frequency,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  })
}

export function deleteTransaction({
  id,
  userId,
}: Pick<Transaction, 'id'> & { userId: User['id'] }) {
  return prisma.transaction.deleteMany({
    where: { id, userId },
  })
}
