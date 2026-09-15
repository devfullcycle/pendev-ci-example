#!/usr/bin/env bash
# Varredura mecânica do código. Das dez regras do DESIGN-SYSTEM.md §12, sete
# são regex sobre o diff — fazê-las aqui é determinístico, grátis, e poupa o
# agente para as que exigem julgamento contra o design. A saída são
# OCORRÊNCIAS, não achados: `rounded-lg` pode estar certo; quem decide é o
# agente, ou quem lê o relatório de um PR de fork.
#
#   uso: scripts/drift-scan.sh <base-ref> [arquivos...]
#        INVENTORY=<inventory.txt> ...   # digest já pronto (pen-digest.sh)
#
# O lado do design (o que mudou no .pen) não é daqui: está no summary.md do
# design-diff.sh, calculado uma vez para o diff e para a auditoria.
set -uo pipefail

BASE="${1:?base ref}"; shift
FILES=("$@")
if [ ${#FILES[@]} -eq 0 ]; then
  mapfile -t FILES < <(git diff --name-only "$BASE...HEAD" -- 'app/**' 'components/**' | grep -E '\.(tsx|ts|css)$' || true)
fi

echo "### Varredura mecânica"; echo
if [ ${#FILES[@]} -eq 0 ]; then
  echo "_nenhum arquivo de código no diff_"
  exit 0
fi
echo "arquivos analisados: ${#FILES[@]}"
printf '%s\n' "${FILES[@]}" | sed 's/^/- `/; s/$/`/'

# Descarta linhas de comentário: o próprio código cita as regras nos
# comentários ("NÃO os 56px de p-14"), e isso casaria com os padrões.
strip_comments() {
  awk '{ line = $0; sub(/^[^:]*:[0-9]+:/, "", line);
         gsub(/^[ \t]+/, "", line);
         if (line !~ /^(\/\/|\*|\/\*)/) print }'
}

found=0
hit() {  # regra, descrição, padrão
  local out
  out=$(grep -HnE "$3" "${FILES[@]}" 2>/dev/null | strip_comments || true)
  if [ -n "$out" ]; then
    found=1
    printf '\n#### regra %s do §12 — %s\n```\n%s\n```\n' "$1" "$2" "$out"
  fi
}

hit 1 "cor crua em className (quebra o tema escuro)" \
    'className=[^>]*(#[0-9a-fA-F]{3,8}|rgb\(|hsl\()'
hit 2 "variante dark: (falta token semântico)" \
    '\bdark:'
# rounded-nav e rounded-full não são ambíguos; os outros colidem com o .pen
hit 3 "radius na zona de colisão — conferir contra a tabela do §6" \
    '\brounded-(xs|sm|md|lg|xl|2xl|3xl)\b'
hit 4 "p-14 e afins — \$space-14 é 58px, p-14 é 56px" \
    '\b[pmg][xytrbl]?-14\b'
hit 5 "nome de tamanho do Tailwind que NÃO bate com o .pen" \
    '\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b'
hit 6 "altura fixa onde o design é 16:9 — use aspect-video" \
    'h-\[[0-9]+px\]'
hit 8 "prop className exposta (componente deve ser fechado)" \
    'className\?:'

# Regra 7, metade mecânica: todo data-component precisa existir como frame
# reusable no .pen. O que o design não nomeia, o código não deveria inventar.
inventory="${INVENTORY:-}"
if [ -z "$inventory" ]; then
  tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
  "$(dirname "$0")/pen-digest.sh" "${PEN_FILE:-design/pendev/youtube-channel.pen}" "$tmp"
  inventory="$tmp/inventory.txt"
fi
code_names=$(grep -ohE 'data-component="[^"]+"' "${FILES[@]}" 2>/dev/null \
  | sed 's/data-component="//; s/"$//' | LC_ALL=C sort -u)
sorted_inventory=$(LC_ALL=C sort "$inventory")
unknown=$(LC_ALL=C comm -23 <(printf '%s\n' "$code_names" | grep .) <(printf '%s\n' "$sorted_inventory"))
if [ -n "$unknown" ]; then
  found=1
  printf '\n#### regra 7 do §12 — data-component sem frame correspondente no .pen\n%s\n' \
    "$(printf '%s\n' "$unknown" | sed 's/^/- `/; s/$/`/')"
fi
present=$(LC_ALL=C comm -12 <(printf '%s\n' "$code_names" | grep .) <(printf '%s\n' "$sorted_inventory"))
if [ -n "$present" ]; then
  printf '\n#### componentes do design presentes neste diff\n%s\n' \
    "$(printf '%s\n' "$present" | sed 's/^/- `/; s/$/`/')"
fi

if [ "$found" = 0 ]; then
  echo; echo "_nenhuma ocorrência mecânica_"
fi
