import { useState, useEffect } from 'react'
import { api } from '../utils/api'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const DEFAULT_SLOTS = [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' }))

export default function AvailabilitySettings() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get('/availability')
      .then((data) => setSlots(data.length ? data : DEFAULT_SLOTS))
      .finally(() => setLoading(false))
  }, [])

  const activeDays = new Set(slots.map((s) => s.dayOfWeek))

  const toggleDay = (day) => {
    if (activeDays.has(day)) {
      setSlots((prev) => prev.filter((s) => s.dayOfWeek !== day))
    } else {
      setSlots((prev) => [...prev, { dayOfWeek: day, startTime: '09:00', endTime: '17:00' }].sort((a, b) => a.dayOfWeek - b.dayOfWeek))
    }
  }

  const updateTime = (day, field, val) => {
    setSlots((prev) => prev.map((s) => s.dayOfWeek === day ? { ...s, [field]: val } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/availability', { slots })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="spinner" /></div>

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>가용 시간 설정</h1>
        <p className="text-sm" style={{ color: 'var(--subtext-mid)' }}>게스트가 예약할 수 있는 요일과 시간대를 설정하세요.</p>
      </div>

      <div className="p-6 rounded-xl mb-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="font-semibold text-sm uppercase tracking-wide mb-4" style={{ color: 'var(--subtext)' }}>활성 요일</h2>
        <div className="flex gap-2">
          {DAYS.map((label, day) => (
            <button
              key={day}
              className={`day-btn ${activeDays.has(day) ? 'day-btn-active' : ''}`}
              onClick={() => toggleDay(day)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {slots.map((slot) => (
          <div
            key={slot.dayOfWeek}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: 'var(--gold-dim)', color: 'var(--gold)' }}
            >
              {DAYS[slot.dayOfWeek]}
            </div>
            <div className="flex items-center gap-3 flex-1">
              <input
                type="time"
                className="form-input"
                style={{ maxWidth: '9rem' }}
                value={slot.startTime}
                onChange={(e) => updateTime(slot.dayOfWeek, 'startTime', e.target.value)}
              />
              <span style={{ color: 'var(--subtext)' }}>~</span>
              <input
                type="time"
                className="form-input"
                style={{ maxWidth: '9rem' }}
                value={slot.endTime}
                onChange={(e) => updateTime(slot.dayOfWeek, 'endTime', e.target.value)}
              />
            </div>
          </div>
        ))}

        {slots.length === 0 && (
          <div className="empty-state">
            <p style={{ color: 'var(--subtext-mid)' }}>활성화된 요일이 없습니다</p>
            <p className="text-sm" style={{ color: 'var(--subtext)' }}>위에서 요일을 선택해주세요</p>
          </div>
        )}
      </div>

      <button className="btn-primary w-full" onClick={handleSave} disabled={saving}>
        {saved ? '✓ 저장되었습니다' : saving ? '저장 중...' : '가용 시간 저장'}
      </button>
    </div>
  )
}
