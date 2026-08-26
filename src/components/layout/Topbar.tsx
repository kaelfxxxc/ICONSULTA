import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/authContext'
import { ROLE_LABEL } from '../../utils/constants'
import { cn } from '../../lib/utils'
import {
  Avatar,
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  SearchIcon,
} from '../common'
import { NotificationBell } from '../../features/notifications/NotificationBell'
import type { Role } from '../../types'

export function Topbar({
  role,
  showSearch,
  searchTo,
  onMenuClick,
}: {
  role: Role
  showSearch: boolean
  searchTo: string
  onMenuClick: () => void
}) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `${searchTo}?q=${encodeURIComponent(q)}` : searchTo)
  }

  function handleSignOut() {
    void signOut().then(() => navigate('/login', { replace: true }))
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      {showSearch ? (
        <form onSubmit={handleSearch} className="mx-auto w-full max-w-xl">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search faculty, departments, or topics…"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </form>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100"
          >
            <Avatar name={profile?.name} size="sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-4 text-slate-800">
                {profile?.name ?? 'Account'}
              </span>
              <span className="block text-xs text-slate-500">
                {ROLE_LABEL[role]}
              </span>
            </span>
            <ChevronDownIcon
              className={cn(
                'hidden h-4 w-4 text-slate-400 transition sm:block',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-800">
                    {profile?.name}
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {profile?.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
