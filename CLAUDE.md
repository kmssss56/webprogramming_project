# 웹 프로그래밍 프로젝트 — 정리 노트

> 마지막 업데이트: 2026-06-03

## 과제 개요
- **최종 마감: 2026년 6월 9일 23:59:59** (이후 제출 시 중대한 감점)
- **14주차 설계서 제출 완료** (`202201445_강민서_14주차.docx`, 바탕화면 프로젝트 폴더)
  - CI/CD 계획 서술은 선택사항이라 미포함
- **최종 제출물**
  - 배포된 웹사이트 링크 (실제 접속 가능한 URL)
  - 발표 영상 7분 이내 (서비스 소개 + 주요 기능 시연, 화면녹화+설명)

### 과제 필수 조건
- [x] GitHub Actions CI/CD 자동 배포
- [x] Docker, Nginx 적극 활용
- [x] Web Storage + DBMS 활용
- [x] 배포된 실제 URL

### GitHub
- Public Repo: https://github.com/kmssss56/webprogramming_project

---

## 확정 주제

**구글 캘린더 연동 미팅 예약 서비스** (Cal.com 참고)

### 핵심 플로우
```
호스트: 카카오 로그인 → 구글 캘린더 연동 → 가용 시간 설정 → 예약 링크 공유
게스트: 링크 접속 → 카카오 로그인 → 구글 캘린더 연동
                    ↓
         양측 캘린더 비교 → 두 사람 모두 가능한 시간만 슬롯 표시
                    ↓
         게스트 시간 선택 → 예약 확정
                    ↓
         양측 구글 캘린더 자동 추가 + 카카오톡 알림
```

### 주요 기능
1. 카카오 로그인 (SSO) — 호스트·게스트 공통
2. 구글 캘린더 연동 — 로그인 후 별도 OAuth로 캘린더 접근 권한 취득
3. 양측 캘린더 비교 — freebusy API로 양측 일정 조회, 겹치는 가능 시간만 슬롯 표시
4. 미팅 예약 — 가능 슬롯 선택, 미팅 목적·주제 입력, 방식(온라인/오프라인) 선택
5. 캘린더 자동 추가 — 예약 확정 시 양측 구글 캘린더에 이벤트 자동 생성
6. 카카오톡 알림 — 예약 확정·취소·재스케줄 시 양측 자동 발송
7. 그룹 예약 — 최대 인원 설정, 여러 게스트가 동일 시간대 예약 가능
8. 온라인 미팅 — Google Meet 링크 자동 생성 (Calendar API 내장)
9. 오프라인 미팅 — 카카오맵으로 장소 검색 및 지도 핀 설정

### 부가 기능
- 가용 시간 설정 (요일별, 버퍼 타임, 최소 예약 가능 시간)
- 캘린더 블락 방식 선택 — 소프트(기존 일정 있어도 예약 허용, 표시만) / 하드(완전 차단)
- 미팅 타입 관리 (소요시간별 종류 생성, 고유 예약 링크 발급)
- 예약 재스케줄 — 게스트가 다른 시간으로 변경 요청
- 예약 관리 — 예정 목록 확인·취소 처리
- 예약 링크 공유 — 미팅 타입별 고유 URL + 카카오톡 공유

---

## 확정 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Frontend | React 18 (Vite) | Vercel 배포 |
| Backend | **NestJS** (Node.js + TypeScript) | Render 배포 / Spring Boot 아님 |
| ORM | Prisma | PostgreSQL 연동 |
| DB | PostgreSQL | Render 무료 플랜 |
| 인증 | 카카오 OAuth2 + JWT | 구글 로그인 아님 |
| 캘린더 | Google Calendar API | 인증과 분리된 별도 OAuth |
| Web Storage | localStorage (JWT), sessionStorage (예약 임시) | |
| Reverse Proxy | Nginx (Docker 내부) | 필수 |
| 컨테이너 | Docker + docker-compose | 필수 |
| CI/CD | GitHub Actions | 필수 |

### 외부 API
| API | 용도 |
|-----|------|
| 카카오 OAuth2 | 소셜 로그인 |
| 카카오톡 메시지 API | 예약 알림 발송 |
| 카카오맵 API | 오프라인 장소 검색 (선택) |
| Google Calendar API | 양측 캘린더 조회 + 이벤트 자동 생성 |
| Google Meet | Calendar API 내장, 온라인 링크 자동 생성 |

### 주요 라이브러리
| 라이브러리 | 용도 |
|-----------|------|
| googleapis | Google Calendar API 연동 |
| passport-kakao | 카카오 OAuth2 인증 |
| @nestjs/passport, jsonwebtoken | JWT 발급·검증 |
| prisma | PostgreSQL ORM |
| dayjs | 날짜·시간·타임존 처리 |
| tailwindcss | UI 스타일링 |

### DB 테이블
```
users        — id, email, name, kakaoId, kakaoAccessToken, googleRefreshToken, timezone
event_types  — id, userId, title, duration, bufferTime, maxGuests, slug
availability — id, userId, dayOfWeek, startTime, endTime
bookings     — id, eventTypeId, hostId, guestId, startTime, endTime, status, meetLink
```

### 배포 구조
```
[사용자]
  ├─ React 프론트 → Vercel
  └─ API 호출(fetch)
        ↓
  [Render] Nginx(80) → NestJS(3000) → PostgreSQL
           (Docker Compose로 묶음)
```

---

## Web Storage 전략
- `localStorage` — JWT 토큰 저장 (로그인 상태 유지)
- `sessionStorage` — 예약 진행 중 선택한 날짜·시간 임시 저장 (새로고침 복원)

---

## 개발 일정 (참고안)
```
Day 1: NestJS + React 뼈대 / 카카오 로그인 / DB 연결 / Docker 세팅
Day 2: 구글 캘린더 연동 + 양측 비교 로직 (핵심 기능)
Day 3: 예약 플로우 완성 + 카카오톡 알림
Day 4: 배포 (Vercel + Render + Nginx) + GitHub Actions CI/CD
Day 5: 버그수정 + 화면다듬기 + 발표영상 7분
```
⚠️ 위험구간: 카카오 OAuth + 구글 캘린더 OAuth 동시 설정 / Docker 배포 / CI/CD yml
→ Day1에 인프라 먼저. 배포를 마지막에 미루지 말 것.

---

## 다음에 할 일
1. 기존 영화 위시리스트 코드(Spring Boot + React) 전부 삭제
2. NestJS 백엔드 새로 시작
3. 카카오 개발자 콘솔 앱 등록 + Google Cloud Console 캘린더 API 활성화
4. 개발 시작
