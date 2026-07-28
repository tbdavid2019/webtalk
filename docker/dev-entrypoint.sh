#!/bin/sh
set -eu

cp /app/docker/nginx.conf.template /etc/nginx/http.d/default.conf

nginx

exec pnpm dev --host 0.0.0.0
