FROM nginx:alpine
RUN apk add --no-cache apache2-utils
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/certs/selfsigned.crt /etc/ssl/certs/selfsigned.crt
COPY nginx/certs/selfsigned.key /etc/ssl/private/selfsigned.key
ARG BASIC_AUTH_USER
ARG BASIC_AUTH_PASS
RUN htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS"
