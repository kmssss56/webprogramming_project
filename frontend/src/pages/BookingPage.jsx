import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { storage } from '../utils/storage'
import { useAuth } from '../hooks/useAuth'
import LoadingSpinner from '../components/LoadingSpinner'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

export default function BookingPage() {
  const { username, slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [eventType, setEventType] = useState(null)
  const [host, setHost] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingPage, setLoadingPage] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    api.get(`/calendar/slots/${username}/${slug}?date=${todayStr()}`)
      .then((data) => { setEventType(data.eventType); setHost(data.host) })
      .catch(() => navigate('/'))
      .finally(() => setLoadingPage(false))
  }, [username, slug])

  const todayStr = () => new Date().toISOString().split('T')[0]

  const fetchSlots = async (dateStr) => {
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    try {
      const endpoint = user
        ? `/calendar/slots/${username}/${slug}/with-guest?date=${dateStr}`
        : `/calendar/slots/${username}/${slug}?date=${dateStr}`
      const data = await api.get(endpoint)
      setSlots(data.slots || [])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr)
    fetchSlots(dateStr)
  }

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot)
  }

  const handleContinue = () => {
    if (!selectedSlot || !eventType) return
    storage.setBookingDraft({ slot: selectedSlot, eventTypeId: eventType.id, username, slug })
    navigate(`/${username}/${slug}/confirm`)
  }

  if (loadingPage) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
  if (!eventType) return null

  const calendarDays = buildCalendar(currentMonth)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Host Info */}
        <div className="text-center mb-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold"
            style={{ background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(245,166,35,0.3)' }}
          >
            {(host?.name || 'H')[0]}
          </div>
          <h2 className="font-semibold text-lg mb-0.5">{host?.name}</h2>
          <h1 className="text-2xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>{eventType.title}</h1>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="tag tag-gold">{eventType.duration}분</span>
            <span className="tag tag-blue">{eventType.locationType === 'online' ? '💻 온라인' : '📍 오프라인'}</span>
            {eventType.maxGuests > 1 && <span className="tag tag-green">최대 {eventType.maxGuests}명</span>}
          </div>
          {eventType.description && (
            <p className="mt-3 text-sm max-w-md mx-auto" style={{ color: 'var(--subtext-mid)' }}>{eventType.description}</p>
          )}
        </div>

        {!user && (
          <div
            className="flex items-center justify-between p-4 rounded-xl mb-6 max-w-2xl mx-auto gap-4"
            style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.2)' }}
          >
            <p className="text-sm" style={{ color: 'var(--subtext-mid)' }}>
              로그인하면 양측 캘린더를 비교해 최적의 시간을 추천합니다.
            </p>
            <a
              href={`${api.getBackendUrl()}/auth/kakao`}
              className="btn-ghost shrink-0"
              style={{ fontSize: '0.8rem', background: '#FEE500', color: '#3C1E1E', border: 'none' }}
            >
              카카오 로그인
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Calendar */}
          <div className="p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <button
                className="btn-ghost" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
                onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
              >
                ‹
              </button>
              <span className="font-semibold">
                {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
              </span>
              <button
                className="btn-ghost" style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
                onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold py-1" style={{ color: 'var(--subtext)' }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = day.toISOString().split('T')[0]
                const isToday = dateStr === todayStr()
                const isPast = day < new Date(new Date().setHours(0, 0, 0, 0))
                const isSelected = dateStr === selectedDate

                return (
                  <button
                    key={i}
                    disabled={isPast}
                    onClick={() => handleDateSelect(dateStr)}
                    className="aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center"
                    style={{
                      background: isSelected ? 'var(--gold)' : isToday ? 'var(--gold-dim)' : 'transparent',
                      color: isSelected ? '#0a0a0a' : isPast ? 'var(--subtext)' : isToday ? 'var(--gold)' : 'var(--text)',
                      cursor: isPast ? 'not-allowed' : 'pointer',
                      border: isToday && !isSelected ? '1px solid rgba(245,166,35,0.3)' : '1px solid transparent',
                    }}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Slots */}
          <div className="p-6 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center h-full py-10 gap-3">
                <span style={{ fontSize: '2.5rem' }}>👆</span>
                <p className="font-semibold" style={{ color: 'var(--subtext-mid)' }}>날짜를 선택하세요</p>
              </div>
            ) : loadingSlots ? (
              <LoadingSpinner />
            ) : (
              <>
                <h3 className="font-semibold mb-4 text-sm" style={{ color: 'var(--subtext-mid)' }}>
                  {formatDate(selectedDate)}
                </h3>

                {slots.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                    <span style={{ fontSize: '2rem' }}>😔</span>
                    <p style={{ color: 'var(--subtext-mid)', fontSize: '0.9rem' }}>이 날은 가능한 시간이 없습니다</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                    {slots.map((slot, i) => (
                      <button
                        key={i}
                        className={`slot-btn ${selectedSlot === slot ? 'slot-btn-selected' : ''}`}
                        onClick={() => handleSlotSelect(slot)}
                      >
                        {formatTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}

                {selectedSlot && (
                  <button className="btn-primary w-full mt-5" onClick={handleContinue}>
                    {formatTime(selectedSlot.start)} 예약하기 →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function buildCalendar(month) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1).getDay()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, m, d))
  return days
}
