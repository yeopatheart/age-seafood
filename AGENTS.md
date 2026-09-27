# age-seafood

경남 통영 수산물 B2B 사업 운영 자동화 시스템. 첫 기능은 터미널 발송·송장 대사 (docs/prd/terminal-dispatch-reconciliation.md 참고).

<!-- 이 파일이 코딩 규칙의 원본이다.
     Claude Code 는 CLAUDE.md 의 @AGENTS.md import 로 같은 내용을 본다.
     규칙을 두 벌 관리하지 않는다. -->

## 명령 (직접 실행해서 동작 확인한 것만 적는다)
- 개발: `npm run dev`
- 테스트: (v1은 자동 테스트 없음 — 수동 브라우저 테스트로 검증)
- 린트: `npm run lint`
- 타입 체크: `npx tsc --noEmit`
- 빌드: `npm run build`

## 스택
Next.js (App Router) + TypeScript · Tailwind · Supabase (Postgres + Auth + Storage, Prisma 없음) · Anthropic API(비전, 버스 송장 수량 제안) · Vercel

Prisma를 의도적으로 빼고 Supabase만 쓴다: 사진 저장(Storage)·인증(Auth)이 어차피 Supabase 몫이라 Prisma는 타입 안전성 외 이득이 적고, 이동 부품을 줄이는 게 낫다 (docs/decisions/2026-09-25-terminal-dispatch-scope.md).

## 도메인 용어
- 배송: 터미널명 + 날짜로 만드는 작업 단위 (테이블명은 `bus_trips`로 남아있음 — DB 마이그레이션 리스크 때문에 이름만 바꾸지 않음)
- 라벨 사진: 택배박스 뚜껑에 붙은 송장 사진. 한 배송에 여러 장 (상차 직전 폰 기본 카메라로 미리 찍어두고 갤러리에서 한 번에 불러오는 경우가 많음)
- 버스 송장 사진: 버스회사가 주는 종이 송장을 찍은 사진. 배송당 1장(새로 찍으면 기존 것 교체)
- 박스 수량(`invoice_box_count`): 버스 송장 사진에서 Claude API(비전)로 읽어 제안한 값을 사람이 확인/수정해서 저장. 100% 자동신뢰 아님 — 손글씨라 틀릴 수 있어서 항상 사람 확인을 거친다
- 검수: 정상/문제있음 구분 없이 "검수완료" 하나뿐 — 스와이프로 확인. 문제가 있으면 메모에 적는다

## 코드 규칙
- `any` 금지. 모르면 `unknown` 후 좁힌다.
- 주변 코드의 스타일·네이밍·주석 밀도를 따른다. 혼자 다른 컨벤션을 도입하지 않는다.
- 요청하지 않은 리팩토링을 끼워넣지 않는다. 발견한 문제는 말로 먼저 알린다.
- 라이브러리를 추가하기 전에 `package.json`에 이미 있는지 확인한다.
- 파일명 `lowercase-kebab-case`. 단 프레임워크 관례가 있으면 그쪽 (`PascalCase.tsx`, `page.tsx`, `[id]`).

## 시크릿
- `.env*`, 키 파일, 토큰은 커밋하지 않는다. 예시는 `.env.example`에 키 이름만.
- Supabase `anon key`(클라이언트 노출 가능)와 `service_role key`(서버 전용)를 혼동하지 않는다.
- `NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저에 그대로 노출된다.

## 건드리면 안 되는 것
- `supabase/migrations/` — 적용된 마이그레이션 파일은 손으로 고치지 않는다. 스키마 변경은 새 마이그레이션 파일로 추가한다
- `.env`, `.env.local` — 실제 키 값. 커밋 금지

## 작업 방식
- 파일을 고치기 전에 읽는다. 추측으로 수정하지 않는다.
- 변경 후 타입 체크·빌드·테스트 중 가능한 것을 돌려 확인한다. 실패하면 실패했다고 말한다.
- 되돌리기 어려운 작업(파일 삭제, force push, 마이그레이션 실행, 배포)은 먼저 확인받는다.
