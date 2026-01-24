FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache apache2-utils
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
ARG BASIC_AUTH_USER
ARG BASIC_AUTH_PASS
RUN htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS"
COPY --from=build /app/dist /usr/share/nginx/html
