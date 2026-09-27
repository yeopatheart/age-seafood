# 진행 상황

<!-- 다음 세션이 30초 안에 상황을 파악할 수 있게 쓴다. -->

## 지금 되는 것
- `/deliveries`(목록+생성, 미검수 우선 정렬), `/deliveries/[id]`(라벨 사진 다중 촬영/선택, 버스 송장 사진+AI 수량 제안+확인, 스와이프 검수), `/history`, `/settings`(글자 크기) 전부 배포됨
- Supabase 마이그레이션 0001~0008 전부 적용 완료
- GitHub(`yeopatheart/age-seafood`, private, `bk-side-projects` 협업자) + Vercel(`age-seafood.vercel.app`) 배포 완료, PWA 설치 가능
- 성능: `getClaims()` 전환, 사진 업로드/서명 URL 배치 처리, 업로드 전 압축 — docs/decisions/2026-09-27-delivery-flow-and-ai-suggestion.md 참고
- 타입체크·린트·빌드 전부 통과 확인

## 지금 안 되는 것 / 미완성
- `ANTHROPIC_API_KEY` 아직 발급/등록 안 됨 → 버스 송장 AI 수량 제안 기능 미검증 (키 없으면 항상 null 반환, 사람이 직접 입력하는 경로로 자연스럽게 대체됨)
- AI 수량 제안의 실제 손글씨 인식률 검증 안 됨 — 실사용해보고 정확도 낮으면 재검토 필요 (docs/decisions 참고)
- 실제 아이폰·갤럭시 기기에서 스와이프 검수·다중 사진 선택 전체 플로우 최종 테스트 안 됨

## 다음에 할 일 (최대 3개)
1. Anthropic API 키 발급 → `.env.local` + Vercel 환경변수에 등록, 마이그레이션 0008 적용
2. 실제 버스 송장 사진으로 AI 수량 제안 정확도 확인
3. 두 기기(아이폰/갤럭시)에서 전체 플로우 실사용 테스트

## 열린 질문 (open_issue)
- 라벨 사진 Storage 용량 정책 (docs/prd 미결 질문과 동일)
- AI 수량 제안 정확도가 낮게 나오면: 계속 쓸지, 제안 없이 수동 입력만 남길지 재검토
