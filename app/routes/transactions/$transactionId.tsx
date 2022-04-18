import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, Link, useCatch, useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'
import Amount from '~/components/Amount'

import {
  Transaction,
  TransactionFrequency,
  TransactionType,
} from '~/models/transaction.server'
import { deleteTransaction } from '~/models/transaction.server'
import { getTransaction } from '~/models/transaction.server'
import { requireUserId } from '~/session.server'
import { classNames, format as formatDate } from '~/utils'

type LoaderData = {
  transaction: Transaction
  transactionColors: Record<TransactionType | TransactionFrequency, string>
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request)
  invariant(params.transactionId, 'transactionId not found')

  const transaction = await getTransaction({
    userId,
    id: params.transactionId,
  })
  if (!transaction) {
    throw new Response('Not Found', { status: 404 })
  }

  const transactionColors = {
    [TransactionType.EXPENSE]: 'red',
    [TransactionType.INCOME]: 'green',
    [TransactionFrequency.FIXED]: 'blue',
    [TransactionFrequency.VARIABLE]: 'yellow',
  }

  return json<LoaderData>({ transaction, transactionColors })
}

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request)
  invariant(params.transactionId, 'transactionId not found')

  await deleteTransaction({ userId, id: params.transactionId })

  return redirect('/transactions')
}

export default function TransactionDetailsPage() {
  const { transaction, transactionColors } = useLoaderData() as LoaderData

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <div
            className={classNames(
              'rounded-full border  px-3 py-1 text-xs font-semibold',
              `border-${transactionColors[transaction.type]}-900 bg-${
                transactionColors[transaction.type]
              }-200 text-${transactionColors[transaction.type]}-900`
            )}
          >
            {transaction.type.toLocaleLowerCase()}
          </div>
          <div
            className={classNames(
              'rounded-full border  px-3 py-1 text-xs font-semibold',
              `border-${transactionColors[transaction.frequency]}-900 bg-${
                transactionColors[transaction.frequency]
              }-200 text-${transactionColors[transaction.frequency]}-900`
            )}
          >
            {transaction.frequency.toLocaleLowerCase()}
          </div>
        </div>

        <Link
          to={`/transactions/edit/${transaction.id}`}
          className="text-indigo-600 hover:underline"
        >
          Edit
        </Link>
      </div>

      <div>
        <div className="mt-1 mb-0 text-3xl leading-tight text-gray-600">
          {transaction.title}
        </div>
        <div className="text-gray-500">
          {formatDate(new Date(transaction.date), 'MMMM do yyyy')}
        </div>
      </div>

      <div className="flex-1">
        <div className="mt-1 text-2xl">
          <Amount transaction={transaction} />
        </div>
      </div>
    </div>
  )
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error)

  return <div>An unexpected error occurred: {error.message}</div>
}

export function CatchBoundary() {
  const caught = useCatch()

  if (caught.status === 404) {
    return <div>Transaction not found</div>
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`)
}
