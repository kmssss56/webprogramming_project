import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path
  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false) }
  const handleConnectGoogle = async () => {
    const { url } = await api.get('/auth/google/calendar')
    window.location.href = url
  }

  const calendarStatus = user?.googleConnected ? (
    <span className="flex items-center gap-1" style={{ color: 'var(--green)', fontSize: '0.72rem', fontWeight: 500 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      구글 캘린더
    </span>
  ) : (
    <button
      className="flex items-center gap-1"
      style={{
        color: 'var(--blue)', fontSize: '0.72rem', fontWeight: 500,
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        textDecoration: 'underline', textUnderlineOffset: '3px',
      }}
      onClick={handleConnectGoogle}
    >
      캘린더 연동하기
    </button>
  )

  const navLinks = [
    { to: '/dashboard', label: '홈' },
    { to: '/bookings', label: '미팅 목록' },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50" style={{
        background: 'rgba(255,253,247,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-5 flex items-center justify-between" style={{ height: '3.75rem' }}>

          {/* 로고 */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2 shrink-0" style={{ textDecoration: 'none' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gold)' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>M</span>
            </div>
            <span className="text-base font-bold" style={{ letterSpacing: '-0.02em', color: 'var(--text)' }}>
              Meet<span style={{ color: 'var(--gold)' }}>Link</span>
            </span>
          </Link>

          {/* 데스크탑 네비 */}
          {user && (
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    color: isActive(to) ? 'var(--gold)' : 'var(--subtext-mid)',
                    background: isActive(to) ? 'var(--gold-dim)' : 'transparent',
                    textDecoration: 'none',
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* 우측 */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-3">
                  {calendarStatus}
                  <span className="text-sm hidden md:block" style={{ color: 'var(--subtext-mid)' }}>{user.name}</span>
                </div>
                <button
                  className="hidden sm:block text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                  style={{ border: '1px solid var(--border-mid)', color: 'var(--subtext-mid)', background: 'transparent', cursor: 'pointer' }}
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
                {/* 모바일 햄버거 */}
                <button
                  className="sm:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg"
                  style={{ border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <span style={{ width: '16px', height: '1.5px', background: 'var(--subtext-mid)', display: 'block', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(45deg) translate(2px, 2px)' : 'none' }} />
                  <span style={{ width: '16px', height: '1.5px', background: 'var(--subtext-mid)', display: 'block', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
                  <span style={{ width: '16px', height: '1.5px', background: 'var(--subtext-mid)', display: 'block', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(2px, -2px)' : 'none' }} />
                </button>
              </>
            ) : (
              <span style={{ color: 'var(--subtext)', fontSize: '0.85rem' }}>미팅 예약 서비스</span>
            )}
          </div>
        </div>

        {/* 모바일 메뉴 드롭다운 */}
        {user && menuOpen && (
          <div className="sm:hidden" style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,253,247,0.97)' }}>
            <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user.name}</span>
              {calendarStatus}
            </div>
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium transition-all"
                style={{
                  color: isActive(to) ? 'var(--gold)' : 'var(--subtext-mid)',
                  background: isActive(to) ? 'var(--gold-dim)' : 'transparent',
                  textDecoration: 'none',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {label}
              </Link>
            ))}
            <button
              className="w-full text-left px-4 py-3 text-sm font-medium"
              style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={handleLogout}
            >
              로그아웃
            </button>
          </div>
        )}
      </nav>
    </>
  )
}
