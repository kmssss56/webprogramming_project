import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../utils/api'

const DURATIONS = [15, 30, 45, 60, 90]

export default function EventTypeCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: 30,
    bufferTime: 0,
    maxGuests: 1,
    slug: '',
    locationType: 'online',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      api.get(`/event-types/${id}`).then((et) => setForm({
        title: et.title,
        description: et.description || '',
        duration: et.duration,
        bufferTime: et.bufferTime,
        maxGuests: et.maxGuests,
        slug: et.slug,
        locationType: et.locationType,
      }))
    }
  }, [id])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleTitleChange = (e) => {
    const v = e.target.value
    set('title', v)
    if (!isEdit) set('slug', v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isEdit) {
        await api.patch(`/event-types/${id}`, form)
      } else {
        await api.post('/event-types', form)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-8">
        <button className="btn-ghost mb-4" style={{ fontSize: '0.8rem' }} onClick={() => navigate('/dashboard')}>
          ← 대시보드로
        </button>
        <h1 className="text-2xl font-bold" style={{ letterSpacing: '-0.02em' }}>
          {isEdit ? '미팅 타입 편집' : '새 미팅 타입'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <section className="p-6 rounded-xl space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--subtext)' }}>기본 정보</h2>

          <div>
            <label className="block text-sm font-medium mb-1.5">미팅 이름 *</label>
            <input className="form-input" placeholder="30분 커피챗" value={form.title} onChange={handleTitleChange} required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">설명</label>
            <textarea
              className="form-input" rows={3} placeholder="미팅에 대한 간단한 설명"
              value={form.description} onChange={(e) => set('description', e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">URL 슬러그 *</label>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--subtext)' }}>/{'{username}'}/</span>
              <input
                className="form-input flex-1"
                placeholder="30min-chat"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
              />
            </div>
          </div>
        </section>

        {/* 미팅 설정 */}
        <section className="p-6 rounded-xl space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--subtext)' }}>미팅 설정</h2>

          <div>
            <label className="block text-sm font-medium mb-2">소요 시간</label>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map((d) => (
                <button
                  key={d} type="button"
                  className={`slot-btn ${form.duration === d ? 'slot-btn-selected' : ''}`}
                  style={{ minWidth: '4rem' }}
                  onClick={() => set('duration', d)}
                >
                  {d}분
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">버퍼 타임 (분)</label>
              <input
                type="number" min="0" max="60" step="5"
                className="form-input"
                value={form.bufferTime}
                onChange={(e) => set('bufferTime', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">최대 참가자</label>
              <input
                type="number" min="1" max="20"
                className="form-input"
                value={form.maxGuests}
                onChange={(e) => set('maxGuests', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">미팅 방식</label>
            <div className="flex gap-3">
              {[
                { val: 'online', icon: '💻', label: '온라인 (Google Meet)' },
                { val: 'offline', icon: '📍', label: '오프라인' },
              ].map(({ val, icon, label }) => (
                <button
                  key={val} type="button"
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: form.locationType === val ? 'var(--gold-dim)' : 'var(--surface-raised)',
                    border: `1px solid ${form.locationType === val ? 'rgba(245,166,35,0.4)' : 'var(--border-mid)'}`,
                    color: form.locationType === val ? 'var(--gold)' : 'var(--subtext-mid)',
                  }}
                  onClick={() => set('locationType', val)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>
        )}

        <div className="flex gap-3">
          <button type="button" className="btn-ghost flex-1" onClick={() => navigate('/dashboard')}>취소</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? '저장 중...' : isEdit ? '변경사항 저장' : '미팅 타입 만들기'}
          </button>
        </div>
      </form>
    </div>
  )
}
