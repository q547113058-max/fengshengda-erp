# ============ Stage 1: 构建前端 ============
FROM node:20-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/

RUN npm ci --no-audit --no-fund

COPY frontend ./frontend
RUN npm --workspace frontend run build

# ============ Stage 2: nginx 静态服务 ============
FROM nginx:1.27-alpine AS runtime

COPY --from=builder /repo/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.docker.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost/ || exit 1
