FROM nginx:alpine
RUN apk add --no-cache apache2-utils
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx/certs/selfsigned.crt /etc/ssl/certs/selfsigned.crt
COPY nginx/certs/selfsigned.key /etc/ssl/private/selfsigned.key
COPY nginx/generate_auth.sh /docker-entrypoint.d/40-generate-auth.sh
RUN chmod +x /docker-entrypoint.d/40-generate-auth.sh
