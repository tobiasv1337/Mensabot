#!/bin/sh
# Create a self-signed SSL certificate for local development

mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/C=DE/ST=Berlin/L=Berlin/O=Mensabot/OU=Dev/CN=localhost"

echo "Zertifikat erstellt: nginx/certs/selfsigned.crt und .key"
