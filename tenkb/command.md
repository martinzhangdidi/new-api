# 本地测试
make -f tenkb/Makefile test-local

# 构建推送（测试通过后）
make -f tenkb/Makefile build-push IMAGE_TAG=v1.0.0

# 部署（推送成功后）
make -f tenkb/Makefile deploy-hangzhou IMAGE_TAG=v1.0.0

# 启动本地开发环境
make -f tenkb/Makefile start-dev
 
# 停止
make -f tenkb/Makefile stop-dev
 
# 重启
make -f tenkb/Makefile restart-dev
 
# 查看日志
make -f tenkb/Makefile logs-dev
 
# 查看状态
make -f tenkb/Makefile status-dev