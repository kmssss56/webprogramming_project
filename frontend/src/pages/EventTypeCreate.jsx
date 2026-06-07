import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import CalendarSheet from '../components/CalendarSheet'
import TimeSelect from '../components/TimeSelect'

const DURATIONS = [15, 30, 45, 60, 90]
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

// 30분 단위 시간 옵션 (00:00 ~ 23:30)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

export default function EventTypeCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: 30,
    bufferTime: 0,
    maxGuests: 1,
    locationType: 'online',
    confirmMode: 'poll', // 시간 조율: 게스트가 후보 시간을 보내면 호스트가 골라 확정
    timeStart: '09:00',
    timeEnd: '17:00',
    dateMode: 'dates',
    dates: [],
  })
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [busyRanges, setBusyRanges] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 구글 연동 시: 보고 있는 달의 내 일정(busy 구간)을 가져온다 (정보 제공만, 선택은 자유)
  useEffect(() => {
    if (!user?.googleConnected) return
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    api.get(`/calendar/my-busy?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`)
      .then(({ busy }) => setBusyRanges(busy))
      .catch(() => {})
  }, [currentMonth, user])

  // 일정이 있는 날 (캘린더 점 표시용)
  const busyDates = useMemo(() => {
    const days = new Set()
    busyRanges.forEach((b) => {
      const d = new Date(b.start)
      d.setHours(0, 0, 0, 0)
      const e = new Date(b.end)
      while (d < e) { days.add(toDateStr(d)); d.setDate(d.getDate() + 1) }
    })
    return days
  }, [busyRanges])

  useEffect(() => {
    if (isEdit) {
      api.get(`/event-types/${id}`).then((et) => {
        // 이미 공유된 미팅은 편집 금지 (게스트가 보는 내용 보호)
        if (et.sharedAt) {
          alert('이미 공유된 미팅은 편집할 수 없어요.')
          navigate('/dashboard')
          return
        }
        return setForm({
        title: et.title,
        description: et.description || '',
        duration: et.duration,
        bufferTime: et.bufferTime,
        maxGuests: et.maxGuests,
        locationType: et.locationType,
        confirmMode: 'poll',
        timeStart: et.timeStart || '09:00',
        timeEnd: et.timeEnd || '17:00',
        dateMode: 'dates',
        dates: et.dates || [],
        })
      })
    }
  }, [id])

  // 선택한 날짜 + 시간 범위와 정확히 겹치는 내 일정 (시간 단위 충돌 안내)
  const conflicts = useMemo(() => {
    if (form.dateMode !== 'dates' || form.dates.length === 0 || busyRanges.length === 0) return []
    const [sh, sm] = form.timeStart.split(':').map(Number)
    const [eh, em] = form.timeEnd.split(':').map(Number)
    const res = []
    form.dates.forEach((d) => {
      const winStart = new Date(`${d}T00:00:00`)
      winStart.setHours(sh, sm, 0, 0)
      const winEnd = new Date(`${d}T00:00:00`)
      winEnd.setHours(eh, em, 0, 0)
      busyRanges.forEach((b) => {
        const bs = new Date(b.start)
        const be = new Date(b.end)
        if (bs < winEnd && be > winStart) res.push({ date: d, start: bs, end: be })
      })
    })
    return res
  }, [form.dateMode, form.dates, form.timeStart, form.timeEnd, busyRanges])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleTitleChange = (e) => set('title', e.target.value)

  const toggleDate = (dateStr) => {
    setForm((f) => ({
      ...f,
      dates: f.dates.includes(dateStr)
        ? f.dates.filter((d) => d !== dateStr)
        : [...f.dates, dateStr].sort(),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.timeEnd <= form.timeStart) { setError('종료 시간이 시작 시간보다 늦어야 합니다.'); return }
    if (form.dates.length === 0) { setError('날짜를 한 개 이상 선택해주세요.'); return }

    setLoading(true)
    try {
      if (isEdit) {
        await api.patch(`/event-types/${id}`, form)
        navigate('/dashboard')
      } else {
        // 슬러그는 서버가 제목 기반으로 자동 생성 (중복 자동 회피)
        const created = await api.post('/event-types', form)
        // 생성 직후 내 예약 페이지로 — 게스트에게 보이는 그리드 + 내 일정 프리뷰
        if (user?.username && created?.slug) {
          navigate(`/${encodeURIComponent(user.username)}/${created.slug}`)
        } else {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const calendarDays = buildCalendar(currentMonth)
  const todayStr = toDateStr(new Date())

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-5 py-8 sm:py-10">
      <button className="btn-ghost mb-5" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/dashboard')}>
        ← 홈으로
      </button>

      <CalendarSheet
        title={isEdit ? '미팅 편집' : '새 미팅 만들기'}
        subtitle="미팅을 만들면 고유 예약 링크가 생겨요. 링크를 받은 게스트가 시간을 골라 예약합니다."
      >
      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* 미팅 이름 */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">미팅 이름 *</label>
          <input className="form-input" placeholder="어떤 미팅인가요? (예: 30분 커피챗)" value={form.title} onChange={handleTitleChange} required />
        </div>

        {/* 시간 범위 */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            시간 <span className="font-normal text-xs" style={{ color: 'var(--subtext)' }}>예약을 받을 시간 범위</span>
          </label>
          <div className="flex items-center gap-2">
            <TimeSelect value={form.timeStart} onChange={(t) => set('timeStart', t)} options={TIME_OPTIONS} />
            <span style={{ color: 'var(--subtext)' }}>–</span>
            <TimeSelect value={form.timeEnd} onChange={(t) => set('timeEnd', t)} options={TIME_OPTIONS} />
          </div>
        </div>

        {/* 날짜/요일 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            날짜 <span className="font-normal text-xs" style={{ color: 'var(--subtext)' }}>예약을 받을 날짜를 선택하세요</span>
          </label>
          <div className="p-3 rounded-xl" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <button type="button" className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}>‹</button>
                <span className="font-semibold text-sm">
                  {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </span>
                <button type="button" className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}>›</button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map((d, i) => (
                  <div key={d} className="text-center text-xs font-semibold py-1"
                    style={{ color: i === 0 ? '#c0785a' : i === 6 ? 'var(--blue)' : 'var(--subtext)' }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={i} />
                  const dateStr = toDateStr(day)
                  const isPast = dateStr < todayStr
                  const isSelected = form.dates.includes(dateStr)
                  return (
                    <button
                      key={i} type="button" disabled={isPast}
                      className="aspect-square rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center"
                      style={{
                        position: 'relative',
                        background: isSelected ? 'var(--gold)' : 'transparent',
                        color: isSelected ? '#fff' : isPast ? 'var(--subtext)' : 'var(--text)',
                        cursor: isPast ? 'not-allowed' : 'pointer',
                        opacity: isPast ? 0.4 : 1,
                        border: dateStr === todayStr && !isSelected ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                      }}
                      title={busyDates.has(dateStr) ? '내 캘린더에 일정이 있는 날이에요' : undefined}
                      onClick={() => toggleDate(dateStr)}
                    >
                      {day.getDate()}
                      {busyDates.has(dateStr) && !isPast && (
                        <span style={{
                          position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)',
                          width: '4px', height: '4px', borderRadius: '50%',
                          background: isSelected ? '#fff' : '#c0785a',
                        }} />
                      )}
                    </button>
                  )
                })}
              </div>
              {form.dates.length > 0 && (
                <p className="text-xs mt-2" style={{ color: 'var(--subtext-mid)' }}>
                  {form.dates.length}일 선택됨: {form.dates.map((d) => d.slice(5).replace('-', '.')).join(', ')}
                </p>
              )}
              {user?.googleConnected && busyDates.size > 0 && (
                <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--subtext)' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#c0785a', display: 'inline-block' }} />
                  내 캘린더에 일정이 있는 날
                </p>
              )}
              {conflicts.length > 0 && (
                <div
                  className="mt-2 p-2.5 rounded-lg"
                  style={{ background: 'rgba(192,120,90,0.08)', border: '1px solid rgba(192,120,90,0.25)' }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: '#c0785a' }}>
                    선택한 시간대에 내 캘린더 일정이 있어요
                  </p>
                  {conflicts.map((c, i) => (
                    <p key={i} className="text-xs" style={{ color: 'var(--subtext-mid)' }}>
                      {c.date.slice(5).replace('-', '.')} · {c.start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      –{c.end.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </p>
                  ))}
                </div>
              )}
            </div>
        </div>

        {/* 미팅 설정 */}
        <section className="space-y-5 pt-5" style={{ borderTop: '1px dashed var(--border-mid)' }}>
          <div>
            <label className="block text-sm font-medium mb-2">소요 시간</label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map((d) => (
                <button
                  key={d} type="button"
                  className={`slot-btn ${form.duration === d ? 'slot-btn-selected' : ''}`}
                  style={{ minWidth: '3.5rem' }}
                  onClick={() => set('duration', d)}
                >
                  {d}분
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">미팅 방식</label>
            <div className="flex flex-col sm:flex-row gap-3">
              {[
                { val: 'online', label: '온라인 (Google Meet)', icon: <IconVideo /> },
                { val: 'offline', label: '오프라인', icon: <IconPin /> },
              ].map(({ val, icon, label }) => (
                <button
                  key={val} type="button"
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    background: form.locationType === val ? 'var(--gold-dim)' : 'var(--surface-raised)',
                    border: `1px solid ${form.locationType === val ? 'rgba(245,158,11,0.4)' : 'var(--border-mid)'}`,
                    color: form.locationType === val ? 'var(--gold)' : 'var(--subtext-mid)',
                  }}
                  onClick={() => set('locationType', val)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">설명</label>
            <textarea
              className="form-input" rows={2} placeholder="미팅에 대한 간단한 설명 (선택)"
              value={form.description} onChange={(e) => set('description', e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">동시 예약 인원</label>
            <input
              type="number" min="1" max="20"
              className="form-input"
              style={{ maxWidth: '8rem' }}
              value={form.maxGuests}
              onChange={(e) => set('maxGuests', parseInt(e.target.value) || 1)}
            />
            <p className="form-hint">1이면 1:1 미팅이에요. 2 이상이면 같은 시간에 여러 명이 함께 예약하는 그룹 미팅이 돼요.</p>
          </div>

        </section>

        {error && (
          <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <div className="flex gap-3">
          <button type="button" className="btn-ghost flex-1" onClick={() => navigate('/dashboard')}>취소</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? '저장 중...' : isEdit ? '변경사항 저장' : '미팅 만들기'}
          </button>
        </div>
      </form>
      </CalendarSheet>
    </div>
  )
}

const IconVideo = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M17 9.5l5-2v9l-5-2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
const IconPin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="1.5" fill="none"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
