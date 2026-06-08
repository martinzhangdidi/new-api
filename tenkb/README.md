# tenkb - 自定义构建和部署配置

这个目录包含 tenkb 项目的自定义构建、测试和部署配置，**与上游 new-api 完全分离**。

## 目录结构

```
tenkb/
├── Dockerfile              # 优化版 Dockerfile（去掉 classic 前端、分层缓存）
├── Makefile                # 自定义构建和部署命令
├── scripts/
│   ├── build-and-push.sh   # 构建并推送到阿里云 ACR
│   ├── deploy-hangzhou.sh  # 部署到杭州 Nomad 集群
│   └── backup-hangzhou.sh  # PostgreSQL 备份脚本
└── README.md               # 本文件
```

## 使用方法

### 方式一：使用 Makefile（推荐）

```bash
# 查看所有可用命令
make -f tenkb/Makefile help

# 构建并推送到阿里云
make -f tenkb/Makefile build-push IMAGE_TAG=v1.0.0

# 本地测试镜像
make -f tenkb/Makefile test-local

# 部署到杭州
make -f tenkb/Makefile deploy-hangzhou IMAGE_TAG=v1.0.0
```

### 方式二：使用 shell 脚本

```bash
# 构建推送
./tenkb/scripts/build-and-push.sh v1.0.0

# 部署到杭州
./tenkb/scripts/deploy-hangzhou.sh v1.0.0
```

## 与上游的关系

- **上游文件（如 Dockerfile、makefile）保持原样**，不修改
- 所有自定义配置集中在 `tenkb/` 目录下
- 以后 `git pull` 上游更新时，不会发生冲突

## 注意事项

1. `tenkb/Dockerfile` 使用 `--platform linux/amd64`，因为服务器是 x86_64
2. 构建前确保已登录阿里云镜像仓库：`docker login crpi-3akfk1c833x0o8uo.cn-hangzhou.personal.cr.aliyuncs.com`
3. 部署前确保 `new-api.nomad.hcl` 的 `var.image` 已配置为阿里云地址
