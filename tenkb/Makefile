# tenkb/Makefile - 我们的自定义构建命令
# 使用方式：make -f tenkb/Makefile <target>
# 或者进入 tenkb 目录：cd tenkb && make <target>

ALIYUN_REGISTRY = crpi-3akfk1c833x0o8uo.cn-hangzhou.personal.cr.aliyuncs.com
ALIYUN_NAMESPACE = tenkb
IMAGE_NAME = newapi
IMAGE_TAG ?= latest
SERVER_IP = 114.55.97.84

# 阿里云镜像仓库登录凭证（从环境变量读取，或在命令行传入）
ALIYUN_USERNAME ?= $(shell echo $$ALIYUN_USERNAME)
ALIYUN_PASSWORD ?= $(shell echo $$ALIYUN_PASSWORD)

# 项目根目录（Makefile 在 tenkb/ 子目录，需要回到根目录执行 docker build）
ROOT_DIR = $(dir $(abspath $(lastword $(MAKEFILE_LIST))))..

.PHONY: all build-push test-local deploy-hangzhou start-dev stop-dev restart-dev logs-dev status-dev help

help:
	@echo "tenkb Makefile - 自定义构建和部署命令"
	@echo ""
	@echo "用法: make -f tenkb/Makefile <target>"
	@echo ""
	@echo "环境变量（构建推送需要）:"
	@echo "  export ALIYUN_USERNAME=你的阿里云账号"
	@echo "  export ALIYUN_PASSWORD=你的阿里云密码"
	@echo ""
	@echo "Targets:"
	@echo "  build-push       构建并推送镜像到阿里云 ACR"
	@echo "  test-local       本地构建并测试镜像（临时容器，测完删除）"
	@echo "  start-dev        启动本地完整开发环境（持久化数据库，可长期运行）"
	@echo "  stop-dev         停止本地开发环境"
	@echo "  restart-dev      重启本地开发环境"
	@echo "  logs-dev         查看本地开发环境日志"
	@echo "  status-dev       查看本地开发环境状态"
	@echo "  deploy-hangzhou  部署到杭州服务器"
	@echo ""
	@echo "示例:"
	@echo "  make -f tenkb/Makefile build-push IMAGE_TAG=v1.0.0"
	@echo "  make -f tenkb/Makefile test-local"
	@echo "  make -f tenkb/Makefile deploy-hangzhou IMAGE_TAG=v1.0.0"

# 构建并推送到阿里云镜像仓库（使用 tenkb/Dockerfile）
build-push:
	@echo "� 登录阿里云镜像仓库..."
	@echo "$(ALIYUN_PASSWORD)" | docker login $(ALIYUN_REGISTRY) -u "$(ALIYUN_USERNAME)" --password-stdin 2>/dev/null || true
	@echo "�� 构建并推送镜像到阿里云..."
	@echo "📦 镜像: $(ALIYUN_REGISTRY)/$(ALIYUN_NAMESPACE)/$(IMAGE_NAME):$(IMAGE_TAG)"
	@cd $(ROOT_DIR) && docker buildx build \
		--platform linux/amd64 \
		-f tenkb/Dockerfile \
		--tag $(ALIYUN_REGISTRY)/$(ALIYUN_NAMESPACE)/$(IMAGE_NAME):$(IMAGE_TAG) \
		--build-arg BUILDKIT_INLINE_CACHE=1 \
		--push \
		.
	@echo "✅ 推送完成！"
	@echo "📋 镜像地址: $(ALIYUN_REGISTRY)/$(ALIYUN_NAMESPACE)/$(IMAGE_NAME):$(IMAGE_TAG)"

# 本地测试镜像（不推送，启动临时数据库验证）
test-local:
	@echo "🧪 本地测试 new-api 镜像..."
	@echo "🔨 构建本地测试镜像..."
	@cd $(ROOT_DIR) && docker build -f tenkb/Dockerfile -t new-api:test .
	@echo "🐘 启动临时 PostgreSQL + Redis..."
	@docker run -d --name test-postgres \
		-e POSTGRES_USER=root -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=new-api \
		-p 5432:5432 postgres:15-alpine >/dev/null 2>&1 || true
	@docker run -d --name test-redis \
		-p 6379:6379 redis:7-alpine >/dev/null 2>&1 || true
	@echo "⏳ 等待数据库就绪..."
	@sleep 5
	@echo "🚀 启动测试容器..."
	@docker run -d --name new-api-test \
		-p 3001:3000 \
		-e SQL_DSN="postgresql://root:123456@host.docker.internal:5432/new-api?sslmode=disable" \
		-e REDIS_CONN_STRING="redis://host.docker.internal:6379" \
		-e TZ=Asia/Shanghai \
		new-api:test >/dev/null 2>&1
	@echo "🔍 等待服务启动..."
	@sleep 8
	@echo "🔍 测试健康检查..."
	@if curl -s http://localhost:3001/api/status | grep -q '"success":true'; then \
		echo "✅ 测试通过！镜像正常"; \
	else \
		echo "❌ 测试失败，查看日志:"; \
		docker logs new-api-test | tail -20; \
	fi
	@echo "🧹 清理测试容器..."
	@docker stop new-api-test test-postgres test-redis >/dev/null 2>&1 || true
	@docker rm new-api-test test-postgres test-redis >/dev/null 2>&1 || true
	@echo "✅ 本地测试完成"

# 本地开发环境（持久化数据库，可长期运行）
start-dev:
	@echo "🚀 启动本地开发环境..."
	@echo "🧹 清理本地 node_modules 和 dist（避免复制到容器）..."
	@rm -rf $(ROOT_DIR)/web/default/node_modules $(ROOT_DIR)/web/default/dist
	@echo "📦 服务: PostgreSQL + Redis + new-api"
	@echo "🌐 访问: http://localhost:3001"
	@cd $(ROOT_DIR)/tenkb && docker compose up -d --build
	@echo "⏳ 等待服务就绪..."
	@sleep 10
	@echo "🔍 测试健康检查..."
	@if curl -s http://localhost:3001/api/status | grep -q '"success":true'; then \
		echo "✅ 服务已启动！"; \
	else \
		echo "⚠️  服务启动中，稍后重试..."; \
	fi
	@echo ""
	@echo "常用命令:"
	@echo "  make -f tenkb/Makefile logs-dev    查看日志"
	@echo "  make -f tenkb/Makefile stop-dev    停止环境"
	@echo "  make -f tenkb/Makefile status-dev  查看状态"

stop-dev:
	@echo "🛑 停止本地开发环境..."
	@cd $(ROOT_DIR)/tenkb && docker compose down
	@echo "✅ 已停止"

restart-dev:
	@echo "🔄 重启本地开发环境..."
	@cd $(ROOT_DIR)/tenkb && docker compose restart
	@echo "✅ 已重启"

logs-dev:
	@cd $(ROOT_DIR)/tenkb && docker compose logs -f

status-dev:
	@echo "📊 本地开发环境状态"
	@cd $(ROOT_DIR)/tenkb && docker compose ps

# 部署到杭州服务器
deploy-hangzhou:
	@echo "🚀 部署 new-api 到杭州服务器..."
	@echo "📦 镜像: $(ALIYUN_REGISTRY)/$(ALIYUN_NAMESPACE)/$(IMAGE_NAME):$(IMAGE_TAG)"
	@ssh hangzhou "cd /root && nomad job run -var='image=$(ALIYUN_REGISTRY)/$(ALIYUN_NAMESPACE)/$(IMAGE_NAME):$(IMAGE_TAG)' new-api.nomad.hcl"
	@echo "✅ 部署完成！"
	@echo "查看状态: ssh hangzhou 'nomad job status new-api'"
