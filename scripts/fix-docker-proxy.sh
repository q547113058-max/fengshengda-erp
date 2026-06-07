#!/usr/bin/env bash
# 修复 Docker daemon socks5 代理（10808 已死）+ 重启 dockerd
# 用法：sudo bash /root/workspace/erp-prototype/scripts/fix-docker-proxy.sh
set -e

echo "▶ 1. 备份 /etc/docker/daemon.json"
sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak.$(date +%s)

echo "▶ 2. 清空 proxies 段"
cat | sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "log-level": "warn",
  "storage-driver": "overlay2"
}
EOF

echo "▶ 3. 移除 systemd docker.service.d 下的 proxy override（如有）"
if [ -d /etc/systemd/system/docker.service.d ]; then
  sudo rm -f /etc/systemd/system/docker.service.d/*proxy* /etc/systemd/system/docker.service.d/*Proxy*
fi

echo "▶ 4. reload systemd + restart dockerd"
sudo systemctl daemon-reload
sudo systemctl restart docker

echo "▶ 5. 等 dockerd 起来"
for i in {1..30}; do
  if docker info > /dev/null 2>&1; then
    echo "  ✅ dockerd ready after ${i}s"
    break
  fi
  sleep 1
done

echo "▶ 6. 验证网络（拉 hello-world）"
docker run --rm hello-world 2>&1 | tail -5
