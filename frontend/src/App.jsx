import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import KakaoCallback from './pages/KakaoCallback'
import GoogleCallback from './pages/GoogleCallback'
import EventTypeCreate from './pages/EventTypeCreate'
import MyBookings from './pages/MyBookings'
import BookingPage from './pages/BookingPage'
import BookingConfirm from './pages/BookingConfirm'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  return user ? children : <Navigate to="/" replace />
}

function NavLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {/* 주의: 정적 경로(/event-types/new 등)는 한 Routes 안에 있어야
          동적 예약 경로(/:username/:slug)보다 높은 우선순위로 매칭된다 */}
      <Routes>
        {/* OAuth callbacks — no navbar */}
        <Route path="/kakao-callback" element={<KakaoCallback />} />
        <Route path="/google-callback" element={<GoogleCallback />} />

        {/* App pages with navbar */}
        <Route element={<NavLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/event-types/new" element={<PrivateRoute><EventTypeCreate /></PrivateRoute>} />
          <Route path="/event-types/:id/edit" element={<PrivateRoute><EventTypeCreate /></PrivateRoute>} />
          <Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
        </Route>

        {/* Public booking pages — no navbar */}
        <Route path="/:username/:slug" element={<BookingPage />} />
        <Route path="/:username/:slug/confirm" element={<BookingConfirm />} />
      </Routes>
    </BrowserRouter>
  )
}
