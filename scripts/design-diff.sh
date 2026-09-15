#!/usr/bin/env bash
# O que mudou no design entre dois .pen: digests, telas e composição.
#
# uso: scripts/design-diff.sh <base.pen> <head.pen> <saída>
#      RENDER=false scripts/design-diff.sh ...   # sem PEN_CLI_KEY (PR de fork)
#
# O .pen da base precisa estar dentro da própria árvore (um worktree, não um
# `git show` para /tmp): ele resolve ./assets/* relativo a si mesmo, e o render
# sairia sem imagem nenhuma, em silêncio.
#
# Em <saída>:
#   base/ head/     digests (pen-digest.sh), screens.tsv, png/, outline/
#   screens.md      a tabela de telas que vai no comentário
#   changed.tsv     <slug><TAB><nome> das telas cujo render mudou
#   summary.md      o diff exato: tokens, inventário, componentes, composição
#   artifact/       só o que difere: PNGs e outlines das telas, mais os digests
#
# Quatro camadas; o diff do arquivo inteiro seria ruído de coordenada.
#
#   tokens      cor/escala trocada, token ou tema adicionado/removido
#   inventário  componente adicionado/removido/renomeado
#   componentes mudança DENTRO de um componente (o padding do Chip), que não
#               aparece nas duas anteriores
#   composição  o que mudou DENTRO de uma tela: componente que entrou, saiu ou
#               trocou de lugar, gap e padding de container
set -euo pipefail

here=$(dirname "$0")
base_pen="${1:?base.pen}"
head_pen="${2:?head.pen}"
out="${3:?diretório de saída}"
render="${RENDER:-true}"

slug() { printf '%s' "$1" | LC_ALL=C tr -cs 'A-Za-z0-9' '-' | sed 's/^-//; s/-$//' | tr 'A-Z' 'a-z'; }
pen_of() { [ "$1" = base ] && echo "$base_pen" || echo "$head_pen"; }
# awk e não `cut | grep -q`: sob pipefail, o grep que sai cedo dá SIGPIPE no cut
has_screen() { awk -F'\t' -v n="$2" '$2 == n { found = 1 } END { exit !found }' "$out/$1/screens.tsv"; }

rm -rf "$out"
mkdir -p "$out/base" "$out/head" "$out/artifact"

# --- telas ------------------------------------------------------------------
# A lista sai de cada lado, não de uma constante: uma lista só para os dois
# deixaria tela nova fora do render, e pôr a tela nova nela derrubaria o render
# da base, onde ela ainda não existe. Identidade é o NOME: tela renomeada
# aparece como removida + adicionada.
for side in base head; do
  pen=$(pen_of "$side")
  "$here/pen-digest.sh" "$pen" "$out/$side"
  "$here/pen-screens.sh" "$pen" > "$out/$side/screens.tsv"
  if [ "$render" != true ] || [ ! -s "$out/$side/screens.tsv" ]; then continue; fi

  PEN_NODES=$(cut -f2 "$out/$side/screens.tsv" | paste -sd';') \
    "$here/pen-export.sh" "$pen" "$out/$side/png" 1 >&2
  # o Export grava <id>.png; aqui o arquivo passa a ter o nome da tela
  while IFS=$'\t' read -r id name; do
    dest="$out/$side/png/$(slug "$name").png"
    if [ -e "$dest" ]; then
      echo "duas telas viram $(basename "$dest") em $side — renomeie uma no design" >&2
      exit 1
    fi
    mv "$out/$side/png/$id.png" "$dest"
  done < "$out/$side/screens.tsv"
done

# Mesmo CLI, mesma máquina: o render é determinístico, e bytes iguais são tela
# igual. Só o que difere vai para o artefato — com muitas telas, os pares
# idênticos afogariam as poucas que mudaram.
rows=""; same=""; unrendered=""; : > "$out/changed.tsv"
while IFS= read -r name; do
  s=$(slug "$name")
  b="$out/base/png/$s.png"; h="$out/head/png/$s.png"
  if ! has_screen base "$name"; then
    state=adicionada; file="head/$s.png"
    if [ "$render" = true ]; then install -D "$h" "$out/artifact/$file"; fi
  elif ! has_screen head "$name"; then
    state=removida; file="base/$s.png"
    if [ "$render" = true ]; then install -D "$b" "$out/artifact/$file"; fi
  elif [ "$render" != true ]; then
    unrendered="${unrendered:+$unrendered, }$name"; continue
  elif cmp -s "$b" "$h"; then
    same="${same:+$same, }$name"; continue
  else
    state=mudou; file="{base,head}/$s.png"
    install -D "$b" "$out/artifact/base/$s.png"
    install -D "$h" "$out/artifact/head/$s.png"
    printf '%s\t%s\n' "$s" "$name" >> "$out/changed.tsv"
  fi
  if [ "$render" != true ]; then file="—"; fi
  rows+="| $name | $state | \`$file\` |"$'\n'
done < <(cat "$out/base/screens.tsv" "$out/head/screens.tsv" | cut -f2 | LC_ALL=C sort -u)

{
  echo "### Telas"; echo
  if [ -n "$rows" ]; then
    echo "| tela | render | no artefato |"; echo "|---|---|---|"
    printf '%s' "$rows"
  else
    echo "_nenhuma tela mudou no render_"
  fi
  if [ -n "$same" ]; then echo; echo "Sem mudança no render: $same"; fi
  if [ -n "$unrendered" ]; then echo; echo "Não comparadas (render desligado, sem PEN_CLI_KEY): $unrendered"; fi
} > "$out/screens.md"

# --- diff exato ---------------------------------------------------------------
# Comentário de PR estoura em 65536 chars; cada seção tem teto próprio.
emit() {  # título, arquivo relativo a base/ e head/, teto de linhas
  local max=${3:-120} d n
  echo "### $1"; echo
  if diff -q "$out/base/$2" "$out/head/$2" >/dev/null; then
    echo '_sem mudança_'
  else
    # diff sai 1 quando há diferença, que é justamente o caso: sob pipefail,
    # sem o `|| true` isso derruba o script em silêncio
    d=$(diff -u "$out/base/$2" "$out/head/$2" | tail -n +3 || true)
    n=$(printf '%s\n' "$d" | wc -l)
    echo '```diff'
    printf '%s\n' "$d" | head -"$max"
    echo '```'
    if [ "$n" -gt "$max" ]; then echo "_+$((n - max)) linhas omitidas — veja o artefato._"; fi
  fi
  echo
}

# Composição só das telas cujo render mudou, sobre o esqueleto do
# pen-outline.py: a árvore instanciada daria milhares de linhas, e para tela
# igual o diff seria vazio de qualquer jeito. Tela nova ou removida não entra —
# o diff seria a tela inteira. Render diferente com composição igual é mudança
# de componente ou token, e as camadas acima dizem qual: essas telas viram uma
# linha, senão uma troca de token daria N seções vazias. Composição mudando em
# muitas telas de uma vez é raro; o teto de 5 seções segura o comentário.
composition() {
  local same="" over="" shown=0 s name f
  while IFS=$'\t' read -r s name; do
    f="outline/$s.json"
    mkdir -p "$out/base/outline" "$out/head/outline"
    "$here/pen-outline.py" "$base_pen" "$name" > "$out/base/$f"
    "$here/pen-outline.py" "$head_pen" "$name" > "$out/head/$f"
    install -D "$out/base/$f" "$out/artifact/base/$f"
    install -D "$out/head/$f" "$out/artifact/head/$f"
    if diff -q "$out/base/$f" "$out/head/$f" >/dev/null; then
      same="${same:+$same, }$name"
    elif [ "$shown" -lt 5 ]; then
      emit "Composição — $name" "$f" 60; shown=$((shown + 1))
    else
      over="${over:+$over, }$name"
    fi
  done < "$out/changed.tsv"
  if [ -n "$over" ]; then echo "Composição mudou também em: $over — diff no artefato."; echo; fi
  if [ -n "$same" ]; then echo "Render mudou, composição igual (a causa está nas camadas acima): $same"; echo; fi
}

{
  emit Tokens tokens.json
  emit "Inventário de componentes" inventory.txt
  emit "Estrutura dos componentes" components.json
  composition
} > "$out/summary.md"

for side in base head; do
  for f in tokens.json inventory.txt components.json screens.tsv; do
    install -D "$out/$side/$f" "$out/artifact/$side/$f"
  done
done

cat "$out/screens.md"; echo; cat "$out/summary.md"
