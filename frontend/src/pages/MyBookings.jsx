import { useState, useEffect } from 'react'
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

  const upcoming = bookings.filter((b) => b.status === 'confirmed' && new Date(b.startTime) > new Date())
  const past = bookings.filter((b) => b.status !== 'confirmed' || new Date(b.startTime) <= new Date())

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="text-2xl font-bold mb-6" style={{ letterSpacing: '-0.02em' }}>예약 목록</h1>

      <div className="flex gap-2 mb-8">
        {[
          { val: 'guest', label: '내가 예약한 미팅' },
          { val: 'host', label: '나의 미팅 (호스트)' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === val ? 'var(--gold-dim)' : 'var(--surface)',
              border: `1px solid ${tab === val ? 'rgba(245,166,35,0.35)' : 'var(--border-mid)'}`,
              color: tab === val ? 'var(--gold)' : 'var(--subtext-mid)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '2.5rem' }}>📭</span>
          <p className="font-semibold" style={{ color: 'var(--subtext-mid)' }}>예약이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-6">
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

function BookingCard({ booking, role, onCancel }) {
  const isPast = new Date(booking.startTime) <= new Date()
  const isCancelled = booking.status === 'cancelled'

  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        opacity: isCancelled ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold">{booking.eventType?.title}</span>
            <span className={`tag ${isCancelled ? 'tag-red' : 'tag-green'}`}>
              {isCancelled ? '취소됨' : '확정'}
            </span>
            {booking.eventType?.locationType === 'online' && <span className="tag tag-blue">온라인</span>}
          </div>

          <p className="text-sm mb-1" style={{ color: 'var(--subtext-mid)' }}>
            {formatDateTime(booking.startTime)}
            <span style={{ color: 'var(--subtext)' }}> · {booking.eventType?.duration}분</span>
          </p>

          <p className="text-sm" style={{ color: 'var(--subtext)' }}>
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
              🎥 Google Meet 참여
            </a>
          )}
        </div>

        {!isCancelled && !isPast && (
          <button
            className="btn-ghost btn-danger shrink-0"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
            onClick={() => onCancel(booking.id)}
          >
            취소
          </button>
        )}
      </div>
    </div>
  )
}
