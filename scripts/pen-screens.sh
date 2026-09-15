#!/usr/bin/env bash
# Lista as telas de um .pen, uma por linha: "<id><TAB><nome>".
#
# uso: scripts/pen-screens.sh <arquivo.pen>
#
# Tela é frame de topo que não é `reusable` e não é peça do board. O board é
# excluído por nome, e não o contrário, de propósito: se aparecer uma folha
# nova de anotação, ela vira um PNG a mais no relatório — visível. Uma lista
# de telas por nome falharia do outro jeito: tela nova some, em silêncio.
#
# Por que não `width == 1440`: é verdade hoje (§8), mas a primeira tela mobile
# sumiria do relatório sem ninguém perceber.
set -euo pipefail

jq -r '
  .children[]
  | select(.type == "frame" and .reusable != true)
  | select(.name | test("^(Sheet|Label) / |^Foundations$") | not)
  | "\(.id)\t\(.name)"
' "${1:?arquivo .pen}"
