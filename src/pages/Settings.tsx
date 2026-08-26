import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/authContext'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import type { ProfileUpdate } from '../hooks/useProfile'
import { DEPARTMENTS, ROLE_LABEL } from '../utils/constants'
import { Avatar, Loader, PageHeader, SectionCard } from '../components/common'
import { cn } from '../lib/utils'
import type { Department } from '../types'

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

export default function Settings() {
  const { profile } = useAuth()
  const { data, isLoading } = useProfile()
  const update = useUpdateProfile()

  // users
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  // student
  const [studentId, setStudentId] = useState('')
  const [sDept, setSDept] = useState<Department | ''>('')
  const [yearLevel, setYearLevel] = useState('')
  const [major, setMajor] = useState('')
  // instructor
  const [iDept, setIDept] = useState<Department | ''>('')
  const [category, setCategory] = useState('')
  const [office, setOffice] = useState('')
  const [bio, setBio] = useState('')
  const [specializations, setSpecializations] = useState('')
  const [years, setYears] = useState('')

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    setName(data.user.name ?? '')
    setPhone(data.user.phone ?? '')
    if (data.student) {
      setStudentId(data.student.student_id ?? '')
      setSDept((data.student.department ?? '') as Department | '')
      setYearLevel(data.student.year_level ?? '')
      setMajor(data.student.major ?? '')
    }
    if (data.instructor) {
      setIDept((data.instructor.department ?? '') as Department | '')
      setCategory(data.instructor.category ?? '')
      setOffice(data.instructor.office_location ?? '')
      setBio(data.instructor.bio ?? '')
      setSpecializations(data.instructor.specializations ?? '')
      setYears(
        data.instructor.years_of_experience != null
          ? String(data.instructor.years_of_experience)
          : '',
      )
    }
  }, [data])

  if (isLoading || !data) return <Loader label="Loading your profile…" />

  const role = profile?.role ?? 'student'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    const patch: ProfileUpdate = {
      user: { name: name.trim(), phone: phone.trim() || null },
    }
    if (role === 'student') {
      patch.student = {
        student_id: studentId.trim() || null,
        department: (sDept || null) as Department | null,
        year_level: yearLevel.trim() || null,
        major: major.trim() || null,
      }
    } else if (role === 'instructor') {
      patch.instructor = {
        department: (iDept || null) as Department | null,
        category: category.trim() || null,
        office_location: office.trim() || null,
        bio: bio.trim() || null,
        specializations: specializations.trim() || null,
        years_of_experience: years ? Number(years) : null,
      }
    }
    await update.mutateAsync(patch)
    setSaved(true)
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile and account." />

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SectionCard title="Account">
            <div className="flex flex-col items-center text-center">
              <Avatar name={data.user.name} size="lg" />
              <div className="mt-3 font-semibold text-slate-800">
                {data.user.name}
              </div>
              <div className="text-sm text-slate-500">{data.user.email}</div>
              <span className="mt-2 rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-medium text-navy-800">
                {ROLE_LABEL[role]}
              </span>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Personal information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63…"
                  className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input
                  value={data.user.email}
                  disabled
                  className={cn(inputClass, 'bg-slate-50 text-slate-400')}
                />
              </Field>
            </div>
          </SectionCard>

          {role === 'student' && (
            <SectionCard title="Student details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Student ID">
                  <input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Department">
                  <select
                    value={sDept}
                    onChange={(e) => setSDept(e.target.value as Department | '')}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Year level">
                  <input
                    value={yearLevel}
                    onChange={(e) => setYearLevel(e.target.value)}
                    placeholder="e.g. 3rd Year"
                    className={inputClass}
                  />
                </Field>
                <Field label="Major">
                  <input
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </SectionCard>
          )}

          {role === 'instructor' && (
            <SectionCard title="Faculty details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department">
                  <select
                    value={iDept}
                    onChange={(e) => setIDept(e.target.value as Department | '')}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category / title">
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className={inputClass}
                  />
                </Field>
                <Field label="Office location">
                  <input
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Years of experience">
                  <input
                    type="number"
                    min={0}
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Specializations">
                    <input
                      value={specializations}
                      onChange={(e) => setSpecializations(e.target.value)}
                      placeholder="Comma-separated topics"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Bio">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className={cn(inputClass, 'resize-none')}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>
          )}

          <div className="flex items-center justify-end gap-3">
            {saved && !update.isPending && (
              <span className="text-sm text-emerald-600">Saved.</span>
            )}
            {update.isError && (
              <span className="text-sm text-red-600">
                {(update.error as Error).message}
              </span>
            )}
            <button
              type="submit"
              disabled={update.isPending}
              className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:bg-navy-300"
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
