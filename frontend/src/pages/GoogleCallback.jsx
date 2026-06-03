import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoadingSpinner from '../components/LoadingSpinner'

export default function GoogleCallback() {
  const [params] = useSearchParams()
  const { refreshUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const success = params.get('success')
    if (success === 'true') {
      refreshUser().finally(() => navigate('/dashboard', { replace: true }))
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <LoadingSpinner />
      <p style={{ color: 'var(--subtext-mid)' }}>구글 캘린더 연동 중...</p>
    </div>
  )
}
