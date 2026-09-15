// Compara os valores computados do design contra os da app, em todas as
// páginas do mapa tela -> URL.
//
// Por que computado e não className: o design exporta `rounded-[8px]` e o
// código escreve `rounded-lg`. Strings diferentes, mesmo valor. O navegador é o
// compilador que normaliza os dois dialetos — comparar getComputedStyle compara
// o que o usuário vê, não como foi escrito.
//
//   node scripts/compare-styles.mjs <components.html> <origem-da-app> <screen-routes.json> <screens.tsv>
//
// O design é o lado que MANDA, e só nas propriedades que ele fixa: a classe do
// nó exportado diz quais são. Posição e largura nunca entram — o artboard é
// 1440 fixo e o layout do código é fluido por decisão (§8).
//
// Cada tela do .pen (screens.tsv, de pen-screens.sh) cai em um caso:
//   medida            tem entrada no mapa e a page.tsx existe
//   não implementada  tem entrada, mas a page.tsx ainda não existe
//   sem entrada       o mapa não a cita — visível no relatório, sem ser erro
// E um caso é erro: entrada no mapa para tela que o .pen não tem (renomeada?).
//
// Saída 0: sem divergência. 1: divergência (vira achado da regra 10).
// 2: não deu para medir — CDN, página que não responde, mapa desatualizado.
import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const [designPath, origin, routesPath, screensPath] = process.argv.slice(2);
if (!designPath || !origin || !routesPath || !screensPath) {
  console.error("uso: compare-styles.mjs <components.html> <origem-da-app> <screen-routes.json> <screens.tsv>");
  process.exit(2);
}

// propriedade -> como reconhecer, na classe do design, que ele a fixou
const WATCHED = [
  { prop: "borderRadius", when: /(^|\s)rounded-/ },
  { prop: "paddingTop", when: /(^|\s)p[ty]?-\[/ },
  { prop: "paddingBottom", when: /(^|\s)p[by]?-\[/ },
  { prop: "paddingLeft", when: /(^|\s)p[lx]?-\[/ },
  { prop: "paddingRight", when: /(^|\s)p[rx]?-\[/ },
  { prop: "columnGap", when: /(^|\s)gap-\[/ },
  { prop: "rowGap", when: /(^|\s)gap-\[/ },
  { prop: "fontSize", when: /(^|\s)text-\[\d/ },
  { prop: "lineHeight", when: /(^|\s)text-\[\d.*\/\[/ },
  { prop: "fontWeight", when: /(^|\s)font-(thin|light|normal|medium|semibold|bold|black)/ },
  { prop: "backgroundColor", when: /(^|\s)bg-\[#/ },
  { prop: "color", when: /(^|\s)text-\[#/ },
  { prop: "height", when: /(^|\s)h-\[\d/ },
];

// rounded-full sai como 999px no design e como calc(infinity) no Tailwind:
// visualmente idênticos, numericamente não.
function normalize(prop, value) {
  if (prop === "borderRadius") {
    const px = parseFloat(value);
    if (Number.isFinite(px) && px >= 500) return "full";
  }
  return value;
}

async function collect(page, attr) {
  return page.evaluate((attribute) => {
    const props = ["borderRadius", "paddingTop", "paddingBottom", "paddingLeft",
      "paddingRight", "columnGap", "rowGap", "fontSize", "lineHeight",
      "fontWeight", "backgroundColor", "color", "height"];
    const out = {};
    for (const el of document.querySelectorAll(`[${attribute}]`)) {
      const name = el.getAttribute(attribute);
      const cs = getComputedStyle(el);
      const style = {};
      for (const p of props) style[p] = cs[p];
      (out[name] ??= []).push({ className: el.className.toString(), style });
    }
    return out;
  }, attr);
}

// --- o plano: o que medir, o que não, o que está errado no mapa ---------------
const routes = JSON.parse(readFileSync(routesPath, "utf8"));
const screens = readFileSync(screensPath, "utf8").split("\n").filter(Boolean)
  .map((line) => line.split("\t")[1]);

const measured = [];
const unmeasured = [];
const errors = [];
for (const name of screens) {
  const route = routes[name];
  if (!route) unmeasured.push(`${name} (sem entrada em \`${routesPath}\`)`);
  else if (!existsSync(route.page)) unmeasured.push(`${name} (não implementada: \`${route.page}\`)`);
  else measured.push({ name, ...route });
}
for (const name of Object.keys(routes)) {
  if (!screens.includes(name)) {
    errors.push(`\`${routesPath}\` cita "${name}", que não é tela no .pen — renomeada ou removida?`);
  }
}

const report = [];
const print = (line = "") => report.push(line);

// process.exit logo após escrever corta a saída quando stdout é pipe (e o
// numeric.md é): o código de saída vai em exitCode e o Node sai sozinho.
// Exceção inesperada sai 2, não 1 — o Node sairia 1, que aqui quer dizer
// "divergência", e "quebrou" viraria "mediu e achou".
// O navegador fecha no finally: aberto, ele segura o Node vivo depois de uma
// exceção, e o job ficaria pendurado até o timeout.
let browser = null;
try {
  process.exitCode = await main();
} catch (err) {
  print();
  print(`- **erro:** a medição quebrou: ${String(err?.message ?? err).split("\n")[0]}`);
  process.exitCode = 2;
} finally {
  await browser?.close().catch(() => {});
}
console.log(report.join("\n"));

async function main() {
  print("### Comparação numérica");
  print();
  print(`medidas: ${measured.map((m) => `${m.name} (\`${m.url}\`)`).join(", ") || "_nenhuma_"}`);
  if (unmeasured.length) print(`não medidas: ${unmeasured.join(", ")}`);

  if (measured.length === 0) {
    print();
    print("_nenhuma página implementada no mapa — comparação pulada_");
    for (const e of errors) print(`- **erro:** ${e}`);
    return errors.length ? 2 : 0;
  }

  // --- medir ------------------------------------------------------------------
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // `networkidle` não serve: basta uma conexão persistente para nunca ficar
  // ocioso, e o goto estoura. `load` mais um sinal explícito de prontidão é
  // determinístico.
  await page.goto(pathToFileURL(designPath).href, { waitUntil: "load", timeout: 60000 });

  // O export do design aplica as classes via cdn.tailwindcss.com. Sem rede, a
  // página renderiza CRUA — e aí o comparador acusaria divergência em tudo. Essa
  // é a falha que precisa gritar, não passar por achado.
  try {
    await page.waitForFunction(() => {
      // não serve olhar o primeiro nó nomeado: no export ele é o sheet do board,
      // que é block. Um `.flex` computando `flex` prova que o CDN processou.
      const el = document.querySelector(".flex");
      return el && getComputedStyle(el).display === "flex";
    }, { timeout: 30000 });
  } catch {
    print();
    print("- **erro:** o Tailwind do CDN não aplicou no export do design — sem isso toda propriedade viraria divergência falsa. Medição abortada.");
    return 2;
  }
  const design = await collect(page, "data-pencil-name");

  // Instâncias de todas as páginas juntas: o mesmo componente aparece em várias,
  // e basta uma instância bater com o design (ver score, abaixo).
  const app = {};
  for (const route of measured) {
    const url = new URL(route.url, origin).href;
    try {
      const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
      if (!response || !response.ok()) throw new Error(`HTTP ${response?.status() ?? "sem resposta"}`);
      await page.waitForSelector("[data-component]", { timeout: 30000 });
    } catch (err) {
      errors.push(`${route.name}: \`${route.url}\` não carregou com [data-component] (${err.message.split("\n")[0]})`);
      continue;
    }
    for (const [name, instances] of Object.entries(await collect(page, "data-component"))) {
      (app[name] ??= []).push(...instances.map((inst) => ({ ...inst, url: route.url })));
    }
  }
  // --- comparar -----------------------------------------------------------------
  const findings = [];
  let compared = 0;

  for (const [name, instances] of Object.entries(app)) {
    const spec = design[name]?.[0];
    if (!spec) {
      findings.push({ name, prop: "—", want: "existe no .pen", got: "não encontrado no export do design", url: instances[0].url });
      continue;
    }

    // quais propriedades o design fixa neste nó
    const watch = WATCHED.filter((w) => w.when.test(spec.className)).map((w) => w.prop);
    if (watch.length === 0) continue;

    // Uma variante pode divergir legitimamente — o Chip ativo inverte as cores —
    // então basta que UMA instância bata com o padrão do design.
    const score = (inst) =>
      watch.filter((p) => normalize(p, inst.style[p]) !== normalize(p, spec.style[p])).length;

    compared += 1;
    const best = instances.reduce((a, b) => (score(b) < score(a) ? b : a));
    if (score(best) === 0) continue;

    // Reportar a instância que menos diverge, e não a primeira: senão a diferença
    // legítima de uma variante entra no relatório como se fosse defeito.
    for (const p of new Set(watch)) {
      const want = normalize(p, spec.style[p]);
      const got = normalize(p, best.style[p]);
      if (want !== got) findings.push({ name, prop: p, want, got, url: best.url });
    }
  }

  print(`componentes comparados: ${compared}`);
  for (const e of errors) print(`- **erro:** ${e}`);
  print();
  if (findings.length === 0) {
    print("nenhuma divergência numérica");
  } else {
    print(`#### divergência numérica design <-> código (${findings.length})`);
    print();
    print("| componente | propriedade | design | código | página |");
    print("|---|---|---|---|---|");
    for (const f of findings) {
      print(`| \`${f.name}\` | ${f.prop} | \`${f.want}\` | \`${f.got}\` | \`${f.url}\` |`);
    }
  }
  return errors.length ? 2 : findings.length ? 1 : 0;
}
