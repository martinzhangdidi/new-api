#!/bin/bash
# 本地构建并部署到生产环境

set -e

SERVER_IP="114.55.97.84"
IMAGE_TAG=${1:-latest}

echo "🚀 部署 new-api 到生产环境"
echo "=========================="

# 1. 本地构建 Docker 镜像
echo "🔨 Step 1: 本地构建镜像 (linux/amd64)..."
docker buildx build \
  --platform linux/amd64 \
  --tag new-api:${IMAGE_TAG} \
  --load \
  .

# 2. 保存并传输镜像到服务器
echo "📦 Step 2: 导出并传输镜像..."
docker save new-api:${IMAGE_TAG} | gzip > /tmp/new-api.tar.gz

scp /tmp/new-api.tar.gz root@${SERVER_IP}:/tmp/

# 3. 在服务器上加载镜像并部署
echo "🚀 Step 3: 服务器加载镜像并部署..."
ssh root@${SERVER_IP} << 'REMOTE_SCRIPT'
  # 加载镜像
  docker load < /tmp/new-api.tar.gz
  
  # 标记为 latest
  docker tag new-api:latest new-api:previous || true
  docker tag new-api:${IMAGE_TAG} new-api:latest
  
  # 部署到 Nomad（使用本地镜像）
  cd /root/tenkb-infra
  nomad job run -var="image_tag=latest" nomad/new-api.nomad.hcl
  
  # 验证
  sleep 5
  nomad job status new-api
  
  # 清理
  rm /tmp/new-api.tar.gz
  docker image prune -f --filter "until=168h"
REMOTE_SCRIPT

# 4. 本地清理
rm /tmp/new-api.tar.gz

echo ""
echo "✅ 部署完成！"
echo "访问: https://newapi.sdkgpt.com"
echo "查看状态: ssh root@${SERVER_IP} 'nomad job status new-api'"
