#!/bin/sh
set -e

npx prisma migrate deploy

if [ "$USE_NGINX" = "true" ]; then
  # Render: Nginx가 외부 포트($PORT) 수신 → 내부 NestJS(3000)로 리버스 프록시
  LISTEN_PORT="${PORT:-80}"
  sed "s/__PORT__/$LISTEN_PORT/" /etc/nginx/templates/default.conf.template \
    > /etc/nginx/http.d/default.conf
  PORT=3000 node dist/main &
  exec nginx -g "daemon off;"
else
  # 로컬 docker-compose: 별도 nginx 컨테이너가 프록시하므로 NestJS만 실행
  exec node dist/main
fi
