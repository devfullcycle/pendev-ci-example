#!/usr/bin/env python3
"""Extrai o esqueleto de composição das telas de um .pen.

    scripts/pen-outline.py <arquivo.pen> [prefixo-do-nome]

As telas não são `reusable`, então ficam fora do digest de componentes. Mas o
que interessa numa tela é a COMPOSIÇÃO — quais componentes, em que ordem, dentro
de que container — e não o conteúdo instanciado. Este script poda o conteúdo:

  - `ref` vira {"component": "<nome do alvo>"}; os `descendants` (títulos,
    contagens, thumbnails) são fixture e caem fora
  - fill de imagem vira "<image>" pelo mesmo motivo
  - id/x/y não entram: coordenada de artboard não se traduz em layout fluido

Resultado: ~460 linhas para as duas telas, contra ~2000 da árvore crua.
"""
import json, sys

LAYOUT_KEYS = ["layout", "gap", "padding", "alignItems", "justifyContent",
               "width", "height", "cornerRadius", "fill", "stroke",
               "strokeWidth", "clip"]


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else "design/pendev/youtube-channel.pen"
    prefix = sys.argv[2] if len(sys.argv) > 2 else "Channel — "
    doc = json.load(open(path, encoding="utf8"))

    by_id: dict[str, dict] = {}

    def index(node):
        if isinstance(node, dict):
            if "id" in node:
                by_id[node["id"]] = node
            for child in node.get("children") or []:
                index(child)
        elif isinstance(node, list):
            for child in node:
                index(child)

    index(doc["children"])

    def prune(node):
        if node.get("type") == "ref":
            target = by_id.get(node.get("ref"), {})
            out = {"component": target.get("name", node.get("ref"))}
            for key in ("width", "height", "layoutPosition"):
                if key in node:
                    out[key] = node[key]
            return out

        out = {"node": node.get("name"), "type": node.get("type")}
        for key in LAYOUT_KEYS:
            if key not in node:
                continue
            value = node[key]
            if key == "fill" and isinstance(value, dict) and value.get("type") == "image":
                value = "<image>"
            out[key] = value
        kids = [prune(c) for c in (node.get("children") or [])]
        if kids:
            out["children"] = kids
        return out

    screens = [prune(n) for n in doc["children"]
               if isinstance(n.get("name"), str) and n["name"].startswith(prefix)]

    if not screens:
        print(f"nenhuma tela com prefixo {prefix!r} em {path}", file=sys.stderr)
        return 1

    print(json.dumps(screens, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
