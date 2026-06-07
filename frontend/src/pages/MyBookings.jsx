import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  })
}

export default function MyBookings() {
  const [tab, setTab] = useState('guest')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/bookings?role=${tab}`)
      .then(setBookings)
      .finally(() => setLoading(false))
  }, [tab])

  const cancelBooking = async (id) => {
    if (!confirm('예약을 취소하시겠습니까?')) return
    await api.patch(`/bookings/${id}/cancel`)
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b))
  }

  // 시간 조율 요청에서 호스트가 시간 하나를 골라 확정
  const confirmBooking = async (id, t) => {
    try {
      const updated = await api.patch(`/bookings/${id}/confirm`, { startTime: t.start, endTime: t.end })
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, ...updated } : b))
    } catch (e) {
      alert(e.message)
    }
  }

  const pending = bookings.filter((b) => b.status === 'pending')
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && new Date(b.startTime) > new Date())
  const past = bookings.filter((b) => b.status !== 'pending' && (b.status !== 'confirmed' || new Date(b.startTime) <= new Date()))

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-5 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>미팅 목록</h1>
        <p className="text-sm" style={{ color: 'var(--subtext-mid)' }}>
          조율 중인 요청과 확정된 미팅을 확인하세요. 취소하면 상대방에게 카카오톡 알림이 갑니다.
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        {[
          { val: 'guest', label: '내가 예약한 미팅', sub: '다른 사람의 링크로 예약' },
          { val: 'host', label: '내가 받은 예약', sub: '내 링크로 들어온 예약' },
        ].map(({ val, label, sub }) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className="flex-1 sm:flex-none min-w-0 px-3 sm:px-5 py-2.5 rounded-lg text-left transition-all"
            style={{
              background: tab === val ? 'var(--gold-dim)' : 'var(--surface)',
              border: `1px solid ${tab === val ? 'rgba(245,158,11,0.35)' : 'var(--border-mid)'}`,
            }}
          >
            <span className="block text-sm font-semibold" style={{ color: tab === val ? 'var(--gold)' : 'var(--subtext-mid)' }}>{label}</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--subtext)' }}>{sub}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.35, color: 'var(--subtext-mid)' }}>
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            <path d="M3 9h18M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {tab === 'host' ? (
            <>
              <p className="font-semibold" style={{ color: 'var(--subtext-mid)' }}>아직 받은 예약이 없습니다</p>
              <p className="text-sm" style={{ color: 'var(--subtext)' }}>
                미팅 타입의 예약 링크를 공유하면, 게스트가 예약한 미팅이 여기에 표시됩니다.
              </p>
              <Link to="/dashboard" className="btn-primary mt-2" style={{ fontSize: '0.85rem' }}>
                예약 링크 공유하러 가기
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold" style={{ color: 'var(--subtext-mid)' }}>아직 예약한 미팅이 없습니다</p>
              <p className="text-sm" style={{ color: 'var(--subtext)' }}>
                다른 사람의 예약 링크로 미팅을 예약하면 여기에 표시됩니다.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--gold)' }}>시간 조율 중</h2>
              <div className="space-y-3">
                {pending.map((b) => (
                  <BookingCard key={b.id} booking={b} role={tab} onCancel={cancelBooking} onConfirm={confirmBooking} />
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--subtext)' }}>예정된 미팅</h2>
              <div className="space-y-3">
                {upcoming.map((b) => <BookingCard key={b.id} booking={b} role={tab} onCancel={cancelBooking} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--subtext)' }}>지난 미팅</h2>
              <div className="space-y-3">
                {past.map((b) => <BookingCard key={b.id} booking={b} role={tab} onCancel={cancelBooking} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking, role, onCancel, onConfirm }) {
  const isPast = new Date(booking.startTime) <= new Date()
  const isCancelled = booking.status === 'cancelled'
  const isPending = booking.status === 'pending'
  const proposed = booking.proposedTimes || []

  return (
    <div
      className="p-4 sm:p-5 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isPending ? 'rgba(245,158,11,0.35)' : 'var(--border)'}`,
        opacity: isCancelled ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm sm:text-base">{booking.eventType?.title}</span>
            <span className={`tag ${isCancelled ? 'tag-red' : isPending ? 'tag-gold' : 'tag-green'}`}>
              {isCancelled ? '취소됨' : isPending ? '조율 중' : '확정'}
            </span>
            {booking.eventType?.locationType === 'online' && <span className="tag tag-blue">온라인</span>}
          </div>

          {isPending ? (
            <div className="mb-1">
              <p className="text-xs mb-1.5" style={{ color: 'var(--subtext-mid)' }}>
                {role === 'host'
                  ? `${booking.guestName} 님이 제안한 시간 중 하나를 골라 확정하세요.`
                  : '호스트가 시간을 확정하면 알림을 받아요.'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {proposed.map((t) => (
                  role === 'host' ? (
                    <button
                      key={t.start}
                      className="btn-ghost"
                      style={{
                        fontSize: '0.75rem', padding: '0.35rem 0.7rem',
                        borderColor: t.busy ? 'rgba(192,120,90,0.5)' : undefined,
                        color: t.busy ? '#c0785a' : undefined,
                      }}
                      title={t.busy ? '내 캘린더에 일정이 있는 시간이에요 (확정은 가능)' : undefined}
                      onClick={() => onConfirm(booking.id, t)}
                    >
                      {formatDateTime(t.start)} 확정{t.busy ? ' · 내 일정 있음' : ''}
                    </button>
                  ) : (
                    <span key={t.start} className="tag tag-gold" style={{ textTransform: 'none', letterSpacing: 0 }}>
                      {formatDateTime(t.start)}
                    </span>
                  )
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm mb-1" style={{ color: 'var(--subtext-mid)' }}>
              {formatDateTime(booking.startTime)}
              <span style={{ color: 'var(--subtext)' }}> · {booking.eventType?.duration}분</span>
            </p>
          )}

          <p className="text-xs sm:text-sm" style={{ color: 'var(--subtext)' }}>
            {role === 'guest' ? `호스트: ${booking.host?.name}` : `게스트: ${booking.guestName}`}
          </p>

          {booking.meetLink && (
            <a
              href={booking.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-xs"
              style={{ color: 'var(--blue)', textDecoration: 'none' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M17 9.5l5-2v9l-5-2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              Google Meet 참여
            </a>
          )}
        </div>

        {!isCancelled && (isPending || !isPast) && (
          <button
            className="btn-ghost btn-danger shrink-0"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            onClick={() => onCancel(booking.id)}
          >
            {isPending ? '요청 취소' : '취소'}
          </button>
        )}
      </div>
    </div>
  )
}
