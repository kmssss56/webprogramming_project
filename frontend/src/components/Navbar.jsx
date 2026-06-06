import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <nav className="glass sticky top-0 z-50" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-5xl mx-auto px-5 flex items-center justify-between" style={{ height: '3.75rem' }}>
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gold)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L1 4v6l6 3 6-3V4L7 1z" stroke="#0a0a0a" strokeWidth="1.4" fill="none"/>
              <circle cx="7" cy="7" r="1.5" fill="#0a0a0a"/>
            </svg>
          </div>
          <span className="text-base font-bold" style={{ letterSpacing: '-0.02em' }}>
            Meet<span style={{ color: 'var(--gold)' }}>Link</span>
          </span>
        </Link>

        {user && (
          <div className="flex items-center gap-1">
            {[
              { to: '/dashboard', label: '대시보드' },
              { to: '/availability', label: '가용 시간' },
              { to: '/bookings', label: '예약 목록' },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  color: isActive(to) ? 'var(--gold)' : 'var(--subtext-mid)',
                  background: isActive(to) ? 'var(--gold-dim)' : 'transparent',
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--gold-dim)', color: 'var(--gold)', border: '1.5px solid rgba(245,166,35,0.3)' }}
                >
                  {(user.name || 'U')[0]}
                </div>
                <span className="text-sm hidden sm:block" style={{ color: 'var(--subtext-mid)' }}>
                  {user.name}
                </span>
              </div>
              <button className="btn-ghost text-xs" style={{ padding: '0.4rem 0.85rem' }} onClick={handleLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <span style={{ color: 'var(--subtext)', fontSize: '0.85rem' }}>미팅 예약 서비스</span>
          )}
        </div>
      </div>
    </nav>
  )
}
