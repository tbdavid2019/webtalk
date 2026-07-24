#!/bin/sh
set -eu

envsubst '${ESG_API_ORIGIN} ${ESG_API_TOKEN}' \
  < /app/docker/nginx.conf.template \
  > /etc/nginx/http.d/default.conf

nginx

exec pnpm dev --host 0.0.0.0
