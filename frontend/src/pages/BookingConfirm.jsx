import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { storage } from '../utils/storage'
import { useAuth } from '../hooks/useAuth'

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', weekday: 'long',
  })
}

export default function BookingConfirm() {
  const { username, slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const draft = storage.getBookingDraft()
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const [eventType, setEventType] = useState(null)
  const [host, setHost] = useState(null)

  useEffect(() => {
    if (!draft) { navigate(`/${username}/${slug}`); return }
    api.get(`/calendar/slots/${username}/${slug}?date=${draft.slot.start.split('T')[0]}`)
      .then((data) => { setEventType(data.eventType); setHost(data.host) })
  }, [])

  if (!draft) return null

  const requireLogin = !user

  const handleConfirm = async () => {
    if (!user) {
      sessionStorage.setItem('booking_return', `/${username}/${slug}/confirm`)
      window.location.href = `${api.getBackendUrl()}/auth/kakao`
      return
    }

    setError('')
    setLoading(true)
    try {
      const booking = await api.post('/bookings', {
        eventTypeId: draft.eventTypeId,
        startTime: draft.slot.start,
        endTime: draft.slot.end,
        notes,
        location: location || undefined,
      })
      storage.clearBookingDraft()
      setDone(booking)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="max-w-md w-full text-center anim-fade-up">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl"
            style={{ background: 'var(--green-dim)', border: '2px solid rgba(62,207,142,0.3)' }}
          >
            ✓
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--green)' }}>예약 확정!</h1>
          <p className="mb-6" style={{ color: 'var(--subtext-mid)' }}>
            {formatDateTime(done.startTime)}에 예약이 확정되었습니다.<br />
            카카오톡으로 알림을 전송했습니다.
          </p>

          {done.meetLink && (
            <a
              href={done.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mb-4 w-full"
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              🎥 Google Meet 참여 링크
            </a>
          )}

          <div className="flex gap-3">
            <button className="btn-ghost flex-1" onClick={() => navigate('/bookings')}>예약 목록 보기</button>
            <button className="btn-ghost flex-1" onClick={() => navigate('/')}>홈으로</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="max-w-md w-full anim-fade-up">
        <button
          className="btn-ghost mb-6" style={{ fontSize: '0.8rem' }}
          onClick={() => navigate(`/${username}/${slug}`)}
        >
          ← 시간 다시 선택
        </button>

        <div className="p-6 rounded-2xl mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-bold text-lg mb-4" style={{ letterSpacing: '-0.02em' }}>예약 확인</h2>

          <div className="space-y-3 mb-5">
            <InfoRow icon="📋" label="미팅" value={eventType?.title || slug} />
            <InfoRow icon="👤" label="호스트" value={host?.name || username} />
            <InfoRow icon="🕐" label="일시" value={formatDateTime(draft.slot.start)} />
            <InfoRow icon="⏱" label="소요시간" value={`${eventType?.duration || '?'}분`} />
            <InfoRow icon={eventType?.locationType === 'online' ? '💻' : '📍'} label="방식" value={eventType?.locationType === 'online' ? '온라인 (Google Meet 자동 생성)' : '오프라인'} />
          </div>

          <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {eventType?.locationType === 'offline' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">장소</label>
                <input
                  className="form-input"
                  placeholder="미팅 장소를 입력하세요"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5">메모 (선택)</label>
              <textarea
                className="form-input" rows={3} placeholder="미팅 목적이나 준비사항을 적어주세요"
                value={notes} onChange={(e) => setNotes(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {requireLogin && (
          <div
            className="p-4 rounded-xl mb-4 text-sm"
            style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)', color: 'var(--subtext-mid)' }}
          >
            예약하려면 카카오 로그인이 필요합니다.
          </div>
        )}

        {error && <p className="text-sm text-center mb-4" style={{ color: '#f87171' }}>{error}</p>}

        <button className="btn-primary w-full" onClick={handleConfirm} disabled={loading}>
          {loading ? '예약 처리 중...' : requireLogin ? '카카오 로그인 후 예약' : '예약 확정하기'}
        </button>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span style={{ fontSize: '1rem', marginTop: '0.1rem' }}>{icon}</span>
      <div>
        <span className="text-xs font-medium" style={{ color: 'var(--subtext)' }}>{label}</span>
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value}</p>
      </div>
    </div>
  )
}
