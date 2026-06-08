# tenkb/Dockerfile - 我们的优化版 Dockerfile
# 基于上游，但做了以下优化：
# 1. 删除 classic 前端构建（省内存、省时间）
# 2. 分层 COPY 优化缓存（依赖和源码分离）
# 3. 精确复制目录（只复制需要的 Go 包）

FROM oven/bun:1@sha256:0733e50325078969732ebe3b15ce4c4be5082f18c4ac1a0f0ca4839c2e4e42a7 AS builder

WORKDIR /build

# 先复制依赖文件（不常变，可缓存）
COPY web/default/package.json web/default/bun.lock ./
RUN bun install

# 再复制源码（常变，缓存命中率低）
COPY web/default ./
COPY VERSION ./
RUN DISABLE_ESLINT_PLUGIN='true' VITE_REACT_APP_VERSION=$(cat VERSION) bun run build

FROM golang:1.26.1-alpine@sha256:2389ebfa5b7f43eeafbd6be0c3700cc46690ef842ad962f6c5bd6be49ed82039 AS builder2

ENV GO111MODULE=on CGO_ENABLED=0
ARG TARGETOS
ARG TARGETARCH
ENV GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64}
ENV GOEXPERIMENT=greenteagc

WORKDIR /build

# 1. 先复制并下载依赖（不常变，可缓存）
COPY go.mod go.sum ./
RUN go mod download

# 2. 复制前端构建产物
COPY --from=builder /build/dist ./web/default/dist
# 创建空的 classic/dist 目录（满足 Go embed 要求）
RUN mkdir -p web/classic/dist && touch web/classic/dist/index.html

# 3. 再复制 Go 源码（常变，缓存命中率低）
COPY *.go ./
COPY controller/ ./controller/
COPY common/ ./common/
COPY constant/ ./constant/
COPY dto/ ./dto/
COPY i18n/ ./i18n/
COPY logger/ ./logger/
COPY middleware/ ./middleware/
COPY model/ ./model/
COPY oauth/ ./oauth/
COPY pkg/ ./pkg/
COPY relay/ ./relay/
COPY router/ ./router/
COPY service/ ./service/
COPY setting/ ./setting/
COPY types/ ./types/
COPY VERSION ./
COPY LICENSE NOTICE THIRD-PARTY-LICENSES.md ./

# 4. 编译
RUN go build -ldflags "-s -w -X 'github.com/QuantumNous/new-api/common.Version=$(cat VERSION)'" -o new-api

FROM debian:bookworm-slim@sha256:f06537653ac770703bc45b4b113475bd402f451e85223f0f2837acbf89ab020a

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata libasan8 wget \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

COPY --from=builder2 /build/new-api /
COPY --from=builder2 /build/LICENSE /build/NOTICE /build/THIRD-PARTY-LICENSES.md /licenses/

EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/new-api"]
