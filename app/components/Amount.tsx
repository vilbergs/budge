import type { Transaction } from '@prisma/client'
import { Prisma, TransactionType } from '@prisma/client'
import { classNames } from '~/utils'
import currency from 'currency.js'

interface AmountProps {
  transaction?: Pick<Transaction, 'type' | 'amount'>
  amount?: number | currency
}

const sign = {
  [TransactionType.EXPENSE]: '-',
  [TransactionType.INCOME]: '+',
}

const colorClass = {
  [TransactionType.EXPENSE]: 'text-red-500',
  [TransactionType.INCOME]: 'text-green-500',
}

export default function Amount({ transaction, amount = 0 }: AmountProps) {
  const decimalAmount = currency(
    transaction && transaction.amount ? (transaction.amount as any) : amount
  ).format({ symbol: '' })

  const colorBasedOnAmount =
    amount < 0 ? colorClass['EXPENSE'] : colorClass['INCOME']

  return transaction ? (
    <span
      className={classNames(colorClass[transaction.type] || 'text-gray-800')}
    >{`${sign[transaction.type] || ''}${decimalAmount}`}</span>
  ) : (
    <span className={classNames(colorBasedOnAmount || 'text-gray-800')}>
      {decimalAmount}
    </span>
  )
}
