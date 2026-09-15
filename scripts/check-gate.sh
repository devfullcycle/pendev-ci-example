#!/usr/bin/env bash
# Decide o que o Design check roda neste PR. Imprime key=value, no formato do
# $GITHUB_OUTPUT, e um resumo legível em stderr.
#
# uso: DRAFT=true|false FORK=true|false scripts/check-gate.sh <base-ref>
#
#   design   o PR mexe no design ou no próprio pipeline: digests e diff
#   render   design, e há PEN_CLI_KEY (fork não recebe secret): PNGs e composição
#   scan     há o que auditar e o PR não é rascunho: regex sobre o código
#   deep     scan, e não é fork: components.html, medição da app e agente
#   pen      algum passo acima precisa do pen CLI
#   publish  algum passo acima produziu algo para publicar
#
# Rascunho roda só o mecânico do design: quem itera no .pen vê o antes/depois
# sem pagar build e agente a cada push. Mexer só em código num rascunho não
# roda nada.
set -euo pipefail

base="${1:?base ref}"
draft="${DRAFT:-false}"
fork="${FORK:-false}"

changed=$(git diff --name-only "$base...HEAD")
touches() { printf '%s\n' "$changed" | grep -qE "$1"; }

# scripts/ e o workflow entram nos dois lados: mudar o pipeline tem que
# exercitar o pipeline inteiro.
design=false
touches '^(design/pendev/|scripts/|\.github/workflows/design-check\.yml$)' && design=true

audit=$design
touches '^(app/|components/|design/DESIGN-SYSTEM\.md$|design/screen-routes\.json$)' && audit=true

yes() { "$@" && echo true || echo false; }
render=$(yes [ "$design" = true -a "$fork" = false ])
scan=$(yes [ "$audit" = true -a "$draft" = false ])
deep=$(yes [ "$scan" = true -a "$fork" = false ])
pen=$(yes [ "$render" = true -o "$deep" = true ])
publish=$(yes [ "$design" = true -o "$scan" = true ])

printf 'design=%s\nrender=%s\nscan=%s\ndeep=%s\npen=%s\npublish=%s\n' \
  "$design" "$render" "$scan" "$deep" "$pen" "$publish"
echo "arquivos: $(printf '%s\n' "$changed" | grep -c .) | rascunho=$draft fork=$fork | design=$design render=$render scan=$scan deep=$deep" >&2
