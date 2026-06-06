import { useState, useRef, useEffect } from 'react'

// 베이지 톤 커스텀 시간 드롭다운 (네이티브 select 대체)
export default function TimeSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const close = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // 열릴 때 선택값이 보이도록 스크롤
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '7.5rem' }}>
      <button
        type="button"
        className="w-full flex items-center justify-between transition-all"
        style={{
          background: open ? 'var(--gold)' : 'var(--surface)',
          color: open ? '#fff' : 'var(--text)',
          border: `1px solid ${open ? 'var(--gold)' : 'var(--border-mid)'}`,
          borderRadius: '0.7rem',
          padding: '0.6rem 0.9rem',
          fontWeight: 700,
          fontSize: '0.9rem',
          cursor: 'pointer',
          fontFamily: 'monospace',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        {value}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M1 3.5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          style={{
            position: 'absolute', top: 'calc(100% + 5px)', left: 0, right: 0, zIndex: 30,
            background: '#fffdf7',
            border: '1px solid var(--border)',
            borderRadius: '0.8rem',
            boxShadow: '0 10px 28px rgba(61,51,40,0.14)',
            maxHeight: '13rem', overflowY: 'auto',
            padding: '0.3rem',
          }}
        >
          {options.map((t) => {
            const selected = t === value
            return (
              <button
                key={t}
                type="button"
                data-selected={selected}
                className="w-full text-center rounded-lg transition-all"
                style={{
                  padding: '0.45rem',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  fontWeight: selected ? 700 : 500,
                  background: selected ? 'var(--gold-dim)' : 'transparent',
                  color: selected ? 'var(--gold)' : 'var(--subtext-mid)',
                  border: 'none', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--surface-hover)' }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
                onClick={() => { onChange(t); setOpen(false) }}
              >
                {t}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
