import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { storage } from '../utils/storage'
import { api } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function KakaoCallback() {
  const [params] = useSearchParams()
  const { setUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (!token) { navigate('/'); return }

    storage.setToken(token)
    api.get('/users/me')
      .then((user) => { setUser(user); navigate('/dashboard', { replace: true }) })
      .catch(() => navigate('/'))
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <LoadingSpinner />
      <p style={{ color: 'var(--subtext-mid)' }}>로그인 처리 중...</p>
    </div>
  )
}
