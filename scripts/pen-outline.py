#!/usr/bin/env python3
"""Extrai o esqueleto de composição das telas de um .pen.

    scripts/pen-outline.py <arquivo.pen> [nome da tela ...]

Sem nomes, todas as telas. O que é tela quem decide é scripts/pen-screens.sh —
nome pedido que não for tela é erro, não saída vazia.

As telas não são `reusable`, então ficam fora do digest de componentes. Mas o
que interessa numa tela é a COMPOSIÇÃO — quais componentes, em que ordem, dentro
de que container — e não o conteúdo instanciado. Este script poda o conteúdo:

  - `ref` vira {"component": "<nome do alvo>"}; os `descendants` (títulos,
    contagens, thumbnails) são fixture e caem fora
  - fill de imagem vira "<image>" pelo mesmo motivo
  - id/x/y não entram: coordenada de artboard não se traduz em layout fluido

Resultado: ~460 linhas para as duas telas de canal, contra ~1700 da árvore
crua. Tela montada à mão, sem componente, poda menos: o Privacy Policy dá ~1500.
"""
import json, subprocess, sys
from pathlib import Path

LAYOUT_KEYS = ["layout", "gap", "padding", "alignItems", "justifyContent",
               "width", "height", "cornerRadius", "fill", "stroke",
               "strokeWidth", "clip"]


def list_screens(path: str) -> dict[str, str]:
    """nome -> id, na ordem do documento."""
    out = subprocess.run([str(Path(__file__).with_name("pen-screens.sh")), path],
                         check=True, capture_output=True, text=True).stdout
    return {name: id for id, name in (line.split("\t", 1) for line in out.splitlines() if line)}


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else "design/pendev/youtube-channel.pen"
    screens = list_screens(path)
    wanted = sys.argv[2:] or list(screens)
    missing = [name for name in wanted if name not in screens]
    if missing:
        print(f"não são telas em {path}: {missing}", file=sys.stderr)
        return 1
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

    if not wanted:
        print(f"nenhuma tela em {path}", file=sys.stderr)
        return 1

    ids = {screens[name] for name in wanted}
    outline = [prune(n) for n in doc["children"] if n.get("id") in ids]
    print(json.dumps(outline, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
