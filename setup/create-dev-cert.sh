#!/bin/sh
# Create the development TLS certificate expected by the nginx image build.
#
# Defaults cover localhost access. For any other hostname or IP, provide
# extra SAN entries, for example:
#   MENSABOT_TLS_CN=mensabot.example.com \
#   MENSABOT_TLS_SANS=DNS:mensabot.example.com,IP:130.61.213.97 \
#   sh setup/create-dev-cert.sh

set -eu

mkdir -p nginx/certs

TLS_CN="${MENSABOT_TLS_CN:-localhost}"
TLS_SANS="DNS:localhost,IP:127.0.0.1"

if [ -n "${MENSABOT_TLS_SANS:-}" ]; then
  TLS_SANS="${TLS_SANS},${MENSABOT_TLS_SANS}"
fi

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/C=DE/ST=Berlin/L=Berlin/O=Mensabot/OU=Dev/CN=${TLS_CN}" \
  -addext "subjectAltName=${TLS_SANS}" \
  -addext "basicConstraints=critical,CA:FALSE" \
  -addext "keyUsage=critical,digitalSignature,keyEncipherment" \
  -addext "extendedKeyUsage=serverAuth"

echo "Generated development certificate: nginx/certs/selfsigned.crt and nginx/certs/selfsigned.key"
echo "CN=${TLS_CN}"
echo "SANs=${TLS_SANS}"
