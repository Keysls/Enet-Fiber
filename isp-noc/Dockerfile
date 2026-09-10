# syntax=docker/dockerfile:1.4
# Etapa 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# package*.json se monta con --mount en vez de COPY: el mismo bug de
# caché rota de BuildKit en el servidor de Dokploy que afectaba a
# nginx.conf también afecta este COPY de forma intermitente (el paso
# reporta éxito pero el archivo no está realmente ahí para npm). El
# bind mount lee el archivo directo del contexto al momento de correr
# el RUN, sin pasar por el mecanismo de caché de capas que falla.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    npm install

COPY . .

# Recibe la variable desde Dokploy y la expone al build de Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

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