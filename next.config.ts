import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sem isto o Turbopack sobe a árvore procurando lockfile e acha um
  // package-lock.json de 2022 em /home/argen/ti, fora do repositório.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
