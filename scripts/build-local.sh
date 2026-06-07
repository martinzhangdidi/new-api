#!/bin/bash
# 本地构建并推送到阿里云镜像仓库

set -e

IMAGE_TAG=${1:-latest}
ALIYUN_REGISTRY="crpi-3akfk1c833x0o8uo.cn-hangzhou.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="tenkb"
IMAGE_NAME="newapi"

# 登录阿里云（需要先配置好 docker login）
echo "🐳 登录阿里云镜像仓库..."
docker login ${ALIYUN_REGISTRY}

# 使用 buildx 构建 x86_64 平台镜像（Mac 也能构建）
echo "🔨 构建 x86_64 镜像..."
docker buildx build \
  --platform linux/amd64 \
  --tag ${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} \
  --push \
  .

echo "✅ 推送完成: ${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
