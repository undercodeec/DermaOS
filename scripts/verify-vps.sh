#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

service_name="${DERMA_API_SERVICE:-derma-api}"
local_api_url="${DERMA_LOCAL_API_URL:-http://127.0.0.1:4000}"
public_api_url="${DERMA_PUBLIC_API_URL:-}"
dashboard_url="${DERMA_DASHBOARD_URL:-}"
app_origin="${DERMA_APP_ORIGIN:-}"
local_api_url="${local_api_url%/}"
public_api_url="${public_api_url%/}"
dashboard_url="${dashboard_url%/}"

for command_name in git node pnpm curl systemctl; do
  command -v "$command_name" >/dev/null || {
    printf 'Falta el comando requerido: %s\n' "$command_name" >&2
    exit 1
  }
done

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  printf 'El repositorio contiene cambios rastreados sin publicar.\n' >&2
  git status --short
  exit 1
fi

printf 'Commit activo: '
git log -1 --oneline

printf 'Node: %s\n' "$(node --version)"
printf 'pnpm: %s\n' "$(pnpm --version)"

pnpm --filter @derma-os/api exec prisma migrate status

if ! systemctl is-active --quiet "$service_name"; then
  printf 'El servicio %s no esta activo.\n' "$service_name" >&2
  systemctl status "$service_name" --no-pager || true
  exit 1
fi

health_body="$(curl --fail --silent --show-error "$local_api_url/health")"
if [[ "$health_body" != *'"ok":true'* ]]; then
  printf 'Respuesta inesperada de /health: %s\n' "$health_body" >&2
  exit 1
fi

headers="$(curl --fail --silent --show-error --dump-header - --output /dev/null "$local_api_url/health" | tr -d '\r')"
for required_header in 'x-content-type-options: nosniff' 'x-frame-options: DENY' 'content-security-policy:'; do
  if ! grep -qi "^${required_header}" <<<"$headers"; then
    printf 'Falta header de seguridad: %s\n' "$required_header" >&2
    exit 1
  fi
done

if [[ -n "$app_origin" ]]; then
  cors_headers="$(curl --fail --silent --show-error --dump-header - --output /dev/null \
    --header "Origin: $app_origin" "$local_api_url/health" | tr -d '\r')"
  if ! grep -Fqi "access-control-allow-origin: $app_origin" <<<"$cors_headers"; then
    printf 'CORS no autorizo el origen esperado: %s\n' "$app_origin" >&2
    exit 1
  fi
fi

if [[ -n "$public_api_url" ]]; then
  curl --fail --silent --show-error "$public_api_url/health" >/dev/null
fi

if [[ -n "$dashboard_url" ]]; then
  curl --fail --silent --show-error "$dashboard_url" >/dev/null
fi

printf 'Verificacion VPS completada correctamente.\n'
