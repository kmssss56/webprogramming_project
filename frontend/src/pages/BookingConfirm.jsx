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

  const isPoll = Boolean(draft?.poll)
  const firstStart = isPoll ? draft?.slots?.[0]?.start : draft?.slot?.start

  useEffect(() => {
    if (!draft) { navigate(`/${username}/${slug}`); return }
    api.get(`/calendar/slots/${username}/${slug}?date=${firstStart.split('T')[0]}`)
      .then((data) => { setEventType(data.eventType); setHost(data.host) })
  }, [])

  if (!draft) return null

  const requireLogin = !user
  const isSelf = Boolean(user && host && user.username === host.username)

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
        ...(isPoll
          ? { proposedTimes: draft.slots.map((s) => ({ start: s.start, end: s.end })) }
          : { startTime: draft.slot.start, endTime: draft.slot.end }),
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
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full text-center anim-fade-up">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--green-dim)', border: '2px solid rgba(16,185,129,0.3)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L19 7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--green)' }}>
            {done.status === 'pending' ? '조율 요청 전송!' : '예약 확정!'}
          </h1>
          <p className="mb-6 text-sm sm:text-base" style={{ color: 'var(--subtext-mid)' }}>
            {done.status === 'pending' ? (
              <>호스트에게 가능한 시간을 보냈어요.<br />호스트가 시간을 확정하면 카카오톡으로 알려드려요.</>
            ) : (
              <>{formatDateTime(done.startTime)}에 예약이 확정되었습니다.<br />카카오톡으로 알림을 전송했습니다.</>
            )}
          </p>
          {done.meetLink && (
            <a
              href={done.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mb-4 w-full"
              style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M17 9.5l5-2v9l-5-2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
              Google Meet 참여 링크
            </a>
          )}
          <div className="flex gap-3">
            <button className="btn-ghost flex-1 text-sm" onClick={() => navigate('/bookings')}>미팅 목록</button>
            <button className="btn-ghost flex-1 text-sm" onClick={() => navigate('/')}>홈으로</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full anim-fade-up">
        <button
          className="btn-ghost mb-6" style={{ fontSize: '0.8rem' }}
          onClick={() => navigate(`/${username}/${slug}`)}
        >
          ← 시간 다시 선택
        </button>

        <div className="cal-card mb-5">
          <div className="cal-card-header">
            <h2 className="font-bold text-lg" style={{ letterSpacing: '-0.02em' }}>{isPoll ? '시간 조율 요청' : '예약 확인'}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--subtext-mid)' }}>
              {isPoll ? '선택한 시간들을 호스트에게 보내요. 호스트가 하나를 골라 확정합니다.' : '아래 내용을 확인하고 예약을 확정하세요.'}
            </p>
          </div>
          <div className="p-5 sm:p-6">
          <div className="space-y-3 mb-5">
            <InfoRow label="미팅" value={eventType?.title || slug} icon={<IconMeeting />} />
            <InfoRow label="호스트" value={host?.name || username} icon={<IconUser />} />
            {isPoll ? (
              <div className="flex items-start gap-3">
                <div style={{ marginTop: '2px', color: 'var(--subtext-mid)', flexShrink: 0 }}><IconClock /></div>
                <div className="min-w-0">
                  <span className="text-xs font-medium" style={{ color: 'var(--subtext)' }}>제안할 시간 ({draft.slots.length}개)</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {draft.slots.map((s) => (
                      <span key={s.start} className="tag tag-gold" style={{ textTransform: 'none', letterSpacing: 0 }}>
                        {formatDateTime(s.start)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <InfoRow label="일시" value={formatDateTime(draft.slot.start)} icon={<IconClock />} />
            )}
            <InfoRow label="소요시간" value={`${eventType?.duration || '?'}분`} icon={<IconTimer />} />
            <InfoRow
              label="방식"
              value={eventType?.locationType === 'online' ? '온라인 (Google Meet 자동 생성)' : '오프라인'}
              icon={eventType?.locationType === 'online' ? <IconVideo /> : <IconPin />}
            />
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
        </div>

        {requireLogin && (
          <div
            className="p-4 rounded-xl mb-4 text-sm"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--subtext-mid)' }}
          >
            예약하려면 카카오 로그인이 필요합니다.
          </div>
        )}

        {isSelf && (
          <div
            className="p-4 rounded-xl mb-4 text-sm"
            style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c' }}
          >
            내 미팅은 직접 예약할 수 없어요. 링크를 게스트에게 공유해주세요.
          </div>
        )}

        {error && <p className="text-sm text-center mb-4" style={{ color: '#ef4444' }}>{error}</p>}

        <button className="btn-primary w-full" onClick={handleConfirm} disabled={loading || isSelf}>
          {loading
            ? '처리 중...'
            : requireLogin
              ? `카카오 로그인 후 ${isPoll ? '보내기' : '예약'}`
              : isPoll ? '조율 요청 보내기' : '예약 확정하기'}
        </button>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div style={{ marginTop: '2px', color: 'var(--subtext-mid)', flexShrink: 0 }}>{icon}</div>
      <div className="min-w-0">
        <span className="text-xs font-medium" style={{ color: 'var(--subtext)' }}>{label}</span>
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value}</p>
      </div>
    </div>
  )
}

const IconMeeting = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M3 9h18M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconUser = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
const IconClock = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconTimer = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M12 9v4l2 2M9 2h6M12 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
const IconVideo = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M17 9.5l5-2v9l-5-2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
const IconPin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
