// Compara os valores computados do design contra os da app.
//
// Por que computado e não className: o design exporta `rounded-[8px]` e o
// código escreve `rounded-lg`. Strings diferentes, mesmo valor. O navegador é o
// compilador que normaliza os dois dialetos — comparar getComputedStyle compara
// o que o usuário vê, não como foi escrito.
//
//   node scripts/compare-styles.mjs <design.html> <url-da-app>
//
// O design é o lado que MANDA, e só nas propriedades que ele fixa: a classe do
// nó exportado diz quais são. Posição e largura nunca entram — o artboard é
// 1440 fixo e o layout do código é fluido por decisão (§8).
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const [designPath, appUrl] = process.argv.slice(2);
if (!designPath || !appUrl) {
  console.error("uso: compare-styles.mjs <design.html> <url-da-app>");
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

const PROPS = [...new Set(WATCHED.map((w) => w.prop))];

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(pathToFileURL(designPath).href, { waitUntil: "networkidle" });
const design = await collect(page, "data-pencil-name");

await page.goto(appUrl, { waitUntil: "networkidle" });
const app = await collect(page, "data-component");

await browser.close();

const findings = [];
let compared = 0;

for (const [name, instances] of Object.entries(app)) {
  const spec = design[name]?.[0];
  if (!spec) {
    findings.push({ name, prop: "—", esperado: "existe no .pen", obtido: "não encontrado no export do design" });
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
  for (const p of watch) {
    const want = normalize(p, spec.style[p]);
    const got = normalize(p, best.style[p]);
    if (want !== got) findings.push({ name, prop: p, esperado: want, obtido: got });
  }
}

console.log(`componentes comparados: ${compared}`);
if (findings.length === 0) {
  console.log("\nnenhuma divergência numérica");
  process.exit(0);
}

console.log(`\n## divergência numérica design <-> código (${findings.length})\n`);
console.log("| componente | propriedade | design | código |");
console.log("|---|---|---|---|");
for (const f of findings) {
  console.log(`| \`${f.name}\` | ${f.prop} | \`${f.esperado}\` | \`${f.obtido}\` |`);
}
process.exit(1);
