# 진행 상황

<!-- 다음 세션이 30초 안에 상황을 파악할 수 있게 쓴다. -->

## 지금 되는 것
- 하네스(AGENTS.md/CLAUDE.md/.claude 훅) + Next.js 스캐폴드 + Supabase 클라이언트 연동
- `/login`, `/orders`(등록·수정·삭제), `/bus-trips`(등록+목록), `/bus-trips/[id]`(배정+카메라+대사 체크리스트), `/history` 코드 작성 완료
- Supabase 마이그레이션 3개 파일 작성 완료 (`supabase/migrations/`)
- 타입체크·린트 통과, 로그인 페이지까지 실제 Supabase 프로젝트(URL/anon key)로 동작 확인

## 지금 안 되는 것 / 미완성
- 사용자가 Supabase SQL Editor에서 마이그레이션 3개를 아직 적용하지 않음 → 로그인 이후 화면 전부 미검증
- 테스트 계정 생성 여부 미확인
- 실제 아이폰/안드로이드에서 카메라 촬영 테스트 안 함
- Vercel 배포 안 함

## 다음에 할 일 (최대 3개)
1. Supabase SQL Editor에서 0001~0003 마이그레이션 적용 확인
2. 테스트 계정으로 로그인 → 주문/버스편/대사 전체 플로우 브라우저 테스트
3. 실제 폰으로 카메라 촬영 테스트 → Vercel 배포

## 열린 질문 (open_issue)
- 라벨 사진 Storage 용량 정책 (docs/prd 미결 질문과 동일)
