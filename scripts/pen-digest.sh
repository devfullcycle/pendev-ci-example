#!/usr/bin/env bash
# Digests textuais de um .pen. É o ÚNICO lugar onde estes filtros existem: o
# diff do design e a auditoria leem daqui, então não têm como discordar sobre
# o que é um token ou um componente.
#
# uso: scripts/pen-digest.sh <arquivo.pen> <diretório>
#
#   tokens.json      {themes, variables}: o que cada token vale, em cada tema
#   inventory.txt    nomes dos componentes (`reusable`), ordenados
#   components.json  cada `reusable` inteiro, ordenado por nome, sem id/x/y
#
# id/x/y saem porque mudam a cada arrasto no editor e não se traduzem em
# código: com eles, o diff seria ruído de coordenada.
set -euo pipefail

pen="${1:?arquivo .pen}"
out="${2:?diretório de saída}"
mkdir -p "$out"

jq -S '{themes, variables}' "$pen" > "$out/tokens.json"
jq -r '[.. | objects | select(.reusable == true) | .name] | sort | .[]' \
  "$pen" > "$out/inventory.txt"
jq -S '[.. | objects | select(.reusable == true)] | sort_by(.name)
       | map(walk(if type == "object" then del(.id, .x, .y) else . end))' \
  "$pen" > "$out/components.json"
