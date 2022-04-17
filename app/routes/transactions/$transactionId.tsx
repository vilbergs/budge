import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useCatch, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

import type { Transaction } from "~/models/transaction.server";
import { deleteTransaction } from "~/models/transaction.server";
import { getTransaction } from "~/models/transaction.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  transaction: Transaction;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.transactionId, "transactionId not found");

  const transaction = await getTransaction({
    userId,
    id: params.transactionId,
  });
  if (!transaction) {
    throw new Response("Not Found", { status: 404 });
  }
  return json<LoaderData>({ transaction });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.transactionId, "transactionId not found");

  await deleteTransaction({ userId, id: params.transactionId });

  return redirect("/transactions");
};

export default function TransactionDetailsPage() {
  const data = useLoaderData() as LoaderData;

  return (
    <div>
      <h3 className="text-2xl font-bold">{data.transaction.title}</h3>
      <p className="py-6">{data.transaction.amount}</p>
      <hr className="my-4" />
      <Form method="post">
        <button
          type="submit"
          className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
        >
          Delete
        </button>
      </Form>
    </div>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  return <div>An unexpected error occurred: {error.message}</div>;
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return <div>Transaction not found</div>;
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}
