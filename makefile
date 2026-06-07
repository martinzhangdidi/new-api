FRONTEND_DIR = ./web/default
FRONTEND_CLASSIC_DIR = ./web/classic
BACKEND_DIR = .
DEV_COMPOSE_FILE = docker-compose.dev.yml
DEV_POSTGRES_SERVICE = postgres
DEV_BACKEND_SERVICE = new-api
DEV_POSTGRES_DB = new-api
DEV_POSTGRES_USER = root
DEV_SQLITE_PATH ?= one-api.db

# 阿里云镜像仓库配置
ALIYUN_REGISTRY = crpi-3akfk1c833x0o8uo.cn-hangzhou.personal.cr.aliyuncs.com
ALIYUN_NAMESPACE = tenkb
IMAGE_NAME = newapi
IMAGE_TAG ?= latest

.PHONY: all build-frontend build-frontend-classic build-all-frontends start-backend dev dev-api dev-api-rebuild dev-web dev-web-classic reset-setup build-push test-local

all: build-all-frontends start-backend

build-frontend:
	@echo "Building default frontend..."
	@cd $(FRONTEND_DIR) && bun install && DISABLE_ESLINT_PLUGIN='true' VITE_REACT_APP_VERSION=$(cat ../../VERSION) bun run build

build-frontend-classic:
	@echo "Building classic frontend..."
	@cd $(FRONTEND_CLASSIC_DIR) && bun install && VITE_REACT_APP_VERSION=$(cat ../../VERSION) bun run build

build-all-frontends: build-frontend build-frontend-classic

start-backend:
	@echo "Starting backend dev server..."
	@cd $(BACKEND_DIR) && go run main.go &

dev-api:
	@echo "Starting backend services (docker)..."
	@docker compose -f $(DEV_COMPOSE_FILE) up -d

dev-api-rebuild:
	@echo "Rebuilding and starting backend service (docker)..."
	@docker compose -f $(DEV_COMPOSE_FILE) up -d --build $(DEV_BACKEND_SERVICE)

dev-web:
	@echo "Starting frontend dev server..."
	@cd $(FRONTEND_DIR) && bun install && bun run dev

dev-web-classic:
	@echo "Starting classic frontend dev server..."
	@cd $(FRONTEND_CLASSIC_DIR) && bun install && bun run dev

dev: dev-api dev-web

reset-setup:
	@echo "Resetting local setup wizard state..."
	@if docker compose -f $(DEV_COMPOSE_FILE) ps --services --status running | grep -qx "$(DEV_POSTGRES_SERVICE)"; then \
		echo "Detected running docker dev PostgreSQL. Removing setup record and root users..."; \
		docker compose -f $(DEV_COMPOSE_FILE) exec -T $(DEV_POSTGRES_SERVICE) \
			psql -U $(DEV_POSTGRES_USER) -d $(DEV_POSTGRES_DB) \
			-c 'DELETE FROM setups;' \
			-c 'DELETE FROM users WHERE role = 100;' \
			-c "DELETE FROM options WHERE key IN ('SelfUseModeEnabled', 'DemoSiteEnabled');"; \
		echo "Restarting docker dev backend so setup status is recalculated..."; \
		docker compose -f $(DEV_COMPOSE_FILE) restart $(DEV_BACKEND_SERVICE); \
	elif db_path="$${SQLITE_PATH:-$(DEV_SQLITE_PATH)}"; db_path="$${db_path%%\?*}"; [ -f "$$db_path" ]; then \
		db_path="$${SQLITE_PATH:-$(DEV_SQLITE_PATH)}"; \
		db_path="$${db_path%%\?*}"; \
		echo "Detected local SQLite database: $$db_path"; \
		sqlite3 "$$db_path" \
			"DELETE FROM setups; DELETE FROM users WHERE role = 100; DELETE FROM options WHERE key IN ('SelfUseModeEnabled', 'DemoSiteEnabled');"; \
		echo "SQLite setup state reset. Restart the local backend process before testing the setup wizard."; \
	else \
		echo "No running docker dev PostgreSQL or local SQLite database found."; \
		echo "Start the dev stack with 'make dev-api', or set SQLITE_PATH/DEV_SQLITE_PATH to your local SQLite database."; \
		exit 1; \
	fi

# 构建并推送到阿里云镜像仓库（本地 Mac 构建 x86_64 镜像）
build-push:
	@echo "🚀 构建并推送镜像到阿里云..."
	@echo "📦 镜像: $(ALIYUN_REGISTRY)/$(ALIYUN_NAMESPACE)/$(IMAGE_NAME):$(IMAGE_TAG)"
	@docker buildx build \
		--platform linux/amd64 \
		--tag $(ALIYUN_REGISTRY)/$(ALIYUN_NAMESPACE)/$(IMAGE_NAME):$(IMAGE_TAG) \
		--push \
		.
	@echo "✅ 推送完成！"
	@echo "📋 镜像地址: $(ALIYUN_REGISTRY)/$(ALIYUN_NAMESPACE)/$(IMAGE_NAME):$(IMAGE_TAG)"

# 本地测试镜像（不推送，启动临时数据库验证）
test-local:
	@echo "🧪 本地测试 new-api 镜像..."
	@echo "🔨 构建本地测试镜像..."
	@docker build -t new-api:test .
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
