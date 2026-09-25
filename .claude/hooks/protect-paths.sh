#!/bin/bash
# 게이트 1 — 금지 경로 보호. 차단은 exit 2 (exit 1 은 비차단으로 처리된다).
INPUT=$(cat)
PATHS=$(printf '%s' "$INPUT" | tr '\n' ' ')
# .env.example 계열은 키 이름만 담는 공유 파일이라 허용한다 (~/projects/CLAUDE.md 가 권장하는 관행).
PATHS=$(printf '%s' "$PATHS" | sed 's/\.env\.example//g; s/\.env\.sample//g; s/\.env\.template//g')

# 프로젝트에 맞게 고친다.
PROTECTED="supabase/migrations/ .env node_modules/ .next/ dist/ build/ .git/config"

for p in $PROTECTED; do
  case "$PATHS" in
    *"$p"*)
      echo "차단됨: $p 는 보호 경로입니다. 사람이 직접 수정하세요." >&2
      exit 2
      ;;
  esac
done
exit 0
