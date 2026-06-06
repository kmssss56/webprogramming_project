// 로그인 페이지의 탁상 캘린더 컨셉을 다른 페이지에서 재사용하기 위한 시트 프레임
export default function CalendarSheet({ title, subtitle, children }) {
  return (
    <div className="w-full">
      {/* 스프링 바인딩 */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '8px',
        marginBottom: '-2px', position: 'relative', zIndex: 2,
        padding: '0 24px',
      }}>
        {Array.from({ length: 17 }).map((_, i) => (
          <div key={i} style={{
            width: '18px', height: '22px', minWidth: '10px',
            borderRadius: '10px 10px 0 0',
            border: '2.5px solid #b0a898',
            borderBottom: 'none',
            background: 'linear-gradient(180deg, #d4cdc4 0%, #c8c0b6 100%)',
          }} />
        ))}
      </div>

      {/* 캘린더 페이지(종이) */}
      <div style={{
        background: '#fffdf7',
        borderRadius: '4px 4px 12px 12px',
        boxShadow: '0 8px 32px rgba(61,51,40,0.12), 0 2px 8px rgba(61,51,40,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(180deg, var(--cal-header-from) 0%, var(--cal-header-to) 100%)',
          padding: '18px 24px 14px',
          textAlign: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>{title}</h1>
          {subtitle && (
            <p style={{ fontSize: '0.8rem', color: 'var(--subtext-mid)', marginTop: '6px', lineHeight: 1.6 }}>{subtitle}</p>
          )}
        </div>
        <div className="p-5 sm:p-7">{children}</div>
      </div>
    </div>
  )
}
