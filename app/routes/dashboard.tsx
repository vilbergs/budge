import { LoaderFunction, redirect, json } from '@remix-run/node'
import { Link, useLocation, Outlet, useLoaderData } from '@remix-run/react'

import {
  subYears,
  useOptionalUser,
  useUser,
  format as formatDate,
  isWithinInterval,
  isThisYear,
  subDays,
  startOfYear,
  endOfYear,
  classNames,
} from '~/utils'

import { Fragment, useState } from 'react'

import { ArrowSmUpIcon, ArrowSmDownIcon } from '@heroicons/react/outline'

import { requireUserId } from '~/session.server'
import type { Transaction } from '~/models/transaction.server'
import {
  getTransactionListItems,
  TransactionType,
} from '~/models/transaction.server'
import currency from 'currency.js'
import {} from 'date-fns'
import Amount from '~/components/Amount'

interface LoaderData {
  stats: Record<string, any>[]
  transactionSumsByMonth: Record<
    string,
    Record<TransactionType | 'total', currency>
  >
}

type ChangeType =
  | 'positive-increase'
  | 'negative-increase'
  | 'positive-decrease'
  | 'negative-decrease'

const sumTransactionsByType = (
  transactions: Pick<Transaction, 'amount' | 'type'>[]
) =>
  transactions.reduce(
    (map: Record<TransactionType, currency>, transaction) => {
      const amount = currency(transaction.amount.toString())

      switch (transaction.type) {
        case TransactionType.EXPENSE:
          map[TransactionType.EXPENSE] =
            map[TransactionType.EXPENSE].subtract(amount)

          return map
        case TransactionType.INCOME:
          map[TransactionType.INCOME] = map[TransactionType.INCOME].add(amount)

          return map
        default:
          return map
      }
    },
    {
      [TransactionType.EXPENSE]: currency(0),
      [TransactionType.INCOME]: currency(0),
    }
  )

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request, '/dashboard')
  const today = new Date()
  const end = endOfYear(today)
  const start = startOfYear(today)

  const transactions = await getTransactionListItems({
    userId,
    start,
    end,
  })

  const transactionSumsByMonth = transactions.reduce(
    (
      map: Record<string, Record<TransactionType | 'total', currency>>,
      transaction
    ) => {
      const date = new Date(transaction.date)

      if (!isThisYear(date)) {
        return map
      }

      const amount = currency(transaction.amount.toString())
      const month = formatDate(date, 'MMMM')

      if (!map[month]) {
        map[month] = {
          [TransactionType.EXPENSE]: currency(0),
          [TransactionType.INCOME]: currency(0),
          total: currency(0),
        }
      }

      switch (transaction.type) {
        case TransactionType.EXPENSE:
          map[month][TransactionType.EXPENSE] =
            map[month][TransactionType.EXPENSE].subtract(amount)
          break
        case TransactionType.INCOME:
          map[month][TransactionType.INCOME] =
            map[month][TransactionType.INCOME].add(amount)
          break
        default:
          break
      }

      // TODO - Fix the adding negative numbers weirdness. I'mostly doing this out of convenience as the currency objects lose their functionality when they are sent across to the client.
      // We're adding expense to income here as EXPENSE Will be a negative value
      map[month].total = map[month][TransactionType.INCOME].add(
        map[month][TransactionType.EXPENSE]
      )

      return map
    },
    {}
  )

  const thirtyDaysFromToday = subDays(today, 30)
  const previousThirtyDays = subDays(thirtyDaysFromToday, 30)

  const transactionsLastSixtyDays = await getTransactionListItems({
    userId,
    start: previousThirtyDays,
    end: today,
  })

  const transactionsFromLastThirtyDays = transactionsLastSixtyDays.filter(
    (transaction) =>
      isWithinInterval(new Date(transaction.date), {
        start: thirtyDaysFromToday,
        end: today,
      })
  )

  const transactionsFromPreviusThirtyDays = transactionsLastSixtyDays.filter(
    (transaction) =>
      isWithinInterval(new Date(transaction.date), {
        start: previousThirtyDays,
        end: thirtyDaysFromToday,
      })
  )

  const calculateChange = (
    original: currency,
    newAmount: currency,
    type?: TransactionType
  ): {
    change: string
    changeType: ChangeType
  } => {
    const change = newAmount.subtract(original).divide(original).multiply(100)

    let changeType: ChangeType =
      change.value >= 0 ? 'positive-increase' : 'negative-decrease'

    if (type === TransactionType.EXPENSE) {
      changeType = change.value >= 0 ? 'negative-increase' : 'positive-decrease'
    }

    if (type === TransactionType.INCOME) {
      changeType = change.value >= 0 ? 'positive-increase' : 'negative-decrease'
    }

    return {
      change: `${isFinite(change.value) ? change.value : 0}%`,
      changeType,
    }
  }

  const sumOfLastThirtyDays = sumTransactionsByType(
    transactionsFromLastThirtyDays
  )
  const sumOfPreviousThirtyDays = sumTransactionsByType(
    transactionsFromPreviusThirtyDays
  )

  const stats = [
    {
      name: 'Total Expenses',
      stat: sumOfLastThirtyDays.EXPENSE,
      previousStat: sumOfPreviousThirtyDays.EXPENSE,
      ...calculateChange(
        sumOfPreviousThirtyDays.EXPENSE,
        sumOfLastThirtyDays.EXPENSE,
        TransactionType.EXPENSE
      ),
    },
    {
      name: 'Total Income',
      stat: sumOfLastThirtyDays.INCOME,
      previousStat: sumOfPreviousThirtyDays.INCOME,
      ...calculateChange(
        sumOfPreviousThirtyDays.INCOME,
        sumOfLastThirtyDays.INCOME,
        TransactionType.INCOME
      ),
    },
    {
      name: 'Total Result',
      stat: sumOfLastThirtyDays.INCOME.add(sumOfLastThirtyDays.EXPENSE),
      previousStat: sumOfPreviousThirtyDays.INCOME.add(
        sumOfPreviousThirtyDays.EXPENSE
      ),
      ...calculateChange(
        sumOfPreviousThirtyDays.INCOME.subtract(sumOfLastThirtyDays.EXPENSE),
        sumOfLastThirtyDays.INCOME.subtract(sumOfLastThirtyDays.EXPENSE)
      ),
    },
  ]

  return json({
    stats,
    transactionSumsByMonth,
  })
}

export default function Dashboard() {
  const { stats, transactionSumsByMonth } = useLoaderData() as LoaderData

  return (
    <div className="space-y-10 p-4 sm:p-8">
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Last 30 days
        </h3>
        <dl className="mt-4 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-y-0 md:divide-x">
          {stats.map((item) => (
            <div key={item.name} className="px-4 py-5 sm:p-6">
              <dt className="text-base font-normal text-gray-900">
                {item.name}
              </dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-baseline text-2xl font-semibold ">
                  <Amount amount={item.stat} />
                  <span className="ml-2 text-sm font-medium text-gray-500">
                    from {item.previousStat}
                  </span>
                </div>

                <div
                  className={classNames(
                    ['positive-increase', 'positive-decrease'].includes(
                      item.changeType
                    )
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800',
                    'inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0'
                  )}
                >
                  {['positive-increase', 'negative-increase'].includes(
                    item.changeType
                  ) ? (
                    <ArrowSmUpIcon
                      className={classNames(
                        item.changeType === 'positive-increase'
                          ? ' text-green-800'
                          : ' text-red-800',
                        '-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center'
                      )}
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowSmDownIcon
                      className={classNames(
                        item.changeType === 'positive-decrease'
                          ? ' text-green-800'
                          : ' text-red-800',
                        '-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center'
                      )}
                      aria-hidden="true"
                    />
                  )}

                  <span className="sr-only">
                    {item.changeType === 'increase' ? 'Increased' : 'Decreased'}{' '}
                    by
                  </span>
                  {item.change}
                </div>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {new Date().getFullYear()}
        </h3>
        <div className="mt-4 overflow-hidden rounded-md bg-white shadow">
          <ul className="divide-y divide-gray-200">
            {Object.entries(transactionSumsByMonth).map(
              ([month, { EXPENSE, INCOME, total }]) => (
                <li
                  key={month}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <span>{month}</span>
                  <Amount amount={INCOME} />
                  <Amount amount={EXPENSE} />
                  <Amount amount={total} />
                </li>
              )
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
