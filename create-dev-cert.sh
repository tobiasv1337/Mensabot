#!/bin/sh
# Create the development TLS certificate expected by the nginx image build.

mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/C=DE/ST=Berlin/L=Berlin/O=Mensabot/OU=Dev/CN=localhost"

echo "Generated development certificate: nginx/certs/selfsigned.crt and nginx/certs/selfsigned.key"
