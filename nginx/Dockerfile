FROM nginx:alpine
RUN apk add --no-cache apache2-utils
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
ARG BASIC_AUTH_USER
ARG BASIC_AUTH_PASS
RUN htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS"
