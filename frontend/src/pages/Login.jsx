import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const kakaoLoginUrl = `${api.getBackendUrl()}/auth/kakao`

  return (
    <div className="min-h-[calc(100vh-3.75rem)] flex items-center justify-center px-5">
      <div className="w-full max-w-sm anim-fade-up">
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--gold-dim)', border: '1px solid rgba(245,166,35,0.3)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L2 8v12l12 6 12-6V8L14 2z" stroke="var(--gold)" strokeWidth="1.8" fill="none"/>
              <circle cx="14" cy="14" r="3" fill="var(--gold)"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ letterSpacing: '-0.03em' }}>
            Meet<span style={{ color: 'var(--gold)' }}>Link</span>
          </h1>
          <p style={{ color: 'var(--subtext-mid)', fontSize: '0.9rem' }}>
            스마트한 미팅 예약 서비스
          </p>
        </div>

        <div
          className="p-8 rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <h2 className="text-lg font-semibold mb-2">시작하기</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--subtext-mid)', lineHeight: 1.7 }}>
            카카오 계정으로 로그인하고<br />구글 캘린더를 연동하세요.
          </p>

          <a
            href={kakaoLoginUrl}
            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5"
            style={{
              background: '#FEE500',
              color: '#3C1E1E',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(254,229,0,0.25)',
            }}
          >
            <KakaoIcon />
            카카오로 시작하기
          </a>

          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--subtext)', lineHeight: 1.8 }}>
              로그인 시 서비스 이용약관에 동의합니다.<br />
              구글 캘린더 연동은 로그인 후 별도로 진행됩니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: '📅', label: '캘린더 연동' },
            { icon: '⚡', label: '자동 예약' },
            { icon: '🔔', label: '카톡 알림' },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="stat-pill"
              style={{ padding: '0.9rem 0.5rem' }}
            >
              <div className="text-xl mb-1">{icon}</div>
              <div style={{ color: 'var(--subtext-mid)', fontSize: '0.7rem', fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        fillRule="evenodd" clipRule="evenodd"
        d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.38c0 2.05 1.342 3.848 3.368 4.88l-.858 3.177a.2.2 0 0 0 .295.222l3.662-2.415A8.77 8.77 0 0 0 9 13.26c4.142 0 7.5-2.634 7.5-5.88S13.142 1.5 9 1.5z"
        fill="#3C1E1E"
      />
    </svg>
  )
}
