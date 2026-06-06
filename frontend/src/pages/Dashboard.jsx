import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Dashboard() {
  const { user } = useAuth()
  const [eventTypes, setEventTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    api.get('/event-types')
      .then(setEventTypes)
      .finally(() => setLoading(false))
  }, [])

  const handleConnectGoogle = async () => {
    const { url } = await api.get('/auth/google/calendar')
    window.location.href = url
  }

  const copyLink = (et) => {
    const url = `${window.location.origin}/${encodeURIComponent(user.username)}/${et.slug}`
    navigator.clipboard.writeText(url)
    setCopied(et.slug)
    setTimeout(() => setCopied(''), 2000)
    // 공유 후에는 시간 편집 잠금
    if (!et.sharedAt) {
      const sharedAt = new Date().toISOString()
      api.patch(`/event-types/${et.id}`, { sharedAt }).catch(() => {})
      setEventTypes((prev) => prev.map((e) => (e.id === et.id ? { ...e, sharedAt } : e)))
    }
  }

  const deleteEventType = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return
    // 낙관적 업데이트: UI에서 먼저 지우고, 실패하면 복구
    const prev = eventTypes
    setEventTypes((list) => list.filter((e) => e.id !== id))
    try {
      await api.delete(`/event-types/${id}`)
    } catch (e) {
      setEventTypes(prev)
      alert(e.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-5 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" style={{ letterSpacing: '-0.02em' }}>
            안녕하세요, <span style={{ color: 'var(--gold)' }}>{user?.name}</span>님
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--subtext-mid)' }}>
            내 캘린더 기반 예약 링크를 만들어 공유하면, 게스트가 가능한 시간에 미팅을 예약합니다.
          </p>
        </div>
      </div>

      {/* 시작 가이드 — 미팅 타입을 만들기 전까지 표시 */}
      {!loading && eventTypes.length === 0 && (
        <div className="cal-card mb-8">
          <div className="cal-card-header">
            <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              미팅을 만들어 링크를 공유하면 게스트가 예약할 수 있어요.
            </p>
          </div>
          <div>
            <GuideStep
              num={1}
              done={eventTypes.length > 0}
              title="미팅 만들고 링크 공유"
              desc="30분 커피챗 같은 미팅을 만들면 고유 예약 링크가 생깁니다."
              action={
                eventTypes.length === 0 && (
                  <Link to="/event-types/new" className="btn-ghost shrink-0" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                    만들기
                  </Link>
                )
              }
            />
            <GuideStep
              num={2}
              done={Boolean(user?.googleConnected)}
              title="구글 캘린더 연동 (선택)"
              desc="연동하면 내 일정과 겹치는 시간이 게스트에게 '일정 있음'으로 표시돼요. 연동하지 않아도 예약은 받을 수 있습니다."
              action={
                !user?.googleConnected && (
                  <button className="btn-ghost shrink-0" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={handleConnectGoogle}>
                    연동하기
                  </button>
                )
              }
              last
            />
          </div>
        </div>
      )}

      {/* Event Types */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold" style={{ color: 'var(--subtext-mid)' }}>내 미팅</h2>
        {eventTypes.length > 0 && (
          <Link to="/event-types/new" className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}>
            + 새 미팅
          </Link>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : eventTypes.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
            <path d="M3 9h18M8 2v3M16 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <p className="font-semibold" style={{ color: 'var(--subtext-mid)' }}>아직 미팅이 없습니다</p>
          <p className="text-sm" style={{ color: 'var(--subtext)' }}>미팅을 만들어 예약 링크를 공유하세요</p>
          <Link to="/event-types/new" className="btn-primary mt-2" style={{ fontSize: '0.85rem' }}>
            미팅 만들기
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {eventTypes.map((et) => (
            <EventTypeCard
              key={et.id}
              et={et}
              username={user?.username}
              copied={copied}
              onCopy={copyLink}
              onDelete={deleteEventType}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GuideStep({ num, done, title, desc, action, last }) {
  return (
    <div
      className="flex items-center gap-3 px-4 sm:px-5 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
    >
      <span className={`step-num ${done ? 'step-num-done' : ''}`}>
        {done ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : num}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: done ? 'var(--subtext-mid)' : 'var(--text)' }}>
          {title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--subtext)' }}>{desc}</p>
      </div>
      {action}
    </div>
  )
}

function EventTypeCard({ et, username, copied, onCopy, onDelete }) {
  const bookingUrl = `${window.location.origin}/${encodeURIComponent(username || '')}/${et.slug}`
  const [kakaoSent, setKakaoSent] = useState('')

  const sendKakao = async () => {
    setKakaoSent('sending')
    try {
      await api.post(`/event-types/${et.id}/share-kakao`)
      setKakaoSent('ok')
    } catch (e) {
      setKakaoSent('')
      alert(e.message)
      return
    }
    setTimeout(() => setKakaoSent(''), 2500)
  }

  return (
    <div
      className="p-4 sm:p-5 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--gold-dim)' }}
        >
          {et.locationType === 'online' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="15" height="10" rx="2" stroke="#F59E0B" strokeWidth="1.6" fill="none"/><path d="M17 9.5l5-2v9l-5-2" stroke="#F59E0B" strokeWidth="1.6" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#F59E0B" strokeWidth="1.6" fill="none"/><circle cx="12" cy="9" r="2.5" stroke="#F59E0B" strokeWidth="1.6"/></svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm sm:text-base">{et.title}</span>
            <span className="tag tag-gold">{et.duration}분</span>
          </div>
          {et.description && (
            <p className="text-xs sm:text-sm mb-1 truncate" style={{ color: 'var(--subtext-mid)' }}>{et.description}</p>
          )}
          <p className="text-xs truncate" style={{ color: 'var(--subtext)', fontFamily: 'monospace' }}>
            {bookingUrl}
          </p>
        </div>
      </div>

      {/* 버튼 영역 - 모바일에서 아래로 */}
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          className="btn-ghost"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          onClick={() => onCopy(et)}
        >
          {copied === et.slug ? '✓ 복사됨' : '링크 복사'}
        </button>
        <button
          className="btn-ghost"
          style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', background: '#FEE500', color: '#3C1E1E', border: 'none' }}
          onClick={sendKakao}
          disabled={kakaoSent === 'sending'}
        >
          {kakaoSent === 'ok' ? '✓ 전송됨' : kakaoSent === 'sending' ? '전송 중...' : '카톡 공유'}
        </button>
        {/* 공유된 미팅은 편집 불가 — 게스트가 보는 내용이 바뀌면 안 됨 */}
        {!et.sharedAt && (
          <Link
            to={`/event-types/${et.id}/edit`}
            className="btn-ghost"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          >
            편집
          </Link>
        )}
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
