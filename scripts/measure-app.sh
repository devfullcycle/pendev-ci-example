#!/usr/bin/env bash
# Sobe a app e mede os componentes nas páginas de design/screen-routes.json.
#
# uso: scripts/measure-app.sh <components.html> <screens.tsv> > numeric.md
#      APP_ORIGIN=http://localhost:3100 SKIP_BUILD=1 ...   # app já rodando
#
# Saída 0: mediu (com ou sem divergência — divergência é achado, não falha).
# Saída 2: não conseguiu medir. A diferença importa: "não mediu" não pode
# parecer "mediu e está tudo certo".
set -uo pipefail

html="${1:?components.html}"
screens="${2:?screens.tsv}"
routes="${SCREEN_ROUTES:-design/screen-routes.json}"
origin="${APP_ORIGIN:-http://localhost:3000}"
here=$(dirname "$0")

compare() {
  node "$here/compare-styles.mjs" "$html" "$origin" "$routes" "$screens"
  local code=$?
  [ "$code" -eq 2 ] && exit 2
  exit 0
}

# Nenhuma página do mapa existe ainda: o comparador só lista o que não mediu,
# sem abrir navegador. Não vale pagar install e build para isso.
implemented=$(jq -r '.[].page' "$routes" | while read -r page; do [ -f "$page" ] && echo "$page"; done)
if [ -z "$implemented" ]; then
  compare
fi

if [ -z "${SKIP_BUILD:-}" ]; then
  # `npm ci` exige lock em sincronia, e npm de versões diferentes resolvem
  # dependências nativas opcionais (@emnapi/*) de formas diferentes. Isto é
  # verificação, não build de release: se o lock não bater, instalar mesmo
  # assim é melhor que não medir nada.
  { npm ci || npm install --no-audit --no-fund; } >&2 || exit 2
  npx playwright install chromium >&2 || exit 2
  npm run build >&2 || { echo "### Comparação numérica"; echo; echo "- **erro:** \`npm run build\` falhou"; exit 2; }

  port=$(node -e "console.log(new URL('$origin').port || 80)")
  npx next start -p "$port" >&2 &
  server=$!
  trap 'kill $server 2>/dev/null' EXIT

  for _ in $(seq 1 40); do
    curl -sf -o /dev/null "$origin/" && break
    sleep 2
  done
  if ! curl -sf -o /dev/null "$origin/"; then
    echo "### Comparação numérica"; echo; echo "- **erro:** a app não subiu em \`$origin\`"
    exit 2
  fi
fi

compare
