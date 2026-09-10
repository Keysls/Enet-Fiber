# syntax=docker/dockerfile:1.4
# Etapa 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# El servidor de Dokploy tiene una caché de BuildKit corrupta que afecta
# CUALQUIER archivo leído del "contexto de build" local (COPY, --mount
# de tipo bind), de forma intermitente ("failed to calculate checksum
# of ref ...: not found") — lo confirmamos en nginx.conf, package.json
# y package-lock.json por separado, siempre la misma referencia rota.
# Workaround definitivo: el propio contenedor clona el repo directo
# desde GitHub durante el build, sin depender del contexto local para
# nada. COPY --from=<stage> (más abajo) sí funciona bien porque lee de
# una imagen ya materializada, no del contexto — por eso no se toca.
# Este ADD fuerza a Docker a revisar si hay un commit nuevo en cada build
# (compara el contenido remoto) — sin esto, el RUN de abajo se cachearía
# para siempre y nunca traería código nuevo en deploys futuros.
ADD https://api.github.com/repos/Keysls/Enet-Fiber/commits/main /tmp/cache_bust.json

RUN apk add --no-cache git ca-certificates \
    && git clone --depth 1 --branch main https://github.com/Keysls/Enet-Fiber.git /tmp/repo \
    && cp -r /tmp/repo/isp-admin/. /app/ \
    && rm -rf /tmp/repo

RUN npm install

ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# Etapa 2: Servir con NGINX
FROM nginx:alpine

# nginx.conf se genera con RUN (no con COPY) para evitar un bug de
# BuildKit en el servidor de Dokploy: "COPY nginx.conf" fallaba de forma
# intermitente con "failed to calculate checksum of ref ...: not found",
# un problema de caché de build a nivel del propio Docker del servidor,
# no de este repo. RUN no depende de esa referencia de contexto rota.
RUN cat <<'NGINXCONF' > /etc/nginx/nginx.conf
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location ~* \.(js|mjs)$ {
            add_header Content-Type application/javascript;
        }
    }
}
NGINXCONF

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]