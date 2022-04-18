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

const sumTransactionsByType = (
  transactions: Pick<Transaction, 'amount' | 'type'>[]
) =>
  transactions.reduce(
    (map: Record<TransactionType, currency>, transaction) => {
      const amount = currency(transaction.amount.toString())

      switch (transaction.type) {
        case TransactionType.EXPENSE:
          map[TransactionType.EXPENSE] =
            map[TransactionType.EXPENSE].add(amount)

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
  const end = new Date()
  const start = subYears(end, 1)

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

      map[month].total = map[month][TransactionType.INCOME].subtract(
        map[month][TransactionType.EXPENSE]
      )

      return map
    },
    {}
  )

  const today = new Date()
  const thirtyDaysFromToday = subDays(today, 30)
  const previousThirtyDays = subDays(thirtyDaysFromToday, 30)

  const transactionsFromLastThirtyDays = transactions.filter((transaction) =>
    isWithinInterval(new Date(transaction.date), {
      start: thirtyDaysFromToday,
      end: today,
    })
  )

  const transactionsFromPreviusThirtyDays = transactions.filter((transaction) =>
    isWithinInterval(new Date(transaction.date), {
      start: previousThirtyDays,
      end: thirtyDaysFromToday,
    })
  )

  const calculateChange = (original: currency, newAmount: currency) => {
    const change = newAmount.subtract(original).divide(original).multiply(100)

    const changeType = change.value >= 0 ? 'increase' : 'decrease'

    return {
      change: `${change.value}%`,
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
        sumOfLastThirtyDays.EXPENSE
      ),
    },
    {
      name: 'Total Income',
      stat: sumOfLastThirtyDays.INCOME,
      previousStat: sumOfPreviousThirtyDays.INCOME,
      ...calculateChange(
        sumOfPreviousThirtyDays.INCOME,
        sumOfLastThirtyDays.INCOME
      ),
    },
    {
      name: 'Total Result',
      stat: sumOfLastThirtyDays.INCOME.subtract(sumOfLastThirtyDays.EXPENSE),
      previousStat: sumOfPreviousThirtyDays.INCOME.subtract(
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
    <div className="space-y-4 p-4 sm:p-8">
      <h3 className="text-lg font-medium leading-6 text-gray-900">
        Last 30 days
      </h3>
      <dl className="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-y-0 md:divide-x">
        {stats.map((item) => (
          <div key={item.name} className="px-4 py-5 sm:p-6">
            <dt className="text-base font-normal text-gray-900">{item.name}</dt>
            <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
              <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
                {item.stat}
                <span className="ml-2 text-sm font-medium text-gray-500">
                  from {item.previousStat}
                </span>
              </div>

              <div
                className={classNames(
                  item.changeType === 'increase'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800',
                  'inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0'
                )}
              >
                {item.changeType === 'increase' ? (
                  <ArrowSmUpIcon
                    className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-500"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowSmDownIcon
                    className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-red-500"
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

      <div className="overflow-hidden rounded-md bg-white shadow">
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
                {}
                <Amount amount={total} />
              </li>
            )
          )}
        </ul>
      </div>
    </div>
  )
}