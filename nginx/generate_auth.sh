#!/bin/sh
set -e

if [ -n "$BASIC_AUTH_USER" ] && [ -n "$BASIC_AUTH_PASS" ]; then
    echo "Generating .htpasswd for user: $BASIC_AUTH_USER"
    htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS"
    cat > /etc/nginx/conf.d/auth.conf <<'EOF'
auth_basic "Restricted";
auth_basic_user_file /etc/nginx/.htpasswd;
EOF
else
    echo "BASIC_AUTH_USER or BASIC_AUTH_PASS not set. Disabling basic auth."
    cat > /etc/nginx/conf.d/auth.conf <<'EOF'
auth_basic off;
EOF
fi
