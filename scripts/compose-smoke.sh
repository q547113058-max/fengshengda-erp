#!/usr/bin/env bash
# docker compose 端到端冒烟测试
# 等 mysql/server/frontend 全部 healthy，然后 curl 7 关键端点

set -e
COMPOSE="docker compose"

echo "▶ 1. compose up -d"
$COMPOSE up -d

echo "▶ 2. 等 3 个服务 healthy"
for i in {1..30}; do
  HEALTHY=$($COMPOSE ps --format json 2>/dev/null | grep -c '"Health":"healthy"' || true)
  if [ "$HEALTHY" -ge 3 ]; then
    echo "  ✅ 3 个服务全部 healthy（${i}s）"
    break
  fi
  echo "  ... $HEALTHY/3 healthy ($i/30)"
  sleep 5
done

if [ "$HEALTHY" -lt 3 ]; then
  echo "❌ 服务未全部 healthy，拉日志排查："
  $COMPOSE logs --tail=200
  exit 1
fi

echo ""
echo "▶ 3. 端到端冒烟"

base="http://localhost:8080"

echo "  - /health"
curl -sf $base/health | head -c 200; echo

echo "  - /api/products (前 200 字符)"
curl -sf $base/api/products | head -c 200; echo

echo "  - /api/auth/login"
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"username":"boss","password":"demo"}' \
  $base/api/auth/login -o /dev/null -w "    HTTP %{http_code}\n"

echo "  - /api/docs (Swagger HTML)"
curl -sf -o /dev/null -w "    HTTP %{http_code}\n" $base/api/docs

echo "  - / (前端 SPA)"
curl -sf $base/ | grep -q '<div id="root"' && echo "    ✅ root div found" || echo "    ❌ root div missing"

echo "  - /api/dashboard/kpi (boss 视角)"
curl -sf $base/api/dashboard/kpi | head -c 200; echo

echo "  - /uploads/ (静态目录)"
curl -sf -o /dev/null -w "    HTTP %{http_code}\n" $base/uploads/

echo ""
echo "▶ 4. 收尾"
$COMPOSE down
