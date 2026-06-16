# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/electron/package.json ./apps/electron/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci

COPY . .
RUN npm run build:web

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/certs /etc/nginx/certs

EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
