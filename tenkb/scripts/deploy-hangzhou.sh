#!/bin/bash
# tenkb/scripts/deploy-hangzhou.sh
# 部署 new-api 到杭州 Nomad 集群

set -e

SERVER_IP="114.55.97.84"
IMAGE_TAG=${1:-latest}
ALIYUN_REGISTRY="crpi-3akfk1c833x0o8uo.cn-hangzhou.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="tenkb"
IMAGE_NAME="newapi"

echo "🚀 部署 new-api 到杭州服务器"
echo "=========================="
echo "📦 镜像: ${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}"

# 部署到 Nomad
ssh root@${SERVER_IP} \
  "cd /root/tenkb-infra && \
   nomad job run -var='image=${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}' \
   nomad/new-api.nomad.hcl"

echo ""
echo "✅ 部署完成！"
echo "查看状态: ssh root@${SERVER_IP} 'nomad job status new-api'"
echo "访问: https://newapi.sdkgpt.com"
