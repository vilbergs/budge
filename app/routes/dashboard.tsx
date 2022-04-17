import { LoaderFunction, redirect } from '@remix-run/node'
import { Link, useLocation, Outlet } from '@remix-run/react'

import { useOptionalUser, useUser } from '~/utils'

import { Fragment, useState } from 'react'

import { requireUserId } from '~/session.server'

export const loader: LoaderFunction = async ({ request }) => {
  return await requireUserId(request, '/dashboard')
}

export default function Index() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isCurrent = (route: string) => {
    console.log(location, route)
    return location.pathname.includes(route)
  }

  return <>This is just index</>
}
