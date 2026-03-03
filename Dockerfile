# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/web/package.json ./packages/web/
COPY packages/mobile/package.json ./packages/mobile/

# Install all workspace deps from root
RUN npm ci

# Copy source
COPY . .

# Build (vite.config.ts at root builds packages/web → dist/)
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
