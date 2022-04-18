import { Prisma, TransactionType, TransactionFrequency } from '@prisma/client'
import type { User, Transaction } from '@prisma/client'

import { prisma } from '~/db.server'

import { format as formatDate } from '~/utils'

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

export function getTransactionListItems({
  userId,
  start,
  end,
}: {
  userId: User['id']
  start?: Date
  end?: Date
}) {
  let date: { gte?: Date; lte?: Date } = {}

  if (start) {
    date.gte = start
  }

  if (end) {
    date.lte = end
  }

  return prisma.transaction.findMany({
    where: { userId, date },
    select: {
      id: true,
      title: true,
      amount: true,
      type: true,
      frequency: true,
      date: true,
    },
    orderBy: { date: 'desc' },
  })
}

export function createTransaction({
  title,
  amount,
  date,
  type,
  frequency,
  userId,
}: Pick<Transaction, 'title' | 'type' | 'frequency' | 'date'> & {
  amount: number
  userId: User['id']
}) {
  return prisma.transaction.create({
    data: {
      title,
      amount: new Prisma.Decimal(amount),
      date,
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

export function updateTransaction({
  id,
  title,
  amount,
  date,
  type,
  frequency,
}: Pick<Transaction, 'id' | 'title' | 'type' | 'frequency' | 'date'> & {
  amount: number
}) {
  return prisma.transaction.update({
    where: { id },
    data: {
      title,
      amount: new Prisma.Decimal(amount),
      date,
      type,
      frequency,
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
