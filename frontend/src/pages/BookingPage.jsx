import { useState, useEffect, useMemo } from 'react'
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

// 로컬 타임존 기준 YYYY-MM-DD (toISOString은 UTC라 KST에서 하루 밀림)
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfWeek(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function BookingPage() {
  const { username, slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [eventType, setEventType] = useState(null)
  const [host, setHost] = useState(null)
  const [loadingPage, setLoadingPage] = useState(true)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [datePage, setDatePage] = useState(0)
  const [columnSlots, setColumnSlots] = useState({})
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [selectedSlots, setSelectedSlots] = useState([])
  const [copied, setCopied] = useState(false)
  const [kakaoSent, setKakaoSent] = useState('')
  // 호스트 시간 편집 모드: 칸 단위로 막거나(blocked) 구글 일정을 무시하고 열기(opened)
  const [editMode, setEditMode] = useState(false)
  const [blockedSet, setBlockedSet] = useState(new Set())
  const [openedSet, setOpenedSet] = useState(new Set())
  const [savingEdit, setSavingEdit] = useState(false)

  const isHost = Boolean(user && host && user.username === host.username)

  useEffect(() => {
    if (eventType) {
      setBlockedSet(new Set(eventType.blockedTimes || []))
      setOpenedSet(new Set(eventType.openedTimes || []))
    }
  }, [eventType])
  // 시간 조율 모드: 여러 시간을 골라 보내고 호스트가 확정
  const isPoll = eventType?.confirmMode === 'poll'

  useEffect(() => {
    api.get(`/calendar/slots/${username}/${slug}?date=${toDateStr(new Date())}`)
      .then((data) => { setEventType(data.eventType); setHost(data.host) })
      .catch(() => navigate('/'))
      .finally(() => setLoadingPage(false))
  }, [username, slug])

  // 열 구성: dates 모드 = 선택된 날짜들(7개씩 페이지), days 모드 = 주 단위
  const isDatesMode = eventType?.dateMode === 'dates'

  const futureDates = useMemo(() => {
    if (!isDatesMode) return []
    const todayStr = toDateStr(new Date())
    return [...(eventType.dates || [])].filter((d) => d >= todayStr).sort()
  }, [eventType, isDatesMode])

  const columnDates = useMemo(() => {
    if (isDatesMode) return futureDates.slice(datePage * 7, datePage * 7 + 7)
    return Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStart, i)))
  }, [isDatesMode, futureDates, datePage, weekStart])

  // 보이는 열들의 슬롯 병렬 조회
  useEffect(() => {
    if (!eventType || columnDates.length === 0) { setLoadingSlots(false); return }
    let cancelled = false
    setLoadingSlots(true)
    setSelectedSlots([])
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    Promise.all(columnDates.map(async (dateStr) => {
      if (parseDateStr(dateStr) < today) return [dateStr, []]
      try {
        const endpoint = user
          ? `/calendar/slots/${username}/${slug}/with-guest?date=${dateStr}`
          : `/calendar/slots/${username}/${slug}?date=${dateStr}`
        const data = await api.get(endpoint)
        return [dateStr, data.slots || []]
      } catch {
        return [dateStr, []]
      }
    })).then((entries) => {
      if (!cancelled) {
        setColumnSlots(Object.fromEntries(entries))
        setLoadingSlots(false)
      }
    })
    return () => { cancelled = true }
  }, [eventType, columnDates, user, username, slug])

  // 행 = 보이는 열들에 등장하는 모든 시작 시간 (HH:mm, 정렬)
  const times = useMemo(() => {
    const set = new Set()
    Object.values(columnSlots).forEach((slots) => slots.forEach((s) => set.add(formatTime(s.start))))
    return [...set].sort()
  }, [columnSlots])

  const slotMap = useMemo(() => {
    const map = {}
    Object.entries(columnSlots).forEach(([dateStr, slots]) => {
      map[dateStr] = {}
      slots.forEach((s) => { map[dateStr][formatTime(s.start)] = s })
    })
    return map
  }, [columnSlots])

  // 칸 선택: 바로 확정 모드는 1개만, 조율 모드는 여러 개 토글
  const toggleSlot = (slot) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.start === slot.start)
      if (exists) return prev.filter((s) => s.start !== slot.start)
      return isPoll ? [...prev, slot].sort((a, b) => a.start.localeCompare(b.start)) : [slot]
    })
  }

  const handleContinue = () => {
    if (selectedSlots.length === 0 || !eventType) return
    storage.setBookingDraft(
      isPoll
        ? { poll: true, slots: selectedSlots, eventTypeId: eventType.id, username, slug }
        : { slot: selectedSlots[0], eventTypeId: eventType.id, username, slug },
    )
    navigate(`/${username}/${slug}/confirm`)
  }

  // useParams의 username은 디코딩된 값 — 공유용 URL은 다시 인코딩해 일관성 유지
  const bookingUrl = `${window.location.origin}/${encodeURIComponent(username)}/${slug}`

  // 한 번 공유하면 시간 편집을 잠근다 (게스트가 보는 시간표가 바뀌면 안 되므로)
  const lockEditing = () => {
    if (!isHost || eventType?.sharedAt) return
    const sharedAt = new Date().toISOString()
    api.patch(`/event-types/${eventType.id}`, { sharedAt }).catch(() => {})
    setEventType((et) => ({ ...et, sharedAt }))
  }

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    lockEditing()
  }

  // 편집 모드 칸 클릭: 가능 ↔ 불가 / 일정 있음 → 가능(무시) → 불가 → 일정 있음
  const cycleCell = (slot) => {
    const key = slot.start
    if (slot.busy) {
      if (openedSet.has(key)) {
        setOpenedSet((s) => { const n = new Set(s); n.delete(key); return n })
        setBlockedSet((s) => new Set(s).add(key))
      } else if (blockedSet.has(key)) {
        setBlockedSet((s) => { const n = new Set(s); n.delete(key); return n })
      } else {
        setOpenedSet((s) => new Set(s).add(key))
      }
    } else {
      setBlockedSet((s) => {
        const n = new Set(s)
        n.has(key) ? n.delete(key) : n.add(key)
        return n
      })
    }
  }

  const saveEdit = async () => {
    setSavingEdit(true)
    try {
      await api.patch(`/event-types/${eventType.id}`, {
        blockedTimes: [...blockedSet],
        openedTimes: [...openedSet],
      })
      setEventType((et) => ({ ...et, blockedTimes: [...blockedSet], openedTimes: [...openedSet] }))
      setEditMode(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const cancelEdit = () => {
    setBlockedSet(new Set(eventType.blockedTimes || []))
    setOpenedSet(new Set(eventType.openedTimes || []))
    setEditMode(false)
  }

  const sendKakao = async () => {
    setKakaoSent('sending')
    try {
      await api.post(`/event-types/${eventType.id}/share-kakao`)
      setKakaoSent('ok')
      setEventType((et) => ({ ...et, sharedAt: et.sharedAt || new Date().toISOString() }))
    } catch (e) {
      setKakaoSent('')
      alert(e.message)
      return
    }
    setTimeout(() => setKakaoSent(''), 2500)
  }

  if (loadingPage) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
  if (!eventType) return null

  const todayStr = toDateStr(new Date())
  const isFirstPage = isDatesMode ? datePage === 0 : weekStart <= startOfWeek(new Date())
  const hasNextPage = isDatesMode ? (datePage + 1) * 7 < futureDates.length : true

  const navLabel = columnDates.length > 0
    ? `${columnDates[0].slice(5).replace('-', '월 ')}일 – ${columnDates[columnDates.length - 1].slice(5).replace('-', '월 ')}일`
    : ''

  const goPrev = () => isDatesMode ? setDatePage((p) => Math.max(0, p - 1)) : setWeekStart((w) => addDays(w, -7))
  const goNext = () => isDatesMode ? setDatePage((p) => p + 1) : setWeekStart((w) => addDays(w, 7))

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-5 py-8 sm:py-10">
        {/* Host Info */}
        <div className="text-center mb-8 sm:mb-10">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl sm:text-2xl font-bold"
            style={{ background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            {(host?.name || 'H')[0]}
          </div>
          <h2 className="font-semibold text-base sm:text-lg mb-0.5">{host?.name}</h2>
          <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>{eventType.title}</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="tag tag-gold">{eventType.duration}분</span>
            <span className="tag tag-blue">{eventType.locationType === 'online' ? '온라인' : '오프라인'}</span>
            {eventType.maxGuests > 1 && <span className="tag tag-green">최대 {eventType.maxGuests}명</span>}
          </div>
          {eventType.description && (
            <p className="mt-3 text-sm max-w-md mx-auto px-4" style={{ color: 'var(--subtext-mid)' }}>{eventType.description}</p>
          )}
        </div>

        {/* 호스트 본인 공유 배너 */}
        {isHost && (
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl mb-6 max-w-3xl mx-auto gap-3"
            style={{ background: 'var(--gold-dim)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>
                {editMode ? '시간 편집 중' : '내 미팅 페이지예요'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--subtext-mid)' }}>
                {editMode
                  ? '칸을 눌러 바꿔요 — 가능 ↔ 불가, 빗금(일정 있음)은 눌러서 가능으로 열 수 있어요. 저장해야 게스트에게 반영됩니다.'
                  : <>게스트에게 이 화면 그대로 보여요. 링크를 공유해 예약을 받아보세요.{user?.googleConnected && ' 빗금 칸은 내 구글 캘린더 일정이에요.'}</>}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {editMode ? (
                <>
                  <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={cancelEdit}>취소</button>
                  <button className="btn-primary" style={{ fontSize: '0.78rem', padding: '0.55rem 1.1rem' }} onClick={saveEdit} disabled={savingEdit}>
                    {savingEdit ? '저장 중...' : '저장'}
                  </button>
                </>
              ) : (
                <>
                  {!eventType.sharedAt && (
                    <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={() => setEditMode(true)}>
                      시간 편집
                    </button>
                  )}
                  <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={copyLink}>
                    {copied ? '✓ 복사됨' : '링크 복사'}
                  </button>
                  <button
                    className="btn-ghost" style={{ fontSize: '0.78rem', background: '#FEE500', color: '#3C1E1E', border: 'none' }}
                    onClick={sendKakao} disabled={kakaoSent === 'sending'}
                  >
                    {kakaoSent === 'ok' ? '✓ 전송됨' : kakaoSent === 'sending' ? '전송 중...' : '내 카톡으로 보내기'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {!user && (
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl mb-6 max-w-3xl mx-auto gap-3"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <p className="text-sm" style={{ color: 'var(--subtext-mid)' }}>
              로그인하면 양측 캘린더를 비교해 최적의 시간을 추천합니다.
            </p>
            <a
              href={`${api.getBackendUrl()}/auth/kakao`}
              className="btn-ghost self-start sm:self-auto shrink-0"
              style={{ fontSize: '0.8rem', background: '#FEE500', color: '#3C1E1E', border: 'none' }}
            >
              카카오 로그인
            </a>
          </div>
        )}

        {/* Time Grid */}
        <div className="cal-card max-w-3xl mx-auto">
          <div className="cal-card-header flex items-center justify-between gap-2">
            <button
              className="btn-ghost shrink-0"
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', opacity: isFirstPage ? 0.35 : 1 }}
              disabled={isFirstPage}
              onClick={goPrev}
            >‹</button>
            <div className="text-center min-w-0">
              <span className="font-semibold text-sm sm:text-base block">{navLabel || '예약 가능한 날짜 없음'}</span>
              <p className="text-xs mt-0.5" style={{ color: 'var(--subtext-mid)' }}>
                예약 가능한 칸을 눌러 시간을 선택하세요
              </p>
            </div>
            <button
              className="btn-ghost shrink-0"
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.8rem', opacity: hasNextPage ? 1 : 0.35 }}
              disabled={!hasNextPage}
              onClick={goNext}
            >›</button>
          </div>

          <div className="p-4 sm:p-6">
          {loadingSlots ? (
            <div className="py-16"><LoadingSpinner /></div>
          ) : columnDates.length === 0 || times.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <p style={{ color: 'var(--subtext-mid)', fontSize: '0.9rem' }}>
                {isDatesMode && futureDates.length === 0 ? '예약 가능한 날짜가 지났습니다' : '이 기간에는 가능한 시간이 없습니다'}
              </p>
            </div>
          ) : (
            <div className="overflow-auto" style={{ maxHeight: '26rem' }}>
              <div style={{ minWidth: `${Math.max(columnDates.length, 3) * 64 + 52}px` }}>
                {/* Day Headers — 세로 스크롤 시 상단 고정 */}
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `3.2rem repeat(${columnDates.length}, 1fr)`, gap: '3px',
                    position: 'sticky', top: 0, zIndex: 2, background: 'var(--surface)',
                  }}
                >
                  {/* 코너 셀: 양축 sticky */}
                  <div style={{ position: 'sticky', top: 0, left: 0, zIndex: 3, background: 'var(--surface)' }} />
                  {columnDates.map((dateStr) => {
                    const d = parseDateStr(dateStr)
                    const isToday = dateStr === todayStr
                    return (
                      <div key={dateStr} className="text-center pb-2">
                        <div className="text-xs font-semibold" style={{ color: d.getDay() === 0 ? '#c0785a' : d.getDay() === 6 ? 'var(--blue)' : 'var(--subtext)' }}>
                          {DAYS[d.getDay()]}
                        </div>
                        <div
                          className="text-xs sm:text-sm font-bold mt-0.5 mx-auto flex items-center justify-center"
                          style={{
                            minWidth: '1.6rem', height: '1.6rem', borderRadius: '999px', padding: '0 0.3rem',
                            background: isToday ? 'var(--gold)' : 'transparent',
                            color: isToday ? '#fff' : 'var(--text)',
                            width: 'fit-content',
                          }}
                        >
                          {isDatesMode ? `${d.getMonth() + 1}.${d.getDate()}` : d.getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Time Rows */}
                {times.map((time) => (
                  <div key={time} className="grid items-center" style={{ gridTemplateColumns: `3.2rem repeat(${columnDates.length}, 1fr)`, gap: '3px', marginBottom: '3px' }}>
                    <div
                      className="text-right pr-2"
                      style={{
                        fontSize: '0.68rem', color: 'var(--subtext)', fontFamily: 'monospace',
                        position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface)',
                        alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      }}
                    >
                      {time}
                    </div>
                    {columnDates.map((dateStr) => {
                      const slot = slotMap[dateStr]?.[time]
                      if (!slot) {
                        return <div key={dateStr} className="rounded" style={{ height: '1.9rem', background: 'var(--surface-raised)' }} />
                      }
                      const isBlocked = blockedSet.has(slot.start)
                      const busyShown = slot.busy && !openedSet.has(slot.start)
                      const isSelected = selectedSlots.some((s) => s.start === slot.start)

                      // 호스트가 막아둔 칸: 게스트에겐 불가 (편집 모드에선 아래 버튼으로 처리)
                      if (isBlocked && !editMode) {
                        return (
                          <div
                            key={dateStr}
                            className="rounded flex items-center justify-center"
                            style={{ height: '1.9rem', background: 'var(--surface-raised)', fontSize: '0.6rem', color: 'var(--subtext)' }}
                            title={isHost ? '내가 막아둔 시간이에요 — 시간 편집에서 해제할 수 있어요' : undefined}
                          >
                            {isHost ? '✕' : ''}
                          </div>
                        )
                      }
                      // 정원이 찬 칸: 예약자 이름을 보여주고 선택 불가
                      if (slot.full) {
                        return (
                          <div
                            key={dateStr}
                            className="rounded flex items-center justify-center"
                            style={{
                              height: '1.9rem',
                              background: 'rgba(176,168,152,0.25)',
                              border: '1px solid var(--border-mid)',
                              fontSize: '0.6rem', fontWeight: 600, color: 'var(--subtext-mid)',
                              overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 2px',
                            }}
                            title={`${slot.bookedBy.join(', ')} 님이 예약한 시간이에요`}
                          >
                            {slot.bookedBy[0]}
                          </div>
                        )
                      }
                      return (
                        <button
                          key={dateStr}
                          className="rounded transition-all flex items-center justify-center"
                          style={{
                            height: '1.9rem',
                            background: isBlocked
                              ? 'rgba(176,168,152,0.35)'
                              : isSelected
                                ? 'var(--gold)'
                                : busyShown
                                  ? 'repeating-linear-gradient(45deg, rgba(192,120,90,0.18) 0 4px, rgba(192,120,90,0.06) 4px 8px)'
                                  : 'var(--gold-dim)',
                            border: isBlocked
                              ? '1px solid var(--border-mid)'
                              : isSelected
                                ? '1px solid var(--gold)'
                                : busyShown
                                  ? '1px solid rgba(192,120,90,0.35)'
                                  : '1px solid rgba(245,158,11,0.25)',
                            cursor: 'pointer',
                            color: isBlocked || slot.bookedBy?.length ? 'var(--subtext-mid)' : isSelected ? '#fff' : 'transparent',
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 2px',
                          }}
                          title={
                            editMode
                              ? isBlocked
                                ? '눌러서 다시 열기'
                                : busyShown
                                  ? '눌러서 가능으로 열기 (취소된 일정일 때)'
                                  : slot.busy
                                    ? '일정 무시하고 연 칸 — 눌러서 불가로'
                                    : '눌러서 불가로 막기'
                              : slot.bookedBy?.length
                                ? `${slot.bookedBy.join(', ')} 님 예약 — 함께 예약할 수 있어요`
                                : busyShown ? '캘린더에 기존 일정이 있는 시간이에요 (예약은 가능)' : undefined
                          }
                          onClick={() => (editMode ? cycleCell(slot) : !isHost && toggleSlot(slot))}
                        >
                          {isBlocked ? '✕' : isSelected ? '✓' : slot.bookedBy?.length ? slot.bookedBy[0] : ''}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected → Continue */}
          {selectedSlots.length > 0 && (
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {isPoll ? (
                <div className="min-w-0">
                  <p className="text-sm font-semibold">가능한 시간 {selectedSlots.length}개 선택됨</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedSlots.map((s) => (
                      <span key={s.start} className="tag tag-gold" style={{ textTransform: 'none', letterSpacing: 0 }}>
                        {new Date(s.start).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} {formatTime(s.start)}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--subtext-mid)' }}>
                    호스트가 이 중 하나를 골라 확정하면 알림을 받아요.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold">{formatDate(selectedSlots[0].start)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--subtext-mid)' }}>
                    {formatTime(selectedSlots[0].start)} – {formatTime(selectedSlots[0].end)} ({eventType.duration}분)
                  </p>
                  {selectedSlots[0].busy && !openedSet.has(selectedSlots[0].start) && (
                    <p className="text-xs mt-1" style={{ color: '#c0785a' }}>
                      이 시간엔 캘린더에 기존 일정이 있어요. 그래도 예약할 수 있습니다.
                    </p>
                  )}
                </div>
              )}
              {isHost ? (
                <p className="text-xs shrink-0" style={{ color: 'var(--subtext-mid)' }}>
                  미리보기 모드 — 내 미팅은 예약할 수 없어요
                </p>
              ) : (
                <button className="btn-primary shrink-0" onClick={handleContinue}>
                  {isPoll ? `${selectedSlots.length}개 시간 보내기 →` : '예약하기 →'}
                </button>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 flex-wrap" style={{ fontSize: '0.72rem', color: 'var(--subtext)' }}>
          <span className="flex items-center gap-1.5">
            <span className="rounded" style={{ width: '0.9rem', height: '0.9rem', background: 'var(--gold-dim)', border: '1px solid rgba(245,158,11,0.25)', display: 'inline-block' }} />
            예약 가능
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded" style={{ width: '0.9rem', height: '0.9rem', background: 'repeating-linear-gradient(45deg, rgba(192,120,90,0.18) 0 3px, rgba(192,120,90,0.06) 3px 6px)', border: '1px solid rgba(192,120,90,0.35)', display: 'inline-block' }} />
            일정 있음 (예약 가능)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded" style={{ width: '0.9rem', height: '0.9rem', background: 'var(--surface-raised)', display: 'inline-block' }} />
            불가
          </span>
        </div>
      </div>
    </div>
  )
}
