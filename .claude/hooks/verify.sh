#!/bin/bash
# 게이트 2·3 — 자동 포맷 + 최소 검증(센서).
# 계산으로 판정 가능한 것은 여기서 잡는다. LLM 판단보다 빠르고 공짜다.
# 이 프로젝트에 없는 명령은 해당 블록을 통째로 지운다.
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -f package.json ] || exit 0

# 타입 체크 — TypeScript 프로젝트에서 가장 값싸고 확실한 센서
if [ -f tsconfig.json ]; then
  OUT=$(npx --no-install tsc --noEmit 2>&1)
  if [ $? -ne 0 ]; then
    echo "타입 체크 실패:" >&2
    echo "$OUT" | head -30 >&2
    exit 2
  fi
fi

# 린트 (있을 때만)
if grep -q '"lint"' package.json 2>/dev/null; then
  OUT=$(npm run lint --silent 2>&1)
  if [ $? -ne 0 ]; then
    echo "린트 실패:" >&2
    echo "$OUT" | tail -30 >&2
    exit 2
  fi
fi

exit 0
