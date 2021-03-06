import { LoaderFunction, redirect } from '@remix-run/node'
import { Link, useLocation, Outlet } from '@remix-run/react'

import { useOptionalUser, useUser } from '~/utils'

import { Fragment, useState } from 'react'
import { Dialog, Menu, Transition } from '@headlessui/react'
import {
  BellIcon,
  CalendarIcon,
  ChartBarIcon,
  FolderIcon,
  SwitchVerticalIcon,
  HomeIcon,
  InboxIcon,
  MenuAlt2Icon,
  UsersIcon,
  XIcon,
} from '@heroicons/react/outline'
import { SearchIcon } from '@heroicons/react/solid'

import { getUser, requireUserId } from '~/session.server'

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request, '/dashboard')

  return redirect('/dashboard')
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
