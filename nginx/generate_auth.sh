#!/bin/sh
set -e

if [ -n "$BASIC_AUTH_USER" ] && [ -n "$BASIC_AUTH_PASS" ]; then
    echo "Generating .htpasswd for user: $BASIC_AUTH_USER"
    htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS"
else
    echo "BASIC_AUTH_USER or BASIC_AUTH_PASS not set. Skipping .htpasswd generation."
fi
