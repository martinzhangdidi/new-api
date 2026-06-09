#!/bin/bash
# tenkb/scripts/deploy-hangzhou.sh
# 部署 new-api 到杭州 Nomad 集群

set -e

SERVER_ALIAS="hangzhou"
IMAGE_TAG=${1:-latest}
ALIYUN_REGISTRY="crpi-3akfk1c833x0o8uo.cn-hangzhou.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="tenkb"
IMAGE_NAME="newapi"

echo "🚀 部署 new-api 到杭州服务器"
echo "=========================="
echo "📦 镜像: ${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

# 部署到 Nomad
ssh ${SERVER_ALIAS} \
  "cd /root && \
   nomad job run -var='image=${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}' \
   new-api.nomad.hcl"

echo ""
echo "✅ 部署完成！"
echo "查看状态: ssh ${SERVER_ALIAS} 'nomad job status new-api'"
echo "访问: https://newapi.sdkgpt.com"
