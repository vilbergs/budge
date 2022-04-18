import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import e from 'express'
import * as React from 'react'
import { useState } from 'react'

import {
  createTransaction,
  TransactionType,
  TransactionFrequency,
} from '~/models/transaction.server'
import { requireUserId } from '~/session.server'
import { classNames, format as formatDate } from '~/utils'

type ActionData = {
  errors?: {
    title?: string
    amount?: string
    type?: string
    date?: string
  }
}

type LoaderData = {
  transactionTypes: TransactionType[]
  transactionFrequencies: TransactionFrequency[]
  transactionColors: Record<TransactionFrequency | TransactionType, string>
}

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserId(request)

  const formData = await request.formData()
  const title = formData.get('title')
  const amount = Number(formData.get('amount'))
  const dateString = formData.get('date')
  const transactionType = formData.get('type') as TransactionType
  const transactionFrequency = formData.get('frequency') as TransactionFrequency

  if (typeof title !== 'string' || title.length === 0) {
    return json<ActionData>(
      { errors: { title: 'Title is required' } },
      { status: 400 }
    )
  }

  if (isNaN(amount) || amount === 0) {
    return json<ActionData>(
      { errors: { amount: 'Transaction amount cannot be 0' } },
      { status: 400 }
    )
  }

  if (
    typeof transactionType !== 'string' ||
    !TransactionType[transactionType]
  ) {
    return json<ActionData>(
      { errors: { amount: 'A transaction type must be selected' } },
      { status: 400 }
    )
  }

  if (
    typeof transactionFrequency !== 'string' ||
    !TransactionFrequency[transactionFrequency]
  ) {
    return json<ActionData>(
      { errors: { amount: 'A transaction frequency must be selected' } },
      { status: 400 }
    )
  }

  let date: Date
  if (typeof dateString !== 'string' || dateString.length === 0) {
    return json<ActionData>(
      { errors: { date: 'Invalid date' } },
      { status: 400 }
    )
  }

  try {
    date = new Date(dateString)
  } catch (e) {
    return json<ActionData>(
      {
        errors: {
          date: 'Could not construct date from given date, check that the date was correctly formatted ',
        },
      },
      { status: 400 }
    )
  }

  return await createTransaction({
    title,
    amount,
    date,
    type: transactionType,
    frequency: transactionFrequency,
    userId,
  })
}

export const loader: LoaderFunction = async ({ request }) => {
  const transactionColors = {
    [TransactionType.EXPENSE]: 'red',
    [TransactionType.INCOME]: 'green',
    [TransactionFrequency.FIXED]: 'blue',
    [TransactionFrequency.VARIABLE]: 'yellow',
  }

  return json<LoaderData>({
    transactionTypes: Object.values(TransactionType),
    transactionFrequencies: Object.values(TransactionFrequency),
    transactionColors,
  })
}

export default function NewTransactionPage() {
  const actionData = useActionData() as ActionData
  const { transactionTypes, transactionFrequencies, transactionColors } =
    useLoaderData() as LoaderData
  const [transactionType, setTransactionType] = useState<TransactionType>(
    transactionTypes[0]
  )
  const [transactionFrequency, setTransactionFrequency] =
    useState<TransactionFrequency>(transactionFrequencies[1]) // Start with variable
  const titleRef = React.useRef<HTMLInputElement>(null)
  const amountRef = React.useRef<HTMLInputElement>(null)
  const dateRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (actionData?.errors?.title) {
      titleRef.current?.focus()
    } else if (actionData?.errors?.amount) {
      amountRef.current?.focus()
    }
  }, [actionData])

  return (
    <Form method="post" className=" space-y-4">
      <div className="flex gap-10">
        <div className="flex flex-col gap-2">
          <h3>Type</h3>
          <div className="flex gap-2">
            <input type="hidden" name="type" value={transactionType} />
            {transactionTypes.map((type) => (
              <button
                key={type}
                onClick={(e) => {
                  e.preventDefault()
                  setTransactionType(type)
                }}
                className={classNames(
                  transactionType === type
                    ? `border-${transactionColors[type]}-900 bg-${transactionColors[type]}-200 text-${transactionColors[type]}-900`
                    : 'border-gray-600 bg-transparent text-gray-600',
                  'rounded-full border  px-3 py-1 text-xs font-semibold'
                )}
              >
                {type.toLocaleLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span>Frequency</span>
          <div className="flex gap-2">
            <input
              type="hidden"
              name="frequency"
              value={transactionFrequency}
            />
            {transactionFrequencies.map((frequency) => (
              <button
                key={frequency}
                onClick={(e) => {
                  e.preventDefault()
                  setTransactionFrequency(frequency)
                }}
                className={classNames(
                  transactionFrequency === frequency
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
      </div>

      <div className="flex-1">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <div className="mt-1">
            <input
              ref={titleRef}
              id="title"
              name="title"
              className="block h-8 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              aria-invalid={actionData?.errors?.title ? true : undefined}
              aria-errormessage={
                actionData?.errors?.title ? 'title-error' : undefined
              }
            />
          </div>
        </div>
        {actionData?.errors?.title && (
          <div className="pt-1 text-xs text-red-700" id="title-error">
            {actionData.errors.title}
          </div>
        )}
      </div>

      <div className="flex-1">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Amount
          </label>
          <div className="mt-1">
            <input
              className="block h-8 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              type="number"
              step="any"
              ref={amountRef}
              name="amount"
              aria-invalid={actionData?.errors?.amount ? true : undefined}
              aria-errormessage={
                actionData?.errors?.amount ? 'amount-error' : undefined
              }
            />
          </div>
        </div>
        {actionData?.errors?.amount && (
          <div className="pt-1 text-xs text-red-700" id="title-error">
            {actionData.errors.amount}
          </div>
        )}
      </div>

      <div className="flex-1">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Date
          </label>
          <div className="mt-1">
            <input
              className="block h-8 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              type="date"
              ref={dateRef}
              name="date"
              defaultValue={formatDate(new Date(), 'yyyy-MM-dd')}
              aria-invalid={actionData?.errors?.date ? true : undefined}
              aria-errormessage={
                actionData?.errors?.date ? 'date-error' : undefined
              }
            />
          </div>
        </div>
        {actionData?.errors?.date && (
          <div className="pt-1 text-xs text-red-700" id="title-error">
            {actionData.errors.date}
          </div>
        )}
      </div>

      <button
        type="submit"
        className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
      >
        Save
      </button>
    </Form>
  )
}
