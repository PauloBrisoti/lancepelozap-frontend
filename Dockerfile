# ============================================================
# Frontend Dockerfile — Multi-stage, multi-platform (ARM64 + AMD64)
# ============================================================

# --- Stage 1: Build Vite app ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_URL="/api"
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# --- Stage 2: Production nginx ---
FROM nginx:alpine AS production

# Remove config padrão
RUN rm /etc/nginx/conf.d/default.conf

# Nginx customizado
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build do Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
