import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'
import LoadingSpinner from './components/LoadingSpinner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import KakaoCallback from './pages/KakaoCallback'
import GoogleCallback from './pages/GoogleCallback'
import EventTypeCreate from './pages/EventTypeCreate'
import AvailabilitySettings from './pages/AvailabilitySettings'
import MyBookings from './pages/MyBookings'
import BookingPage from './pages/BookingPage'
import BookingConfirm from './pages/BookingConfirm'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* OAuth callbacks — no navbar */}
        <Route path="/kakao-callback" element={<KakaoCallback />} />
        <Route path="/google-callback" element={<GoogleCallback />} />

        {/* Public booking pages — no navbar */}
        <Route path="/:username/:slug" element={<BookingPage />} />
        <Route path="/:username/:slug/confirm" element={<BookingConfirm />} />

        {/* App pages with navbar */}
        <Route
          path="/*"
          element={
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/event-types/new" element={<PrivateRoute><EventTypeCreate /></PrivateRoute>} />
                <Route path="/event-types/:id/edit" element={<PrivateRoute><EventTypeCreate /></PrivateRoute>} />
                <Route path="/availability" element={<PrivateRoute><AvailabilitySettings /></PrivateRoute>} />
                <Route path="/bookings" element={<PrivateRoute><MyBookings /></PrivateRoute>} />
              </Routes>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
