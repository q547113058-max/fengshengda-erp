#!/usr/bin/env bash
# 一键提交推送：git add -A && git commit -m "$1" && git push origin main
# 用法：gp "fix: 修复销售超卖 bug"

set -e
cd "$(git rev-parse --show-toplevel)"

MSG="${1:-}"
if [ -z "$MSG" ] && [ -t 0 ]; then
  TMP=$(mktemp)
  "${EDITOR:-vi}" "$TMP"
  MSG=$(cat "$TMP")
  rm -f "$TMP"
fi

if [ -z "$MSG" ]; then
  echo "❌ 用法: gp \"feat: 你的提交信息\"" >&2
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "ℹ️  没有未提交的改动，跳过"
  exit 0
fi

echo "📝 改动:"
git status --short
git add -A
git commit -m "$MSG"

if [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ]; then
  echo "🚀 推送到 origin/main..."
  git push origin main
  echo "✅ 完成"
else
  echo "⚠️  非 main 分支，未自动推送"
fi
