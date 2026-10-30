---
description: '감지 규칙 명세의 규칙 하나를 구현하고 테스트합니다'
---

# 규칙 구현

`docs/detection-rules.md`에서 $ARGUMENTS 규칙의 정의를 읽고 아래 순서로 진행합니다.

1. 명세에서 모호한 점이 있으면 먼저 질문
2. `src/lib/detection/rules/`에 순수 함수 구현, 임계값은 `rules.config.ts` 사용
3. 단위 테스트 작성 (정상, 경계값, 최소 규모 필터, 주말·공휴일 완화 케이스)
4. `npm run check-all` 통과 확인
