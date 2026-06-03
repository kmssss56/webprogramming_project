import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Dashboard() {
  const { user, refreshUser } = useAuth()
  const [eventTypes, setEventTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    api.get('/event-types')
      .then(setEventTypes)
      .finally(() => setLoading(false))
  }, [])

  const handleConnectGoogle = () => {
    window.location.href = `${api.getBackendUrl()}/auth/google/calendar`
  }

  const copyLink = (slug) => {
    const url = `${window.location.origin}/${user.username}/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(''), 2000)
  }

  const toggleActive = async (et) => {
    await api.patch(`/event-types/${et.id}`, { isActive: !et.isActive })
    setEventTypes((prev) => prev.map((e) => e.id === et.id ? { ...e, isActive: !e.isActive } : e))
  }

  const deleteEventType = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    await api.delete(`/event-types/${id}`)
    setEventTypes((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>
            안녕하세요, <span style={{ color: 'var(--gold)' }}>{user?.name}</span>님
          </h1>
          <p style={{ color: 'var(--subtext-mid)', fontSize: '0.9rem' }}>
            {user?.username && `meetlink.app/${user.username}`}
          </p>
        </div>
        <Link to="/event-types/new" className="btn-primary shrink-0">
          + 미팅 타입 추가
        </Link>
      </div>

      {/* Google Calendar Banner */}
      {!user?.googleRefreshToken && (
        <div
          className="flex items-center justify-between p-4 rounded-xl mb-8 gap-4"
          style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.4rem' }}>📅</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--blue)' }}>구글 캘린더 연동 필요</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--subtext-mid)' }}>
                캘린더를 연동해야 가용 시간 조회 및 자동 일정 추가가 가능합니다.
              </p>
            </div>
          </div>
          <button
            className="btn-ghost shrink-0"
            style={{ borderColor: 'rgba(96,165,250,0.3)', color: 'var(--blue)', fontSize: '0.8rem' }}
            onClick={handleConnectGoogle}
          >
            연동하기
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { n: eventTypes.length, label: '미팅 타입' },
          { n: eventTypes.filter(e => e.isActive).length, label: '활성' },
          { n: user?.googleRefreshToken ? '연동됨' : '미연동', label: '구글 캘린더' },
        ].map(({ n, label }) => (
          <div key={label} className="stat-pill">
            <div className="font-black mb-0.5" style={{ fontSize: '1.4rem', color: 'var(--gold)', letterSpacing: '-0.02em' }}>{n}</div>
            <div style={{ color: 'var(--subtext)', fontSize: '0.72rem', fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Event Types */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold" style={{ color: 'var(--subtext-mid)' }}>미팅 타입</h2>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : eventTypes.length === 0 ? (
        <div className="empty-state">
          <span style={{ fontSize: '2.5rem' }}>📋</span>
          <p className="font-semibold" style={{ color: 'var(--subtext-mid)' }}>미팅 타입이 없습니다</p>
          <p className="text-sm" style={{ color: 'var(--subtext)' }}>미팅 타입을 만들어 예약 링크를 공유하세요</p>
          <Link to="/event-types/new" className="btn-primary mt-2" style={{ fontSize: '0.85rem' }}>
            미팅 타입 만들기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {eventTypes.map((et) => (
            <EventTypeCard
              key={et.id}
              et={et}
              username={user?.username}
              copied={copied}
              onCopy={copyLink}
              onToggle={toggleActive}
              onDelete={deleteEventType}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventTypeCard({ et, username, copied, onCopy, onToggle, onDelete }) {
  const bookingUrl = `${window.location.origin}/${username}/${et.slug}`

  return (
    <div
      className="p-5 rounded-xl flex items-center gap-5"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${et.isActive ? 'var(--border)' : 'rgba(255,255,255,0.03)'}`,
        opacity: et.isActive ? 1 : 0.6,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
        style={{ background: 'var(--gold-dim)' }}
      >
        {et.locationType === 'online' ? '💻' : '📍'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{et.title}</span>
          <span className="tag tag-gold">{et.duration}분</span>
          {!et.isActive && <span className="tag" style={{ background: 'var(--surface-raised)', color: 'var(--subtext)' }}>비활성</span>}
        </div>
        {et.description && (
          <p className="text-sm mb-2 truncate" style={{ color: 'var(--subtext-mid)' }}>{et.description}</p>
        )}
        <p className="text-xs truncate" style={{ color: 'var(--subtext)', fontFamily: 'monospace' }}>
          {bookingUrl}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          className="btn-ghost"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          onClick={() => onCopy(et.slug)}
        >
          {copied === et.slug ? '✓ 복사됨' : '링크 복사'}
        </button>
        <Link
          to={`/event-types/${et.id}/edit`}
          className="btn-ghost"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
        >
          편집
        </Link>
        <button
          className="btn-ghost"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          onClick={() => onToggle(et)}
        >
          {et.isActive ? '비활성화' : '활성화'}
        </button>
        <button
          className="btn-ghost btn-danger"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
          onClick={() => onDelete(et.id)}
        >
          삭제
        </button>
      </div>
    </div>
  )
}
