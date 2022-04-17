import type { LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, Link, NavLink, Outlet, useLoaderData } from '@remix-run/react'

import { requireUserId } from '~/session.server'
import { classNames } from '~/utils'
import { getTransactionListItems } from '~/models/transaction.server'
import { Fragment } from 'react'

type LoaderData = {
  transactions: Awaited<ReturnType<typeof getTransactionListItems>>
}

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUserId(request)
  const transactions = await getTransactionListItems({ userId })
  return json<LoaderData>({ transactions })
}

export default function NotesPage() {
  const { transactions } = useLoaderData() as LoaderData

  const byDate = {
    Today: transactions,
    Yesterday: transactions,
    'April 3rd': transactions,
  }

  return (
    <>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <p className="text-sm text-gray-700">
            A list of all your transactions grouped by date
          </p>
        </div>
        <div className=" sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/transactions/new"
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            Add Transaction
          </Link>
        </div>
      </div>
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full">
                <thead className="bg-white">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Amount
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Frequency
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                    >
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Object.entries(byDate).map(([date, transactions]) => (
                    <Fragment key={date}>
                      <tr className="border-t border-gray-200">
                        <th
                          colSpan={5}
                          scope="colgroup"
                          className="bg-gray-50 px-4 py-2 text-left text-sm font-semibold text-gray-900 sm:px-6"
                        >
                          {date}
                        </th>
                      </tr>
                      {transactions.map((transaction, personIdx) => (
                        <tr
                          key={transaction.id}
                          className={classNames(
                            personIdx === 0
                              ? 'border-gray-300'
                              : 'border-gray-200',
                            'border-t'
                          )}
                        >
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {transaction.title}
                          </td>
                          <td
                            className={classNames(
                              transaction.type === 'EXPENSE'
                                ? 'text-red-700'
                                : 'text-green-700',
                              'whitespace-nowrap px-3 py-4 text-sm '
                            )}
                          >
                            {transaction.type === 'EXPENSE' ? '-' : '+'}
                            {transaction.amount}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {transaction.type}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {transaction.frequency}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              to={`/transactions/${transaction.id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                              <span className="sr-only">
                                , {transaction.title}
                              </span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
