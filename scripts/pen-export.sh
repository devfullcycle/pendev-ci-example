#!/usr/bin/env bash
# Exporta nós nomeados de um .pen (telas ou componentes), headless.
#
# uso: scripts/pen-export.sh <arquivo.pen> <saida> [escala] [formato]
#      PEN_NODES="Nó A;Nó B" scripts/pen-export.sh design.pen ./out 1 png
#
# formato png|jpeg|webp|pdf  -> <saida> é um DIRETÓRIO, um arquivo por nó
# formato html-tailwind|html-css -> <saida> é um ARQUIVO, todos os nós nele
#
# Requer pen.dev CLI >= 0.3.5. Em 0.3.2 um .pen com fills de imagem relativos
# carrega VAZIO sem erro fatal ("Base URI must be absolute"), então a versão é
# checada antes de qualquer coisa — falha silenciosa em CI é pior que falha alta.
set -euo pipefail

PEN_FILE=$(realpath "${1:?arquivo .pen}")
OUT_DIR=$(realpath -m "${2:?diretório de saída}")
SCALE="${3:-1}"
FORMAT="${4:-png}"
NODES="${PEN_NODES:-Channel — Videos;Channel — Home}"

have=$(pen version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | tail -1)
need=0.3.5
if [ "$(printf '%s\n%s\n' "$need" "$have" | sort -V | head -1)" != "$need" ]; then
  echo "pen CLI $have < $need — atualize com: npm i -g @pen.dev/cli" >&2
  exit 1
fi

case "$FORMAT" in
  html-*) mkdir -p "$(dirname "$OUT_DIR")" ;;
  *)      mkdir -p "$OUT_DIR" ;;
esac

# "A;B" -> "A","B"
names=$(printf '%s' "$NODES" | awk -F';' '{for(i=1;i<=NF;i++) printf "%s\"%s\"", (i>1?",":""), $i}')

read -r -d '' js <<JS || true
const want=[$names];
const ids=[];
Get((n,c)=>{c.skipChildren(); if(want.indexOf(n.name)>=0) ids.push(n.id)});
Print("RESOLVED", ids.length, "OF", want.length);
Export(ids, "$FORMAT", "$OUT_DIR", {scale: $SCALE});
JS

log=$(mktemp)
printf 'execute({ input: %s })\nexit()\n' "'$(printf '%s' "$js" | tr '\n' ' ')'" \
  | pen interactive --in "$PEN_FILE" --out "$(mktemp -u /tmp/pen-throwaway-XXXXXX.pen)" \
  > "$log" 2>&1 || true

grep -E 'RESOLVED|Exported' "$log" || true

resolved=$(grep -oE 'RESOLVED [0-9]+ OF [0-9]+' "$log" | head -1)
if [ -z "$resolved" ]; then
  echo "o .pen não carregou — log completo:" >&2; cat "$log" >&2; exit 1
fi
got=$(echo "$resolved" | awk '{print $2}'); want_n=$(echo "$resolved" | awk '{print $4}')
if [ "$got" != "$want_n" ]; then
  echo "só $got de $want_n nós resolvidos — algum foi renomeado no design?" >&2
  echo "esperado: $NODES" >&2
  exit 1
fi
echo "ok: $got nó(s) -> $OUT_DIR ($FORMAT)"
