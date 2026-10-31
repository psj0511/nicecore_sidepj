# 광고 성과 이상 감지 및 운영 이슈 자동화 시스템

광고 성과 데이터에서 이상 징후를 자동으로 찾아 이슈로 등록하고, Notion 티켓으로 넘겨 대응 누락을 막는 MVP입니다.

## 🎯 프로젝트 개요

**목적**: Notion에 올린 광고 성과 CSV에서 이상 징후를 자동 감지하고, 이슈 등록부터 Notion 티켓 생성까지 대응 흐름을 자동화
**범위**: Notion 동기화 → 규칙 R1~R6 기반 이상 감지 → 이슈 관리 → Notion 티켓 생성 (R7·R8은 2단계)
**사용자**: 광고 성과를 매일 점검하는 퍼포먼스 마케팅 운영 담당자와 팀장

## 📱 주요 페이지

1. **대시보드** (`/`) - 기간별 핵심 지표(광고비·클릭·전환·ROAS), 추이 차트, 미해결 이슈 요약
2. **데이터 수집 관리** (`/sync`) - Notion 데이터베이스 동기화·검증, 동기화 이력, 동기화 후 자동 감지
3. **감지 규칙 관리** (`/rules`) - 규칙 R1~R8 임계값·R5 목표값 수정, 활성/비활성 전환
4. **이슈** (`/issues`, `/issues/[id]`) - 이슈 목록·필터, 감지 근거 확인, 상태 변경, 메모, Notion 티켓 생성
5. **Notion 연동 설정** (`/settings/notion`) - 토큰·부모 페이지·티켓 데이터베이스 저장 및 연결 확인

## ⚡ 핵심 기능

- **F001 대시보드**: 성과 지표와 미해결 이슈 수 요약
- **F002·F003 Notion 동기화/이력**: 필수 속성·날짜·숫자 검증, 오류 행 안내, 동기화 삭제
- **F004·F005 감지 규칙/이상 감지**: 설정 가능한 임계값으로 R1~R6 적용, 감지 키 기반 중복 방지, 최소 규모 필터, 주말·공휴일 완화
- **F006·F007 이슈 조회/상태 관리**: 상태·심각도·기간 필터, 신규·진행중·해결·무시 상태, 메모
- **F008·F009 Notion 연동**: 이슈를 Notion 데이터베이스 티켓으로 생성, 중복 생성 방지

MVP 제외: 매체 API 자동 수집, R7·R8 실제 평가, 알림 발송, 로그인/권한, 담당자 지정·댓글, 리포트 내보내기

감지 규칙 상세는 [docs/detection-rules.md](./docs/detection-rules.md)를 참고하세요.

## 🛠️ 기술 스택

- **Framework**: Next.js 15.5.3 (App Router, Turbopack)
- **Runtime / Language**: React 19, TypeScript 5
- **Styling / UI**: TailwindCSS v4, shadcn/ui, Lucide React
- **Forms**: React Hook Form, Zod
- **개발 도구**: ESLint, Prettier, Husky, lint-staged
- **예정 (로드맵 반영)**: Recharts(차트), Supabase/PostgreSQL(DB), Notion API `@notionhq/client`, Vercel(배포)

## 🚀 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 전체 검사 (타입 체크 + 린트 + 포맷)
npm run check-all

# 빌드
npm run build
```

## 📋 개발 상태

- ✅ PRD 및 감지 규칙 명세 작성
- ✅ 개발 로드맵 작성
- ✅ 스타터 데모 코드 정리 (로그인/회원가입/랜딩 섹션 제거, 내비게이션을 PRD 5개 메뉴로 교체)
- 🔄 Phase 1: 애플리케이션 골격 구축 (Task 001~002)
- ⏳ Phase 2~4: UI 완성 → 핵심 기능 → 최적화

## 📖 문서

- [PRD 문서](./docs/PRD.md) - 상세 요구사항
- [개발 로드맵](./docs/ROADMAP.md) - 개발 계획
- [감지 규칙 명세](./docs/detection-rules.md) - R1~R8 규칙 기준
- [개발 가이드](./CLAUDE.md) - 개발 지침
