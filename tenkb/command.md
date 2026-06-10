# TenKB 常用命令速查

## 一、本地开发（推荐：前端热重载 + Docker 后端）

### 1. 启动后端服务（数据库 + Redis + Go API）
# 只需要执行一次，保持后台运行
make -f tenkb/Makefile start-dev

# 访问后端 API: http://localhost:3001

### 2. 启动前端开发服务器（热重载）
cd web/default
bun install
VITE_REACT_APP_SERVER_URL=http://localhost:3001 bun run dev

# 访问前端: http://localhost:3000
# 改代码自动刷新，API 请求自动代理到 Docker 后端

### 3. 停止所有服务
make -f tenkb/Makefile stop-dev

### 4. 查看状态 / 日志
make -f tenkb/Makefile status-dev
make -f tenkb/Makefile logs-dev
make -f tenkb/Makefile restart-dev

---

## 二、纯 Docker 开发（前端改完需重建镜像）

# 启动（构建前端 + 启动完整环境）
make -f tenkb/Makefile start-dev

# 注意：start-dev 会删除 web/default/node_modules 和 dist
# 前端代码修改后需要重新构建：
make -f tenkb/Makefile restart-dev

# 或者彻底重建：
docker compose up -d --build

---

## 三、发布到生产（GitHub Actions）

# 不再在本地构建和推送镜像！
# 通过 GitHub Actions 自动完成构建 → 推送 → 部署

### 1. 打 tag 触发自动发布
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions 会自动：
#   - 构建 Docker 镜像
#   - 推送到阿里云 ACR
#   - 部署到杭州 Nomad

### 2. 查看 GitHub Actions 运行状态
# 访问: https://github.com/martinzhangdidi/new-api/actions

### 3. 手动触发发布（可选）
# GitHub → Actions → "Build and Deploy" → Run workflow → 输入 image_tag

### 4. 本地测试（临时容器，测完自动清理）
make -f tenkb/Makefile test-local

---

## 四、注意事项

- 改前端代码 → 用「前端独立开发」模式，秒级热重载
- 改 Go 后端代码 → 需要 docker compose up -d --build 重建
- 发布生产 → 打 tag 推送到 GitHub，不要本地 build-push
- start-dev 会删除本地 node_modules，前端独立开发时需要重新 bun install