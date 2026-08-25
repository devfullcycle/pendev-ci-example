#!/usr/bin/env bash
# Pré-análise mecânica do drift. Seis das nove regras do DESIGN-SYSTEM.md §12
# são regex sobre o diff — fazê-las aqui é determinístico, grátis, e poupa o
# agente para as três que exigem julgamento contra o design.
#
#   uso: scripts/drift-scan.sh <base-ref> [arquivos...]
set -uo pipefail

BASE="${1:?base ref}"; shift
FILES=("$@")
if [ ${#FILES[@]} -eq 0 ]; then
  mapfile -t FILES < <(git diff --name-only "$BASE...HEAD" -- 'app/**' 'components/**' | grep -E '\.(tsx|ts|css)$' || true)
fi
[ ${#FILES[@]} -eq 0 ] && { echo "nenhum arquivo de código no diff"; exit 0; }

# Descarta linhas de comentário: o próprio código cita as regras nos
# comentários ("NÃO os 56px de p-14"), e isso casaria com os padrões.
strip_comments() {
  awk -F: '{ line = $0; sub(/^[^:]*:[0-9]+:/, "", line);
             gsub(/^[ \t]+/, "", line);
             if (line !~ /^(\/\/|\*|\/\*)/) print }'
}

hit() {  # regra, descrição, padrão
  local out
  out=$(grep -nE "$3" "${FILES[@]}" 2>/dev/null | strip_comments || true)
  if [ -n "$out" ]; then
    printf '\n## regra %s — %s\n%s\n' "$1" "$2" "$out"
  fi
}

echo "arquivos analisados: ${#FILES[@]}"
echo "${FILES[@]}" | tr ' ' '\n' | sed 's/^/  /'

{
hit 1 "cor crua em className (quebra o tema escuro)" \
    'className=[^>]*(#[0-9a-fA-F]{3,8}|rgb\(|hsl\()'
hit 2 "variante dark: (falta token semântico)" \
    '\bdark:'
hit 4 "p-14 e afins — \$space-14 é 58px, p-14 é 56px" \
    '\b[pmg][xytrbl]?-14\b'
hit 5 "nome de tamanho do Tailwind que NÃO bate com o .pen" \
    '\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b'
hit 6 "altura fixa onde o design é 16:9 — use aspect-video" \
    'h-\[[0-9]+px\]'
hit 8 "prop className exposta (componente deve ser fechado)" \
    'className\?:'
# rounded-nav e rounded-full não são ambíguos; os outros colidem com o .pen
hit 3 "radius na zona de colisão — conferir contra a tabela do §6" \
    '\brounded-(xs|sm|md|lg|xl|2xl|3xl)\b'
} > /tmp/drift-scan.txt

# Regra 7, metade mecânica: todo data-component precisa existir como frame
# reusable no .pen. O que o design não nomeia, o código não deveria inventar.
PEN="${PEN_FILE:-design/pendev/youtube-channel.pen}"
if [ -f "$PEN" ]; then
  jq -r '[.. | objects | select(.reusable == true) | .name] | sort | .[]' "$PEN" > /tmp/pen-names.txt
  grep -ohE 'data-component="[^"]+"' "${FILES[@]}" 2>/dev/null \
    | sed 's/data-component="//; s/"$//' | sort -u > /tmp/code-names.txt
  unknown=$(comm -23 /tmp/code-names.txt /tmp/pen-names.txt)
  if [ -n "$unknown" ]; then
    printf '\n## regra 7 — data-component sem frame correspondente no .pen\n%s\n' "$unknown" >> /tmp/drift-scan.txt
  fi
  printf '\n## componentes do design presentes neste diff\n%s\n' \
    "$(comm -12 /tmp/code-names.txt /tmp/pen-names.txt)" >> /tmp/drift-scan.txt
fi

if [ -s /tmp/drift-scan.txt ]; then
  echo; echo "=== ocorrências para o agente verificar ==="; cat /tmp/drift-scan.txt
else
  echo; echo "=== nenhuma ocorrência mecânica ==="
fi
