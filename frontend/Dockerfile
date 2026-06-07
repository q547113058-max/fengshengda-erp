# ============ Stage 1: build ============
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY frontend/package.json ./frontend/
RUN npm ci --no-audit --no-fund --workspaces=false
COPY frontend ./frontend
RUN cd frontend && npx vite build

# ============ Stage 2: nginx serve ============
FROM nginx:1.27-alpine AS runtime

# 反代配置 + SPA fallback
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # 后端 API 反代到 server container
    location /api/ {
        proxy_pass http://server:3003/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Swagger 文档
    location /api/docs {
        proxy_pass http://server:3003/api/docs;
    }

    # 静态资源
    location /uploads/ {
        proxy_pass http://server:3003/uploads/;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# 前端构建产物
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
