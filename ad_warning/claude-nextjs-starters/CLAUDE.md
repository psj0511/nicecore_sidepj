# 🤖 Claude Code 개발 지침

**광고 성과 이상 감지 및 운영 이슈 자동화 시스템**은 Notion에 올린 광고 성과 CSV에서 이상 징후를 자동으로 감지해 이슈로 등록하고 Notion 티켓으로 전달하는 Next.js 15.5.3 + React 19 기반 MVP입니다.

📋 상세 프로젝트 요구사항은 @/docs/PRD.md 참조

## 🛠️ 핵심 기술 스택

- **Framework**: Next.js 15.5.3 (App Router + Turbopack)
- **Runtime**: React 19.1.0 + TypeScript 5
- **Styling**: TailwindCSS v4 + shadcn/ui (new-york style)
- **Forms**: React Hook Form + Zod + Server Actions
- **UI Components**: Radix UI + Lucide Icons
- **Development**: ESLint + Prettier + Husky + lint-staged

## 📚 개발 가이드

- **🗺️ 개발 로드맵**: `@/docs/ROADMAP.md`
- **📋 프로젝트 요구사항**: `@/docs/PRD.md`
- **📁 프로젝트 구조**: `@/docs/guides/project-structure.md`
- **🎨 스타일링 가이드**: `@/docs/guides/styling-guide.md`
- **🧩 컴포넌트 패턴**: `@/docs/guides/component-patterns.md`
- **⚡ Next.js 15.5.3 전문 가이드**: `@/docs/guides/nextjs-15.md`
- **📝 폼 처리 완전 가이드**: `@/docs/guides/forms-react-hook-form.md`

## 데이터 원칙

- Notion이 **단일 저장소**다. 별도 DB(Supabase 등)를 추가하지 않는다. 규칙·이슈는 부모 페이지 하위 `[AD] 감지 규칙`·`[AD] 이슈` DB에 저장한다 (`src/lib/notion/store.ts`, `src/lib/repositories/`).
- 성과 데이터는 **복사·동기화하지 않고** 조회 시점에 직접 읽는다 (`src/lib/notion/sources.ts`, 2분 캐시 + 수동 새로고침). 성과 DB 탐색에서 앱 데이터 DB와 티켓 DB는 제외한다.
- Notion 토큰·부모 페이지 ID·티켓 DB ID는 환경 변수로만 받는다 (`src/lib/env.ts`). Notion 페이지 ID를 받는 액션은 `getStorePage`로 앱 DB 소속을 확인한다.

## 이상 감지 규칙

- 규칙의 기준 문서는 `@/docs/detection-rules.md` 입니다. 규칙을 구현·수정할 때 반드시 먼저 읽을 것.
- 임계값은 코드에 하드코딩하지 말고 `rules.config.ts`로 분리한다.
- 규칙은 `src/lib/detection/rules/`에 순수 함수로 작성하고, 규칙마다 테스트를 둔다.
- 명세에 없는 규칙이나 임계값을 임의로 추가하지 말고, 필요하면 먼저 제안한다.

## ⚡ 자주 사용하는 명령어

```bash
# 개발
npm run dev         # 개발 서버 실행 (Turbopack)
npm run build       # 프로덕션 빌드
npm run check-all   # 모든 검사 통합 실행 (권장)

# UI 컴포넌트
npx shadcn@latest add button    # 새 컴포넌트 추가
```

## ✅ 작업 완료 체크리스트

```bash
npm run check-all   # 모든 검사 통과 확인
npm run build       # 빌드 성공 확인
```

💡 **상세 규칙은 위 개발 가이드 문서들을 참조하세요**
