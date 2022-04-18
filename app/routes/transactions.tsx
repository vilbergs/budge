import type { LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, Link, NavLink, Outlet, useLoaderData } from '@remix-run/react'

import { requireUserId } from '~/session.server'
import { classNames, isToday, isYesterday, format as formatDate } from '~/utils'
import {
  getTransactionListItems,
  Transaction,
  TransactionType,
  TransactionFrequency,
} from '~/models/transaction.server'

import { Fragment, useEffect, useState } from 'react'
import Amount from '~/components/Amount'
import Math from '~/components/Math'
import currency from 'currency.js'

import { PlusSmIcon } from '@heroicons/react/outline'

type LoaderData = {
  transactions: Awaited<ReturnType<typeof getTransactionListItems>>
  transactionTypes: TransactionType[]
  transactionFrequencies: TransactionFrequency[]
  transactionColors: Record<TransactionFrequency | TransactionType, string>
}

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request)
  const transactions = await getTransactionListItems({ userId })
  const transactionColors = {
    [TransactionType.EXPENSE]: 'red',
    [TransactionType.INCOME]: 'green',
    [TransactionFrequency.FIXED]: 'blue',
    [TransactionFrequency.VARIABLE]: 'yellow',
  }

  return json<LoaderData>({
    transactions,
    transactionTypes: Object.values(TransactionType),
    transactionFrequencies: Object.values(TransactionFrequency),
    transactionColors,
  })
}

const aggregateTransactions = (transactions: Partial<Transaction>[]) => {
  return transactions.reduce((total, transaction) => {
    return transaction.type === 'EXPENSE'
      ? total.subtract(transaction.amount as any)
      : total.add(transaction.amount as any)
  }, currency(0))
}

export default function NotesPage() {
  const {
    transactions,
    transactionTypes,
    transactionFrequencies,
    transactionColors,
  } = useLoaderData() as LoaderData
  const [filteredTransactions, setFilteredTransactions] = useState(transactions)
  const [filter, setFilter] = useState<{
    type: TransactionType[]
    frequency: TransactionFrequency[]
  }>({
    type: [],
    frequency: [],
  })

  useEffect(() => {
    setFilteredTransactions(
      transactions.filter((t) => {
        const typeFilter = filter.type.includes(t.type)
        const frequencyFilter = filter.frequency.includes(t.frequency)

        return (
          Object.values(filter).every((f) => f.length === 0) ||
          typeFilter ||
          frequencyFilter
        )
      })
    )
  }, [transactions, filter, filter.type, filter.frequency])

  const byDate = filteredTransactions.reduce(
    (
      map: Record<
        string,
        Pick<
          Transaction,
          'title' | 'date' | 'amount' | 'id' | 'type' | 'frequency'
        >[]
      >,
      transaction
    ) => {
      const date = new Date(transaction.date)

      if (isToday(date)) {
        if (map['Today']) {
          map['Today'].push(transaction)
        } else {
          map['Today'] = [transaction]
        }

        return map
      }

      if (isYesterday(date)) {
        if (map['Yesterday']) {
          map['Yesterday'].push(transaction)
        } else {
          map['Yesterday'] = [transaction]
        }

        return map
      }

      const dateKey = formatDate(date, 'MMMM do yyyy')

      if (map[dateKey]) {
        map[dateKey].push(transaction)
      } else {
        map[dateKey] = [transaction]
      }

      return map
    },
    {}
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white sm:flex-row">
      <div className="block overflow-auto rounded-xl bg-white p-5 shadow ring-1 ring-black ring-opacity-5 sm:hidden">
        <Outlet />
      </div>
      <div className="basis flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="p-5">
          <h1 className="text-xl font-semibold text-gray-800">Transactions</h1>
          <div className="my-3 space-x-2">
            {transactionTypes.map((type) => (
              <button
                key={type}
                onClick={() =>
                  setFilter({
                    ...filter,
                    type: filter.type.includes(type)
                      ? filter.type.filter((fType) => fType !== type)
                      : [...filter.type, type],
                  })
                }
                className={classNames(
                  filter.type.includes(type)
                    ? `border-${transactionColors[type]}-900 bg-${transactionColors[type]}-200 text-${transactionColors[type]}-900`
                    : 'border-gray-600 bg-transparent text-gray-600',
                  'rounded-full border  px-3 py-1 text-xs font-semibold'
                )}
              >
                {type.toLocaleLowerCase()}
              </button>
            ))}
            {transactionFrequencies.map((frequency) => (
              <button
                key={frequency}
                onClick={() =>
                  setFilter({
                    ...filter,
                    frequency: filter.frequency.includes(frequency)
                      ? filter.frequency.filter(
                          (filterFrequency) => filterFrequency !== frequency
                        )
                      : [...filter.frequency, frequency],
                  })
                }
                className={classNames(
                  filter.frequency.includes(frequency)
                    ? `border-${transactionColors[frequency]}-900 bg-${transactionColors[frequency]}-200 text-${transactionColors[frequency]}-900`
                    : 'border-gray-600 bg-transparent text-gray-600',
                  'rounded-full border px-3 py-1 text-xs font-semibold  '
                )}
              >
                {frequency.toLocaleLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden items-center justify-between p-2 px-4 sm:flex">
          <Link
            to="/transactions/new"
            className="inline-flex items-center rounded-full border border-transparent bg-indigo-600 p-3 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusSmIcon className="h-6 w-6" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex min-h-0 w-full flex-1 flex-col bg-white sm:w-96">
          <nav
            className="flex h-full flex-1 flex-col overflow-y-auto"
            aria-label="Directory"
          >
            {Object.entries(byDate).map(([date, transactions]) => (
              <div key={date} className="relative">
                <div className="sticky top-0 z-10 flex justify-between border-t border-b border-gray-200 bg-gray-50 px-6 py-1 text-sm font-medium text-gray-500">
                  <h3>{date}</h3>
                  <Amount amount={aggregateTransactions(transactions)} />
                </div>
                <ul className="relative z-0 divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <li key={transaction.id} className="bg-white">
                      <div className="relative flex items-center space-x-3 px-6 py-5 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 hover:bg-gray-50">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/transactions/${transaction.id}`}
                            className="flex justify-between focus:outline-none"
                          >
                            {/* Extend touch target to entire panel */}
                            <span
                              className="absolute inset-0"
                              aria-hidden="true"
                            />
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.title}
                            </p>
                            <p className="truncate text-sm text-gray-500">
                              <Amount transaction={transaction} />
                            </p>
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
      <div className="hidden w-full bg-gray-100 p-10 sm:flex">
        <div className="flex-1 overflow-auto rounded-xl bg-white p-5 shadow ring-1 ring-black ring-opacity-5">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
