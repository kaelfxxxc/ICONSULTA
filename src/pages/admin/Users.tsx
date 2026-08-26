import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  useAdminUsers,
  useUpdateUserRole,
  useUpdateUserStatus,
} from '../../hooks/useAdminUsers'
import { ADMIN_USERS_PAGE_SIZE } from '../../services/analytics.service'
import {
  Avatar,
  Badge,
  EmptyState,
  Loader,
  PageHeader,
  SectionCard,
} from '../../components/common'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  UsersIcon,
} from '../../components/common/icons'
import { DEPARTMENT_LABEL, ROLE_LABEL } from '../../utils/constants'
import { cn } from '../../lib/utils'
import type { Role, UserStatus } from '../../types'

const ROLE_FILTERS: { value: Role | 'all'; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'student', label: 'Students' },
  { value: 'instructor', label: 'Instructors' },
  { value: 'admin', label: 'Admins' },
]

const STATUS_TONE: Record<UserStatus, 'green' | 'red' | 'gray'> = {
  active: 'green',
  suspended: 'red',
  inactive: 'gray',
}

export default function AdminUsers() {
  const [role, setRole] = useState<Role | 'all'>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useAdminUsers({ role, search, page })
  const updateStatus = useUpdateUserStatus()
  const updateRole = useUpdateUserRole()

  const rows = data?.rows ?? []
  const count = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(count / ADMIN_USERS_PAGE_SIZE))

  function submitSearch(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput.trim())
  }

  function toggleStatus(id: string, current: UserStatus) {
    updateStatus.mutate({
      id,
      status: current === 'active' ? 'suspended' : 'active',
    })
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage accounts, roles, and access across the platform."
      />

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="relative min-w-[240px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </form>
        <select
          value={role}
          onChange={(e) => {
            setPage(1)
            setRole(e.target.value as Role | 'all')
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {ROLE_FILTERS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <SectionCard bodyClassName="p-0">
        {isLoading ? (
          <div className="p-6">
            <Loader />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            hint="Try adjusting your search or role filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Department</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={u.name}
                          src={u.profile_picture_url}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-800">
                            {u.name}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          updateRole.mutate({
                            id: u.id,
                            role: e.target.value as Role,
                          })
                        }
                        disabled={updateRole.isPending}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-brand-400"
                      >
                        {(['student', 'instructor', 'admin'] as Role[]).map(
                          (r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {u.department ? DEPARTMENT_LABEL[u.department] : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => toggleStatus(u.id, u.status)}
                        disabled={updateStatus.isPending}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-50',
                          u.status === 'active'
                            ? 'text-red-600 ring-red-200 hover:bg-red-50'
                            : 'text-emerald-600 ring-emerald-200 hover:bg-emerald-50',
                        )}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
            <span className="text-slate-500">
              {count} user{count === 1 ? '' : 's'}
              {isFetching && ' · updating…'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
