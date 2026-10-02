# syntax=docker/dockerfile:1
# Frontend Serenity — vite build (VITE_API_URL build-time) -> nginx alpine static.
FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
# SPA fallback (/thanks?ref=, /status/:code dll) + cache aset.
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:80/ || exit 1
