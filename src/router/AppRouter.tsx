import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/authContext'
import { Loader } from '../components/common'
import { DashboardLayout, ProtectedRoute } from '../components/layout'
import { ROLE_HOME } from '../utils/constants'

import Login from '../pages/Login'
import ForgotPassword from '../pages/ForgotPassword'
import NotFound from '../pages/Notfound'
import Settings from '../pages/Settings'
import VideoSession from '../pages/session/VideoSession'

import StudentDashboard from '../pages/student/Dashboard'
import StudentAppointments from '../pages/student/Appointments'
import BookSession from '../pages/student/BookSession'
import StudentSchedule from '../pages/student/Schedule'
import StudentDepartments from '../pages/student/Departments'
import StudentAnalytics from '../pages/student/Analytics'

import InstructorDashboard from '../pages/instructor/Dashboard'
import InstructorRequests from '../pages/instructor/Requests'
import InstructorSchedule from '../pages/instructor/Schedule'
import InstructorHistory from '../pages/instructor/History'

import AdminDashboard from '../pages/admin/Dashboard'
import AdminAnalytics from '../pages/admin/Analytics'
import AdminUsers from '../pages/admin/Users'
import AdminDepartments from '../pages/admin/Departments'
import AdminSchedule from '../pages/admin/Schedule'

/** Redirect signed-in users away from the auth screens to their home. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loader label="Loading…" />
  if (session)
    return <Navigate to={profile ? ROLE_HOME[profile.role] : '/student'} replace />
  return <>{children}</>
}

/** `/` → role home, or the login screen when signed out. */
function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loader label="Loading…" />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={profile ? ROLE_HOME[profile.role] : '/student'} replace />
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/login/admin"
        element={
          <PublicOnly>
            <Login variant="admin" />
          </PublicOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnly>
            <ForgotPassword />
          </PublicOnly>
        }
      />

      {/* Video room — any authenticated party, no dashboard chrome */}
      <Route
        path="/session/:appointmentId"
        element={
          <ProtectedRoute>
            <VideoSession />
          </ProtectedRoute>
        }
      />

      {/* Student */}
      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="appointments" element={<StudentAppointments />} />
        <Route path="appointments/new" element={<BookSession />} />
        <Route path="schedule" element={<StudentSchedule />} />
        <Route path="departments" element={<StudentDepartments />} />
        <Route path="analytics" element={<StudentAnalytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Instructor */}
      <Route
        path="/instructor"
        element={
          <ProtectedRoute role="instructor">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<InstructorDashboard />} />
        <Route path="requests" element={<InstructorRequests />} />
        <Route path="schedule" element={<InstructorSchedule />} />
        <Route path="history" element={<InstructorHistory />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="departments" element={<AdminDepartments />} />
        <Route path="schedule" element={<AdminSchedule />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
