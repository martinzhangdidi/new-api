#!/bin/bash
# tenkb/scripts/build-and-push.sh
# 构建并推送到阿里云镜像仓库

set -e

IMAGE_TAG=${1:-latest}
ALIYUN_REGISTRY="crpi-3akfk1c833x0o8uo.cn-hangzhou.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="tenkb"
IMAGE_NAME="newapi"

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "🚀 构建并推送镜像到阿里云..."
echo "📦 镜像: ${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

# 使用 tenkb/Dockerfile 构建
cd "${PROJECT_ROOT}"
docker buildx build \
  --platform linux/amd64 \
  -f tenkb/Dockerfile \
  --tag ${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} \
  --push \
  .

echo "✅ 推送完成！"
echo "📋 镜像地址: ${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"
