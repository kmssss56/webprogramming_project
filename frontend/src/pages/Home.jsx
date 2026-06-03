import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTrendingMovies, IMG_ORIGINAL, IMG_BASE } from '../utils/api'
import { useAuth } from '../hooks/useAuth'

export default function Home() {
  const { user } = useAuth()
  const [backdrop, setBackdrop] = useState('')
  const [posters, setPosters] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getTrendingMovies().then((data) => {
      const movies = data.results?.filter((m) => m.backdrop_path) || []
      if (movies.length > 0) {
        const pick = movies[Math.floor(Math.random() * Math.min(5, movies.length))]
        setBackdrop(`${IMG_ORIGINAL}${pick.backdrop_path}`)
      }
      // grab first 6 poster-path movies for the decorative strip
      const withPosters = (data.results || []).filter((m) => m.poster_path).slice(0, 6)
      setPosters(withPosters)
    }).finally(() => setLoaded(true))
  }, [])

  return (
    <div className="relative min-h-[calc(100vh-3.75rem)] flex flex-col overflow-hidden">

      {/* ── Full-bleed backdrop ── */}
      <div className="absolute inset-0 z-0">
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.12, filter: 'saturate(0.6)' }}
          />
        )}
        {/* Deep vignette so text is always readable */}
        <div className="absolute inset-0 hero-vignette" />
        {/* Subtle noise-like texture via repeating gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 100%, rgba(245,166,35,0.04) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-20 text-center">

        {/* Eyebrow */}
        <div
          className="anim-fade-up inline-flex items-center gap-2 mb-8 px-3.5 py-1.5 rounded-full"
          style={{
            background: 'rgba(245,166,35,0.09)',
            border: '1px solid rgba(245,166,35,0.22)',
          }}
        >
          <span className="film-rule" style={{ width: 20 }} />
          <span
            style={{
              color: 'var(--gold)',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            TMDB 기반 영화 컬렉션
          </span>
          <span className="film-rule" style={{ width: 20 }} />
        </div>

        {/* Headline */}
        <h1
          className="anim-fade-up delay-1 display-font text-white leading-none mb-5"
          style={{ fontSize: 'clamp(2.6rem, 6vw, 5rem)', letterSpacing: '-0.02em' }}
        >
          당신만의{' '}
          <em
            className="display-font"
            style={{
              fontStyle: 'italic',
              background: 'linear-gradient(135deg, #F5A623 0%, #FFD166 55%, #F5A623 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            영화 리스트
          </em>
        </h1>

        {/* Sub */}
        <p
          className="anim-fade-up delay-2 max-w-md mx-auto mb-10"
          style={{ color: 'var(--subtext-mid)', fontSize: '1rem', lineHeight: 1.75 }}
        >
          보고 싶은 영화를 저장하고,
          본 영화를 기록하세요.
        </p>

        {/* CTA */}
        <div className="anim-fade-up delay-3">
          {user ? (
            <Link to="/search" className="btn-primary" style={{ fontSize: '0.95rem', padding: '0.8rem 2rem' }}>
              <SearchIcon />
              영화 탐색하기
            </Link>
          ) : (
            <a
              href={`${import.meta.env.VITE_BACKEND_URL || ''}/oauth2/authorization/google`}
              className="inline-flex items-center gap-3 px-7 py-4 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-1"
              style={{
                background: 'white',
                color: '#111',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                fontSize: '0.92rem',
              }}
            >
              <GoogleIcon />
              Google로 시작하기
            </a>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="anim-fade-up delay-4 mt-16 grid grid-cols-3 gap-3 max-w-sm w-full mx-auto">
          {[
            { n: '500K+', label: '영화 DB' },
            { n: '무료', label: 'TMDB API' },
            { n: '∞', label: '위시리스트' },
          ].map(({ n, label }) => (
            <div key={label} className="stat-pill">
              <div
                className="font-black mb-0.5"
                style={{
                  fontSize: '1.25rem',
                  color: 'var(--gold)',
                  letterSpacing: '-0.02em',
                }}
              >
                {n}
              </div>
              <div style={{ color: 'var(--subtext)', fontSize: '0.7rem', fontWeight: 500 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Decorative poster strip ── */}
      {posters.length > 0 && (
        <div
          className="relative z-10 w-full overflow-hidden pb-10 anim-fade-up delay-5"
          aria-hidden="true"
        >
          <div
            className="flex gap-3 justify-center"
            style={{ mask: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)' }}
          >
            {posters.map((m, i) => (
              <div
                key={m.id}
                className="shrink-0 rounded-lg overflow-hidden"
                style={{
                  width: '72px',
                  height: '108px',
                  opacity: 0.35 + (i % 3) * 0.1,
                  transform: `translateY(${i % 2 === 0 ? '0px' : '8px'})`,
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <img
                  src={`${IMG_BASE}${m.poster_path}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
