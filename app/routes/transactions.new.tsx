import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import * as React from 'react'

import {
  createTransaction,
  TransactionType,
  TransactionFrequency,
} from '~/models/transaction.server'
import { requireUserId } from '~/session.server'

type ActionData = {
  errors?: {
    title?: string
    amount?: string
    type?: string
  }
}

type LoaderData = {
  transactionTypes: TransactionType[]
}

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserId(request)

  const formData = await request.formData()
  const title = formData.get('title')
  const amount = Number(formData.get('amount'))
  const transactionType = formData.get('type') as TransactionType

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
      { errors: { amount: 'Transaction amount cannot be 0' } },
      { status: 400 }
    )
  }

  const transaction = await createTransaction({
    title,
    amount,
    type: transactionType,
    frequency: TransactionFrequency.FIXED,
    userId,
  })

  return redirect(`/transactions`)
}

export const loader: LoaderFunction = async ({ request }) => {
  return json<LoaderData>({
    transactionTypes: Object.values(TransactionType),
  })
}

export default function NewTransactionPage() {
  const actionData = useActionData() as ActionData
  const { transactionTypes } = useLoaderData() as LoaderData
  const titleRef = React.useRef<HTMLInputElement>(null)
  const amountRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (actionData?.errors?.title) {
      titleRef.current?.focus()
    } else if (actionData?.errors?.amount) {
      amountRef.current?.focus()
    }
  }, [actionData])

  return (
    <Form
      method="post"
      // style={{
      //   display: 'flex',
      //   flexDirection: 'column',
      //   gap: 8,
      //   width: '100%',
      // }}
    >
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="flex w-full flex-col gap-1">
            <span>Title: </span>
            <input
              ref={titleRef}
              name="title"
              className="flex-1 rounded-md border-2 px-3 py-2 text-lg leading-loose"
              aria-invalid={actionData?.errors?.title ? true : undefined}
              aria-errormessage={
                actionData?.errors?.title ? 'title-error' : undefined
              }
            />
          </label>
          {actionData?.errors?.title && (
            <div className="pt-1 text-red-700" id="title-error">
              {actionData.errors.title}
            </div>
          )}
        </div>

        <div>
          <label className="flex w-full flex-col gap-1">
            <span>Amount: </span>
            <input
              type="number"
              ref={amountRef}
              name="amount"
              className="w-full rounded-md border-2  py-2 px-3 text-lg leading-loose"
              aria-invalid={actionData?.errors?.amount ? true : undefined}
              aria-errormessage={
                actionData?.errors?.amount ? 'amount-error' : undefined
              }
            />
          </label>
          {actionData?.errors?.amount && (
            <div className="pt-1 text-red-700" id="amount-error">
              {actionData.errors.amount}
            </div>
          )}
        </div>
      </div>
      <select
        name="type"
        className="w-full rounded-md border-2  py-2 px-3 text-lg leading-loose"
      >
        {transactionTypes.map((type) => (
          <option key={type} value={type}>
            {type.toLowerCase()}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
      >
        Save
      </button>
    </Form>
  )
}
