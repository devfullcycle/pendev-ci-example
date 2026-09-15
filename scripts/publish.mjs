// Publica o resultado do Design check. O agente não posta nada: ele escreve
// arquivos, e este script publica — então a publicação é determinística, sai
// mesmo se o agente falhar, e dá para deduplicar entre pushes.
//
//   node scripts/publish.mjs <work-dir>
//
// Env do Actions: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH,
// GITHUB_API_URL, GITHUB_SERVER_URL, GITHUB_RUN_ID, GITHUB_STEP_SUMMARY.
// Env do workflow:
//   CHECK_MODE     pr (comenta no PR) | summary (PR de fork: token só leitura,
//                  o relatório vai para o job summary)
//   CHECK_DRAFT    true | false
//   AGENT_OUTCOME  outcome do passo do agente; vazio ou skipped = não rodou
//
// Lê de <work-dir>, tudo opcional — publica o que existir:
//   design/screens.md design/summary.md design/artifact/   design-diff.sh
//   numeric.md scan.md                                    auditoria
//   human.md findings.json                                agente
//
// Escreve <work-dir>/verdict.json, que o passo final usa para o status.
//
// Por que marcadores ocultos e não o autor: o autor depende do token (os
// inline antigos saíam como claude[bot], os comentários como
// github-actions[bot]), e comentário que fica outdated perde o `line` — só o
// texto guarda a identidade.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, normalize } from "node:path";

const MARKER = "<!-- design-check -->";
const FINDING_MARKER = /<!-- design-check:finding ([0-9a-f]{16}) -->/;
const COMMENT_LIMIT = 65000; // o GitHub recusa corpo acima de 65536 chars

const work = process.argv[2];
if (!work) {
  console.error("uso: publish.mjs <work-dir>");
  process.exit(2);
}
const env = process.env;
const mode = env.CHECK_MODE ?? "pr";
const draft = env.CHECK_DRAFT === "true";
const agentRan = !!env.AGENT_OUTCOME && env.AGENT_OUTCOME !== "skipped";

const read = (rel) => {
  const path = join(work, rel);
  return existsSync(path) ? readFileSync(path, "utf8").trim() : null;
};

// --- achados ------------------------------------------------------------------
// Cada achado é validado contra o repositório: arquivo que não existe ou linha
// fora do arquivo é erro do agente, e não pode virar comentário.
function loadFindings() {
  const raw = read("findings.json");
  if (!agentRan) return { valid: [], invalid: [], missing: false };
  if (raw === null) return { valid: [], invalid: [], missing: true };
  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    return { valid: [], invalid: [], missing: true };
  }
  if (!Array.isArray(list)) return { valid: [], invalid: [], missing: true };

  const valid = [];
  const invalid = [];
  for (const f of list) {
    const reason = validate(f);
    if (reason) invalid.push({ finding: f, reason });
    else valid.push({ ...f, path: normalize(f.path), key: keyOf(normalize(f.path), f) });
  }
  return { valid, invalid, missing: false };
}

function validate(f) {
  if (!f || typeof f !== "object") return "não é objeto";
  if (typeof f.path !== "string" || !f.path) return "path ausente";
  const path = normalize(f.path);
  if (path.startsWith("..") || path.startsWith("/")) return `path fora do repositório: ${f.path}`;
  if (!existsSync(path) || !statSync(path).isFile()) return `arquivo não existe: ${f.path}`;
  if (!Number.isInteger(f.line) || f.line < 1) return `line inválida: ${f.line}`;
  const lines = readFileSync(path, "utf8").split("\n").length;
  if (f.line > lines) return `line ${f.line} além do fim de ${f.path} (${lines} linhas)`;
  if (!Number.isInteger(f.rule) || f.rule < 1 || f.rule > 10) return `rule fora de 1–10: ${f.rule}`;
  if (typeof f.title !== "string" || !f.title.trim()) return "title vazio";
  if (typeof f.body !== "string" || !f.body.trim()) return "body vazio";
  return null;
}

// A chave sobrevive a linhas inseridas acima (não usa o número da linha) e a
// o agente escrever o mesmo achado com outras palavras (não usa o texto dele).
// Dois achados da mesma regra em linhas idênticas do mesmo arquivo colidem —
// e diriam a mesma coisa.
function keyOf(path, f) {
  const text = readFileSync(path, "utf8").split("\n")[f.line - 1].trim();
  return createHash("sha1").update(`${path}\0${f.rule}\0${text}`).digest("hex").slice(0, 16);
}

// --- API do GitHub ------------------------------------------------------------
const api = env.GITHUB_API_URL ?? "https://api.github.com";
const repo = env.GITHUB_REPOSITORY;

async function gh(method, path, body) {
  const res = await fetch(path.startsWith("http") ? path : `${api}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "design-check",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} ${await res.text()}`);
  return { data: res.status === 204 ? null : await res.json(), link: res.headers.get("link") };
}

async function paginate(path) {
  const out = [];
  let next = `${path}${path.includes("?") ? "&" : "?"}per_page=100`;
  while (next) {
    const { data, link } = await gh("GET", next);
    out.push(...data);
    next = link?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }
  return out;
}

// Comentário de review só é aceito em linha que aparece no diff do PR (linha
// adicionada ou de contexto, lado direito). Fora disso a API devolve 422 e
// derruba a review inteira — então isso é decidido antes de postar.
function diffLines(files) {
  const lines = new Map();
  for (const file of files) {
    const valid = new Set();
    let next = 0;
    for (const row of (file.patch ?? "").split("\n")) {
      const hunk = row.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) next = Number(hunk[1]);
      else if (row.startsWith("+") || row.startsWith(" ")) valid.add(next++);
    }
    lines.set(file.filename, valid);
  }
  return lines;
}

// --- relatório ----------------------------------------------------------------
const indent = (s) => s.split("\n").map((l) => (l ? `  ${l}` : l)).join("\n");

function report({ findings, placement, sha, baseRef }) {
  // O título da seção é daqui. Se o agente abrir o human.md com um título
  // próprio, ele sai — senão a seção aparece com dois títulos.
  const human = read("human.md")?.replace(/^#{1,6} [^\n]*\n+/, "") || null;
  const screens = read("design/screens.md");
  const summary = read("design/summary.md");
  const numeric = read("numeric.md");
  const scan = read("scan.md");
  const designRan = summary !== null;
  const numericError = numeric?.includes("**erro:**") ?? false;

  const parts = [];
  const status = [];
  if (mode === "summary") {
    status.push("**PR de fork.** O GitHub não entrega secrets a forks, então rodou só o que não precisa deles: o diff textual do design e a varredura do código, sem verificação. A auditoria completa roda em PR do próprio repositório.");
  } else if (draft) {
    status.push("**Rascunho.** Só a parte mecânica do design. Leitura, medição da app e auditoria rodam quando o PR for marcado como pronto.");
  } else if (agentRan) {
    if (env.AGENT_OUTCOME !== "success" || findings.missing) {
      status.push("**A auditoria não terminou** — o agente falhou ou não gravou um `findings.json` válido. O que está abaixo é o resultado mecânico.");
    } else if (findings.valid.length === 0) {
      status.push("**Nenhum achado** nas regras do §12.");
    } else {
      const { inline, known, outside } = placement;
      status.push(`**${findings.valid.length} achado(s)**: ${inline.length} novo(s) em linha do diff, ${known.length} já comentado(s) antes, ${outside.length} fora do diff${outside.length ? " (abaixo)" : ""}.`);
    }
    if (findings.invalid.length) status.push(`${findings.invalid.length} achado(s) do agente vieram malformados e não foram publicados (abaixo).`);
    if (numericError) status.push("A medição da app não rodou até o fim (detalhe abaixo).");
  }

  parts.push(`${MARKER}\n## Design check · \`${baseRef}\` ← \`${sha.slice(0, 7)}\``);
  if (status.length) parts.push(status.join(" "));

  if (designRan && agentRan) {
    parts.push(`### O que mudou no design\n\n${human ?? "_a leitura automática não foi gerada_"}`);
  }

  if (placement.outside.length) {
    const server = env.GITHUB_SERVER_URL ?? "https://github.com";
    const items = placement.outside.map((f) => {
      const url = `${server}/${repo}/blob/${sha}/${f.path}#L${f.line}`;
      return `- **Regra ${f.rule}** · [\`${f.path}:${f.line}\`](${url}) — ${f.title}\n${indent(f.body.trim())}`;
    });
    parts.push(`### Achados fora do diff\n\nEstes arquivos não mudaram nestas linhas, então o GitHub não aceita comentário inline — é código que ficou para trás do design.\n\n${items.join("\n")}`);
  }

  if (findings.invalid.length) {
    const items = findings.invalid.map(({ finding, reason }) =>
      `- ${reason}\n${indent("```json\n" + JSON.stringify(finding, null, 2) + "\n```")}`);
    parts.push(`### Achados malformados\n\n${items.join("\n")}`);
  }

  if (screens) parts.push(screens);

  if (numeric) {
    parts.push(numericError ? numeric : `<details><summary>Comparação numérica</summary>\n\n${numeric}\n\n</details>`);
  }

  // Com o agente, a varredura já foi verificada e virou achado; sem ele (fork),
  // ela é o único retorno sobre o código.
  if (scan && !agentRan) parts.push(`${scan}\n\n_Ocorrências, não achados: sem o agente, ninguém verificou se cada uma é violação ou uso correto._`);

  const exact = summary ? `<details><summary>Diff exato (tokens, inventário, componentes, composição)</summary>\n\n${summary}\n\n</details>` : null;
  const artifactDir = join(work, "design/artifact");
  const hasPng = existsSync(artifactDir) && walk(artifactDir).some((f) => f.endsWith(".png"));
  const runUrl = `${env.GITHUB_SERVER_URL ?? "https://github.com"}/${repo}/actions/runs/${env.GITHUB_RUN_ID}#artifacts`;
  const artifact = designRan
    ? hasPng
      ? `Renders antes/depois das telas acima: [artefato do run](${runUrl})`
      : `Digests do design: [artefato do run](${runUrl})`
    : null;

  let body = [...parts, exact, artifact].filter(Boolean).join("\n\n");
  if (body.length > COMMENT_LIMIT && exact) {
    body = [...parts, "_O diff exato passou do limite de tamanho do comentário — está no artefato._", artifact].filter(Boolean).join("\n\n");
  }
  if (body.length > COMMENT_LIMIT) {
    body = `${body.slice(0, COMMENT_LIMIT - 200)}\n\n_…comentário cortado no limite do GitHub; o resto está no log do job._`;
  }
  return body;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

const inlineBody = (f) => `**Regra ${f.rule} do §12 — ${f.title}**\n\n${f.body.trim()}\n\n<!-- design-check:finding ${f.key} -->`;

// --- principal ----------------------------------------------------------------
const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
const pr = event.pull_request;
const sha = pr.head.sha;
const baseRef = pr.base.ref;
const findings = loadFindings();
const verdict = { findings: findings.valid.length, invalid: findings.invalid.length, agentMissing: agentRan && findings.missing, postErrors: 0 };
const placement = { inline: [], known: [], outside: [] };

if (mode === "summary") {
  placement.outside = findings.valid;
  const body = report({ findings, placement, sha, baseRef }).replace(`${MARKER}\n`, "");
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${body}\n`);
  console.log(body);
} else {
  const base = `/repos/${repo}`;
  if (findings.valid.length) {
    const lines = diffLines(await paginate(`${base}/pulls/${pr.number}/files`));
    const known = new Set((await paginate(`${base}/pulls/${pr.number}/comments`))
      .map((c) => c.body?.match(FINDING_MARKER)?.[1]).filter(Boolean));
    for (const f of findings.valid) {
      if (!lines.get(f.path)?.has(f.line)) placement.outside.push(f);
      else if (known.has(f.key)) placement.known.push(f);
      else placement.inline.push(f);
    }
  }

  if (placement.inline.length) {
    try {
      await gh("POST", `${base}/pulls/${pr.number}/reviews`, {
        commit_id: sha,
        event: "COMMENT",
        body: `<!-- design-check:review -->\nDesign check: ${placement.inline.length} achado(s) novo(s) neste push. O resumo está no comentário do PR.`,
        comments: placement.inline.map((f) => ({ path: f.path, line: f.line, side: "RIGHT", body: inlineBody(f) })),
      });
    } catch (err) {
      // não some: os achados vão para a lista do resumo, e o check fica vermelho
      console.error(err.message);
      verdict.postErrors += 1;
      placement.outside.push(...placement.inline);
      placement.inline = [];
    }
  }

  const body = report({ findings, placement, sha, baseRef });
  const mine = (await paginate(`${base}/issues/${pr.number}/comments`)).find((c) => c.body?.startsWith(MARKER));
  if (mine) await gh("PATCH", `${base}/issues/comments/${mine.id}`, { body });
  else await gh("POST", `${base}/issues/${pr.number}/comments`, { body });
  console.log(body);
}

writeFileSync(join(work, "verdict.json"), `${JSON.stringify(verdict)}\n`);
