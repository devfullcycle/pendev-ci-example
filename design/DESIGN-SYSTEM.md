# Design System — como traduzir o `.pen` em código

O design é `design/pendev/youtube-channel.pen`. Este arquivo não é o design nem o
substitui: ele diz **como transformar o que está lá em Tailwind e React**, e onde
a tradução literal daria errado.

## 1. Como ler o design

O `.pen` é **JSON puro** com ids estáveis — a doc do formato o descreve como
*"a JSON structure, that describes an object tree, not unlike HTML or SVG"*, e
os ids persistem entre edições. Consequência prática: ele é diffável em git, e
os valores são consultáveis sem nenhuma ferramenta especial.

Três caminhos, por custo crescente:

- **Ler valores** → `jq '.variables' <arquivo>.pen`. Paleta e escalas inteiras,
  sem ferramenta nenhuma.
- **Consultar a árvore ou renderizar** → `pen interactive` do CLI, **headless**:

  ```bash
  printf 'execute({ input: %s })\nexit()\n' \
    "'Get((n,c)=>{c.skipChildren();Print(n.id,n.name)})'" \
  | pen interactive --in "$PWD/design/pendev/youtube-channel.pen" --out /tmp/x.pen
  ```

  Dá `execute` (com `Get`/`Export`), `get_app_state` e `browser`. Não precisa de
  editor aberto — é o que o CI usa (§14). **Exige CLI >= 0.3.5**: em 0.3.2 um
  `.pen` com fills de imagem relativos carrega vazio, sem erro fatal.
- **Editar** → MCP `pencil` com o arquivo aberto no editor, ou `pen interactive`
  com `save()`. Nunca edite o JSON à mão.

Leia sempre do `.pen`, nunca do CSS já escrito: o CSS é a transcrição, e se ele
estiver errado, deduzir dele propaga o erro.

O design foi medido de `youtube.com/@FullCycle` a 1440px, em light e dark. Os
tokens em CSS são escritos à mão em `app/globals.css`, transcritos do `.pen`.
Mudou o design? A transcrição é parte da tarefa, não um passo separado.

## 2. As cinco regras invioláveis

1. **Nenhum `dark:` no JSX.** Os tokens já são temáticos (o `.pen` define 20
   cores no eixo light/dark). Um `dark:` significa que faltou token semântico.
2. **Nenhum `#`, `rgb(` ou `hsl(` em `className`.** Cor crua não troca de tema:
   quebra o modo escuro em silêncio.
3. **Nenhum token que não exista no `.pen`.** Única exceção: §8.
4. **Nenhum componente que não exista no `.pen`.** Precisou de um? Pare e peça
   design (§9).
5. Geometria em px crus (`pt-[13px]`) é permitida **se o número vier do `.pen`**.
   Não é permitida como chute.

## 3. Cor

O `.pen` tem três camadas; só a semântica vira utilitário.

```css
:root { --grey-900: #0F0F0F; }          /* primitivo: sem utilitário */
:root { --surface-page: #FFFFFF; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --surface-page: var(--grey-900); }
}
:root[data-theme="dark"] { --surface-page: var(--grey-900); }

@theme inline { --color-surface-page: var(--surface-page); }
```

Os primitivos (`grey-*`, `red-*`, `blue-*`, `alpha-*`) ficam **fora do `@theme`
de propósito** — assim `bg-grey-950` não compila, e a regra "componente nunca usa
primitivo" (que o próprio design declara) se sustenta sem depender de review.

| família no `.pen` | uso | classe |
|---|---|---|
| `surface-*` | fundo | `bg-surface-page`, `bg-surface-chip` |
| `text-*` | texto e ícone | `text-text-secondary` |
| `border-*` | traço e divisória | `border-border-subtle` |
| `brand-*` / `accent-*` | marca | `text-brand-primary` |

Nomes são **1:1 com o `.pen`**: viu `$text-secondary`, escreve
`text-text-secondary`. A duplicação é feia e é intencional — não existe tabela
para ler errado.

O bloco `[data-theme="dark"]` ainda não é acionado por ninguém. Quando o menu
"More" do masthead for desenhado, o toggle vira um `setAttribute` sem mexer nos
tokens.

## 4. Espaço

A escala do `.pen` **é** a do Tailwind: `--spacing: 0.25rem` faz `p-N = N×4px`.
Não transcreva espaçamento nenhum.

- `$space-6` → `p-6`, `$space-2` → `gap-2`, `$space-05` → `p-0.5`
- A escala é dinâmica: `h-43` (172px) e `w-164` (656px) compilam sem config
- Os passos são de **4px**: `p-13` vale 52px, não 13px
- Valor fora da grade de 4 → `[Npx]`, desde que exista no `.pen`

⚠️ **Uma exceção**, e ela erra em silêncio:

| `.pen` | valor | não use | use |
|---|---|---|---|
| `$space-14` | **58px** | `p-14` (=56px) | `px-[58px]` |

É o gutter do Channel Header. Os outros `$space-N` batem com `p-N`.

## 5. Tipografia

O `.pen` guarda `fontSize` e `lineHeight` separados, mas sempre nos mesmos pares.
Em CSS, declare **papéis** com os dois juntos — uma classe só, impossível parear
errado:

```css
@theme {
  --text-body: 14px;   --text-body--line-height: 1.43;
  --text-title: 16px;  --text-title--line-height: 1.375;
}
```

| par no `.pen` | papel | onde |
|---|---|---|
| `font-size-md` + `line-height-body` | `text-body` | meta, handle, sidebar, descrição, chip |
| `font-size-lg` + `line-height-title` | `text-title` | título do card grid, aba, placeholder |
| `font-size-xl` + `line-height-heading` | `text-heading` | Section Header |
| `font-size-4xl` + `line-height-display` | `text-display` | nome do canal |
| `font-size-xs` + `line-height-caption` | `text-caption` | badge de duração, meta do shelf |

Pares que aparecem só nas folhas de especificação do board (`2xs`, `sm`, `lg+body`)
não são do produto — ignore.

⚠️ **Não use os nomes de tamanho do Tailwind achando que batem.** `font-size-lg`
do `.pen` é 16px; `text-lg` do Tailwind é 18px. `font-size-sm` é 13px; `text-sm`
é 14px. Por isso os papéis têm nomes próprios.

O **peso nunca entra no papel** — o mesmo papel aparece com pesos diferentes
(`title` é medium no card e regular no placeholder). Use `font-normal` /
`font-medium` / `font-bold`, nativos.

Família: o `.pen` declara `Roboto`. Carregue via `next/font/google` em
`app/layout.tsx` e aponte `--font-sans` para a variável gerada.

## 6. Radius e sombra

⚠️ **Os nomes do `.pen` estão deslocados em relação ao Tailwind.** Todo nome bate
com um valor diferente, e `rounded-lg` erra por 2×:

| `.pen` | valor | **não** use | use |
|---|---|---|---|
| `$radius-xs` | 4 | `rounded-xs` (2) | `rounded-sm` |
| `$radius-sm` | 8 | `rounded-sm` (4) | `rounded-lg` |
| `$radius-md` | 12 | `rounded-md` (6) | `rounded-xl` |
| `$radius-lg` | 16 | `rounded-lg` (8) | `rounded-2xl` |
| `$radius-nav` | 10 | — | `rounded-nav` (declare em `@theme`) |
| `$radius-full` | 999 | — | `rounded-full` |

Radius por canto (`cornerRadius=[full, 0, 0, full]` na Search Bar) vira
`rounded-l-full`.

Sombra: o `Button / Carousel` traz um hex cru (`#00000026`) dentro do `effect`.
Declare como `--shadow-carousel` em `@theme` — nunca inline. É a única sombra do
sistema.

## 7. Componentes

**Fronteira 1:1 com o `.pen`.** Cada frame `reusable` vira um componente React de
mesmo nome; o `/` do nome vira pasta.

```
Button / Icon      → components/button/icon.tsx
Button / Primary   → components/button/primary.tsx
Card / Video       → components/card/video.tsx
Badge / Overlay    → components/badge/overlay.tsx
Chip               → components/chip.tsx
```

Botão são **quatro** componentes, não um com variantes — é assim no design, é
assim no código. Assim "onde eu mexo quando o design de X mudar" deixa de ser
discussão.

### Props saem dos overrides

O `.pen` expressa estado e variante como override de descendente
(`descendants={...}`). A tradução é mecânica:

- override que **varia com o dado** → prop de dado (`title`, `meta`,
  `thumbnail`, `duration`)
- override que **covaria em bloco** → prop `variant`

O `Card / Video` é o caso completo: `fill` da thumbnail e `content` dos textos
são dado; `height`, `cornerRadius`, `fontSize`, `lineHeight` e `padding` covariam
em bloco entre a variante do grid e a do shelf.

```tsx
const VARIANT = {
  grid:  { thumb: "rounded-xl", title: "text-title", meta: "text-body",    info: "pr-[26px]" },
  shelf: { thumb: "rounded-lg", title: "text-body",  meta: "text-caption", info: "pr-0" },
} as const
```

### Componentes são fechados

**Sem prop `className`** — é o buraco por onde a disciplina de token vaza.
Largura, margem e posição são do **pai**: no `.pen`, `width="fill_container"`
está na instância, não no componente. Instância posicionada (o
`Button / Carousel` absoluto do shelf) ganha um wrapper no pai.

`'use client'` só nos interativos: `Tab`, `Chip`, `Search Bar`,
`Button / Carousel`. Os outros doze são apresentacionais.

## 8. Layout e larguras

O design existe **só a 1440px**. As regras de generalização saem do próprio
`.pen`:

| no `.pen` | no código |
|---|---|
| `width="fill_container"` | `flex-1` ou `w-full` |
| altura de thumbnail (201, 120.6) | **`aspect-video`** |
| linha de 3 cards | `grid-cols-[repeat(auto-fill,minmax(357px,1fr))]` |
| `size-sidebar` 240 | `w-60` fixa |

As alturas de thumbnail são 16:9 da largura do card, congeladas em px porque o
formato não tem primitiva de proporção (201 = 357.33×9/16). **Nunca escreva
`h-[201px]`**: só está correto a 1440.

Abaixo de ~1100px este documento é deliberadamente omisso. Sidebar em drawer e
masthead colapsado não existem no `.pen` — mobile exige design novo.

## 9. Estados e acessibilidade — a única exceção

O design não tem hover, focus, active nem disabled. Ainda assim, **estado de
interação é obrigação de engenharia, não escolha de design**:

```
autorizado sem pedir design:
  hover:bg-surface-hover
  focus-visible:ring-2 focus-visible:ring-focus
  active:  disabled:  motion-reduce:
```

`surface-hover` já existe no `.pen`. `focus-ring` é o **único** token que pode
ser criado sem passar pelo design — derive de `$blue-600` / `$blue-300`, que são
as cores de link do sistema. Fora dessa lista, a regra §2.3 vale integralmente.

## 10. Escopo — compor sim, inventar não

O `.pen` desenha 2 telas, mas os componentes declaram ~20 destinos navegáveis
(5 abas, 13 itens de sidebar).

- **Pode compor** telas novas com os componentes e tokens existentes
- **Não pode** introduzir componente ou token novo — aí para e pede design

Teste objetivo: *este arquivo introduz algum token ou componente que não existe
no `.pen`?* Se sim, é design, não implementação. A watch page cai do lado errado
dessa linha — player, barra de ações e comentários são componentes novos.

### Rotas

O mapa tela → página → URL é `design/screen-routes.json`. É por ele que o CI
mede a app (§14), então rota nova entra lá:

```json
"Channel — Videos": { "page": "app/[handle]/videos/page.tsx", "url": "/@FullCycle/videos" }
```

Tela com entrada e sem `page.tsx` aparece como "não implementada"; tela do
`.pen` sem entrada, como "sem entrada". Nenhum dos dois é erro. Erro é o
contrário: entrada para uma tela que o `.pen` não tem mais.

`[handle]` captura o segmento literal `@FullCycle`. **Nunca crie uma pasta
`@handle`** — no App Router `@folder` é slot de parallel route e não aparece na
URL. `params` é Promise: `await`. Tipos de props são globais e gerados
(`PageProps<"/[handle]">`); não escreva à mão.

## 11. Ícones e imagens

lucide-react é **normativo** — o `.pen` usa a biblioteca `lucide` e 16 glyphs
reais. O kebab vira PascalCase:

```tsx
"house" → <House className="size-6 text-text-secondary" />
```

O `.pen` diz `fill: $text-primary` no ícone, mas lucide desenha com
`stroke="currentColor"` — **`fill` de ícone vira classe de cor de texto**, nunca
prop `fill`. Tamanhos: `size-4` (16) e `size-6` (24).

Onde o design passa o glyph como dado (os itens da Sidebar), use um mapa
explícito nome→componente: só os ícones usados entram no bundle e um nome
inválido vira erro de tipo.

O wordmark do YouTube não é ícone lucide — são paths em
`design/pendev/logo-youtube.json`, três grupos tokenizados (`brand-primary`,
branco fixo, `text-primary`).

Imagens: as thumbnails são **dado**, não design. O componente recebe URL por
prop. Os arquivos de exemplo estão em `design/pendev/assets/`.

## 12. Ritual de verificação

Ao terminar uma tela:

1. `npm run dev`
2. Emular 1440×900 com `prefers-color-scheme: light` → screenshot
3. Emular `prefers-color-scheme: dark` → screenshot
4. Conferir as dez regras abaixo — `scripts/drift-scan.sh origin/main` roda
   localmente a mesma varredura do CI

O tema escuro é obrigatório: é onde um hex esquecido aparece.

### As dez regras

Esta é a lista canônica. O CI (§14) audita exatamente estas, **com estes
números**: o número entra na chave que evita repostar o mesmo achado a cada
push, então renumerar faz todo achado antigo voltar como novo. Regra nova entra
no fim.

Todas compilam e parecem certas — é por isso que passam em review.

| # | falha | regra de origem | quem pega no CI |
|---|---|---|---|
| 1 | cor crua em `className` (`#`, `rgb(`, `hsl(`) — quebra o tema escuro | §2.2, §3 | varredura + agente |
| 2 | variante `dark:` — faltou token semântico | §2.1 | varredura + agente |
| 3 | radius traduzido pelo nome, não pelo valor (`$radius-sm` é 8px → `rounded-lg`) | §6 | varredura + agente |
| 4 | `p-14` onde o design pede `$space-14` (58px, não 56px) | §4 | varredura + agente |
| 5 | `text-lg`, `text-sm`… usados achando que batem com o `.pen` | §5 | varredura + agente |
| 6 | altura fixa em thumbnail (`h-[201px]`) em vez de `aspect-video` | §8 | varredura + agente |
| 7 | token ou componente que não existe no `.pen` (exceção: §9) | §2.3, §2.4, §10 | varredura (`data-component`) + agente |
| 8 | prop `className` exposta em componente | §7 | varredura + agente |
| 9 | página que não bate com a composição da tela: componente faltando, ordem trocada, gap ou padding de container diferente | §10 | agente |
| 10 | valor que diverge do design: o componente existe e uma propriedade não bate — padding, gap, altura, cor, tipografia, px cru sem origem no `.pen` | §2.5, §13 | medição + agente |

## 13. Quando o design mudar

O `.pen` muda primeiro. Depois:

1. Abra o `.pen` no editor e leia o que mudou (§1)
2. Se mudou token, transcreva para `app/globals.css`
3. Se mudou componente, ajuste o componente de mesmo nome (§7)
4. Rode o ritual do §12 nos dois temas

Não há geração automática em lugar nenhum do caminho: cada passo acima é manual
e proposital. O `.pen` é sempre quem vence — se o CSS discorda dele, o CSS está
errado.

## 14. CI

Um workflow, `.github/workflows/design-check.yml`, responde duas perguntas: **o
que mudou no design** e **se o código acompanha o design**. Um job, um agente,
um comentário. Antes eram dois workflows com dois agentes, e os dois diziam a
quem revisa o que mudar no código — um deduzindo do diff do design, o outro
conferindo o código —, às vezes discordando. A lógica mora em `scripts/`: o
YAML só encadeia, e cada passo roda local (fim desta seção). O fluxo desenhado
está em `design/diagrams/design-check.excalidraw`.

### O que roda

`scripts/check-gate.sh` decide pelo que o PR mudou:

| o PR mexe em | diff do design | auditoria |
|---|---|---|
| `design/pendev/**`, `scripts/**`, o próprio workflow | sim | sim |
| `app/**`, `components/**`, este arquivo, `design/screen-routes.json` | não | sim |

- **Rascunho** roda só o diff do design, com render: quem itera no `.pen` vê o
  antes/depois sem pagar build e agente a cada push. Medição e agente rodam
  quando o PR sai de rascunho.
- **Fork** não recebe secret nem token de escrita. Roda o que não precisa deles
  — diff textual do design, sem render, e a varredura — e o relatório vai para
  o job summary. `pull_request_target` está fora de questão: o job faz
  `npm install` e build do código do PR, e um `postinstall` levaria as chaves.

### Diff do design — `scripts/design-diff.sh`

Não existe `pen diff`. A base é um **worktree** (não um `git show` para `/tmp`:
o `.pen` resolve `./assets/*` relativo à própria árvore, e o render sairia sem
imagem nenhuma — silenciosamente). São quatro camadas:

| camada | pega |
|---|---|
| tokens (`{themes, variables}`) | cor, escala ou tema trocado; token adicionado/removido |
| inventário de `reusable` | componente adicionado, removido, renomeado |
| estrutura de cada `reusable` (sem `id`/`x`/`y`) | mudança **dentro** de um componente |
| composição das telas que mudaram (`pen-outline.py`) | componente que entrou, saiu ou trocou de lugar numa tela |

As três primeiras saem de `scripts/pen-digest.sh`, o único lugar onde esses
filtros existem — diff e auditoria leem dele. A terceira existe porque as duas
primeiras têm um ponto cego: trocar o padding do Chip de `$space-3` para
`$space-4` não mexe em token nem em inventário.

A quarta depende do render. `scripts/pen-screens.sh` é a definição de **tela**:
frame de topo que não é `reusable` nem peça do board (`Sheet /`, `Label /`,
`Foundations`). A lista sai do próprio `.pen`, de cada lado, nunca de uma
constante — uma lista fixa deixa tela nova fora do relatório, em silêncio.
Cada tela sai como adicionada, removida ou mudou (bytes do PNG diferentes; o
render é determinístico). Identidade é o nome: renomear é removida +
adicionada. Só as que mudaram ganham diff de composição — a árvore instanciada
de todas daria milhares de linhas — e só os PNGs delas vão para o artefato.
Render diferente com composição igual quer dizer que a causa está num
componente ou token, nas três primeiras camadas.

`scripts/pen-export.sh` renderiza nós nomeados, headless; sem `PEN_NODES`,
todas as telas. Ele checa a versão do CLI e falha se algum nome pedido não
resolver. O `Export` grava `<id>.png`, não o nome — quem precisa do nome
renomeia.

### Auditoria

O agente recebe evidência em que cada arquivo é autoridade sobre uma coisa:

| arquivo | autoridade sobre |
|---|---|
| `components.html` | geometria e tipografia **resolvidas em px** (só tema claro) |
| `components.json` | qual **token** o design usa em cada propriedade |
| `tokens.json` | o que cada token vale em **light e dark** |
| `screens.json` | **composição** das telas: quais componentes, em que ordem |
| `numeric.md` | a app rodando, **medida** contra o design |
| `scan.md` | ocorrências mecânicas das regras 1 a 8 |

O HTML existe para o agente não ter que resolver `$radius-sm` → 8px sozinho —
errar essa resolução é literalmente a regra 3 que ele deveria estar auditando.

O `screens.json` existe porque os JSONs só olham `reusable`, e tela não é
reusable: sem ele a auditoria cobre componente e deixa página descoberta.
`scripts/pen-outline.py` o produz podando o conteúdo instanciado — títulos e
thumbnails são fixture, não design —, o que derruba as duas telas de canal de
~1700 para ~460 linhas. Tela montada à mão poda menos, então o agente pega uma
tela por vez com `jq`, nunca o arquivo inteiro.

- **Medição** — `scripts/measure-app.sh` sobe a app e `compare-styles.mjs`
  compara o `getComputedStyle` de cada `[data-component]` com o export do
  design, em cada página de `design/screen-routes.json` (§10). Divergência vira
  achado da regra 10; não conseguir medir (CDN, página que não responde, mapa
  desatualizado) é falha.
- **Varredura** — `scripts/drift-scan.sh`, regex das regras 1 a 8 sobre os
  arquivos do diff. Ocorrência, não achado: `rounded-lg` pode estar certo.
- **Agente** — `claude-code-action` verifica as ocorrências, transforma
  medição em achado, confere as regras 7 e 9 e, se o design mudou, procura o
  código que ficou para trás mesmo fora do diff. As regras não vão no prompt:
  o `CLAUDE.md` faz `@design/DESIGN-SYSTEM.md`, então este arquivo chega
  inteiro, e os números são os do §12. Ele **não posta**: escreve `human.md` (o
  que mudou no design, em px — nunca o que mudar no código) e `findings.json`
  (achados verificados, com arquivo, linha e regra). Por não postar, roda com o
  `github_token` do job: sem ele, a action troca OIDC pelo token do app do
  Claude, troca que exige o workflow idêntico ao do branch padrão — e em PR que
  mexe no workflow ela sai com "success" sem rodar nada.

### Publicação — `scripts/publish.mjs`

- Um comentário-resumo, **editado no lugar** a cada push.
- Achado em linha do diff vira comentário inline, numa review. Achado fora do
  diff — código que não mudou e ficou para trás — vai numa lista no resumo: a
  API recusa inline fora do diff.
- Inline só para achado **novo**. A chave é arquivo + regra + texto da linha:
  sobrevive a linha inserida acima e ao agente escrever o mesmo achado com
  outras palavras. Achado corrigido fica *outdated* sozinho.
- Resumo e achados são reconhecidos por marcador oculto no texto, não pelo
  autor: o autor depende do token, e comentário *outdated* perde o número da
  linha.

O check fica **vermelho** se houver achado, se o agente falhar ou se algum
passo quebrar — e o resultado mecânico é publicado em todos os casos. "Não
auditou" nunca pode parecer "passou", e o §1 já decidiu que a transcrição é
parte da tarefa: PR que muda o design sem acompanhar o código está incompleto.

Secrets: `PEN_CLI_KEY` e `ANTHROPIC_API_KEY`.

### Rodar local

```bash
git worktree add --detach ../base origin/main
scripts/design-diff.sh ../base/design/pendev/youtube-channel.pen \
  design/pendev/youtube-channel.pen /tmp/check/design
scripts/drift-scan.sh origin/main
APP_ORIGIN=http://localhost:3000 SKIP_BUILD=1 \
  scripts/measure-app.sh /tmp/check/audit/components.html /tmp/check/audit/screens.tsv
```

A evidência de `measure-app.sh` sai como no passo "Evidência" do workflow. Não
a gere dentro do repositório: o Tailwind varre o projeto atrás de classes, acha
as do export e quebra o build.

### A armadilha do `html-tailwind`

`Export(ids, "html-tailwind", ...)` produz um snapshot achatado: hex cru, zero
`var(--)`, px absoluto e só o tema claro. Cada nó vem marcado com
`data-pencil-name`, então dá para localizar um componente por nome.

```html
<div data-pencil-name="Chip"
     class="h-[32px] p-[0px_12px] bg-[#0000000D] rounded-[8px]">
```

**Serve para conferir números, nunca para copiar código** — colar dali viola as
regras 1 e 10 do §12 de uma vez. É por isso que o CI o entrega ao agente junto
com os JSONs, e não sozinho: o HTML diz *quanto é*, o JSON diz *qual token*.

### O que o CLI não faz em CI

A tool `browser` carrega uma URL real e devolve DOM e computed styles — seria o
jeito natural de comparar a app rodando contra o design. **Ela exige o app
desktop** e responde `not available in this environment` no CLI headless. Fechar
o loop visual em CI passa por renderizar a app com playwright, não pelo pen.

---

## O que ainda não existe no código

O repo é o scaffold do `create-next-app`. Antes de traduzir a primeira tela:

- [ ] `app/globals.css`: transcrever os tokens do `.pen` na estrutura do §3;
      remover os dois tokens do scaffold e a linha `font-family: Arial` do `body`
- [ ] `app/layout.tsx`: Roboto 400/500/700 no lugar de Geist Sans/Mono
- [ ] `package.json`: `lucide-react`
- [ ] `CLAUDE.md`: a linha do Geist no §Stack fica falsa depois disso
