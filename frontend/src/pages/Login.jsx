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
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #f5f0e8 0%, #ede8df 100%)' }}>

      <div className="anim-fade-up w-full" style={{ perspective: '1000px', maxWidth: '380px' }}>
        {/* 탁상 캘린더 전체 */}
        <div style={{ position: 'relative', width: '100%' }}>

          {/* 스프링 바인딩 */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '8px',
            marginBottom: '-2px', position: 'relative', zIndex: 2,
            padding: '0 24px',
          }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} style={{
                width: '18px', height: '22px', minWidth: '10px',
                borderRadius: '10px 10px 0 0',
                border: '2.5px solid #b0a898',
                borderBottom: 'none',
                background: 'linear-gradient(180deg, #d4cdc4 0%, #c8c0b6 100%)',
              }} />
            ))}
          </div>

          {/* 캘린더 페이지 */}
          <div style={{
            background: '#fffdf7',
            borderRadius: '4px 4px 2px 2px',
            boxShadow: '0 8px 32px rgba(61,51,40,0.12), 0 2px 8px rgba(61,51,40,0.08)',
            overflow: 'hidden',
          }}>
            {/* 헤더 영역 */}
            <div style={{
              background: 'linear-gradient(180deg, #f7f0e4 0%, #f0e8d6 100%)',
              padding: '20px 28px 16px',
              textAlign: 'center',
              borderBottom: '1px solid #e8dfd0',
              position: 'relative',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3d3328', letterSpacing: '-0.03em' }}>
                  Meet<span style={{ color: '#F59E0B' }}>Link</span>
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#9e8e7a', marginTop: '8px', letterSpacing: '0.02em' }}>스마트한 미팅 예약 서비스</p>
            </div>

            {/* 날짜 바 */}
            <div style={{
              background: '#e8dfd0',
              padding: '8px 28px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                <span key={d} style={{
                  fontSize: '0.7rem', fontWeight: 700, color: i === 0 ? '#c0785a' : i === 6 ? '#5a82c0' : '#7a6e64',
                  width: '32px', textAlign: 'center',
                }}>{d}</span>
              ))}
            </div>

            {/* 로그인 폼 영역 */}
            <div style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3d3328', marginBottom: '6px' }}>시작하기</h2>
              <p style={{ fontSize: '0.83rem', color: '#9e8e7a', lineHeight: 1.7, marginBottom: '24px' }}>
                카카오 계정으로 로그인하고<br />구글 캘린더를 연동하세요.
              </p>

              <a
                href={kakaoLoginUrl}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  width: '100%', padding: '14px', borderRadius: '10px',
                  background: '#FEE500', color: '#3C1E1E',
                  fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                  boxShadow: '0 2px 12px rgba(254,229,0,0.35)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <KakaoIcon />
                카카오로 시작하기
              </a>

              <p style={{ fontSize: '0.72rem', color: '#b5a898', textAlign: 'center', marginTop: '16px', lineHeight: 1.7 }}>
                로그인 시 서비스 이용약관에 동의합니다.
              </p>

              {/* 하단 기능 태그 */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                {[
                  { label: '캘린더 연동' },
                  { label: '자동 예약' },
                  { label: '카톡 알림' },
                ].map(({ label }) => (
                  <span key={label} style={{
                    fontSize: '0.68rem', color: '#a89880', padding: '3px 10px',
                    borderRadius: '999px', border: '1px solid #ddd5c8',
                    background: '#f7f2ec',
                  }}>{label}</span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M9 1.5C4.858 1.5 1.5 4.134 1.5 7.38c0 2.05 1.342 3.848 3.368 4.88l-.858 3.177a.2.2 0 0 0 .295.222l3.662-2.415A8.77 8.77 0 0 0 9 13.26c4.142 0 7.5-2.634 7.5-5.88S13.142 1.5 9 1.5z"
        fill="#3C1E1E"
      />
    </svg>
  )
}
