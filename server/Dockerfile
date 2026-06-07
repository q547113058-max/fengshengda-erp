# ============ Stage 1: deps ============
# 装 monorepo 根 + 两个 workspace 的依赖
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
RUN npm ci --no-audit --no-fund

# ============ Stage 2: builder ============
FROM node:20-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY server ./server
# 编译后端
RUN cd /repo/server && npx tsc -p tsconfig.json

# ============ Stage 3: runtime ============
FROM node:20-alpine AS runtime
WORKDIR /app

# 系统依赖：tini（接 SIGTERM 优雅退出） + wget（healthcheck）
RUN apk add --no-cache tini wget

# 生产环境默认值（可在 docker-compose.yml 里 override）
ENV NODE_ENV=production \
    PORT=3003

# 拷贝 server 编译产物 + 生产依赖
COPY --from=builder /repo/server/dist ./dist
COPY --from=builder /repo/server/package.json ./
COPY --from=builder /repo/node_modules ./node_modules

# 上传目录
RUN mkdir -p /app/uploads

EXPOSE 3003

# tini 接收 SIGTERM 优雅退出
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]

# 健康检查
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3003/health || exit 1
