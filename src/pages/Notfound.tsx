import { Link } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { ROLE_HOME } from '../utils/constants'
import { Brand } from '../components/layout'

export default function NotFound() {
  const { profile } = useAuth()
  const home = profile ? ROLE_HOME[profile.role] : '/login'

  return (
    <div className="bg-dotted flex min-h-full flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <Brand />
      <p className="mt-4 text-6xl font-black tracking-tight text-navy-900">404</p>
      <h1 className="text-xl font-semibold text-slate-800">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-500">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <Link
        to={home}
        className="mt-2 rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        Back to safety
      </Link>
    </div>
  )
}
