import { defineConfig, type Plugin } from "vite";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Fills in public/sw.js after a build: the list of built files to store for
 * offline use, and a version derived from that list so a new build replaces
 * the old cache.
 */
const serviceWorkerAssets = (): Plugin => ({
  name: "flavorcraft-service-worker",
  apply: "build",
  closeBundle() {
    const dist = path.resolve(import.meta.dirname, "dist");
    const assets = readdirSync(path.join(dist, "assets"))
      .filter((f) => /\.(js|css)$/.test(f))
      .sort()
      .map((f) => `/assets/${f}`);
    const files = [...assets, "/favicon.svg", "/manifest.webmanifest"];
    const version = createHash("sha256").update(files.join("|")).digest("hex").slice(0, 10);
    const file = path.join(dist, "sw.js");
    const source = readFileSync(file, "utf8");
    const filled = source.replace("const VERSION = 'dev';", `const VERSION = '${version}';`).replace("const ASSETS = [];", `const ASSETS = ${JSON.stringify(files)};`);
    if (filled === source) throw new Error("public/sw.js no longer has the VERSION and ASSETS lines the build fills in");
    writeFileSync(file, filled);
  },
});

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), serviceWorkerAssets()],
  build: {
    rolldownOptions: {
      output: {
        // Large libraries in their own long-lived chunks so app updates don't re-download them.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: "supabase", test: /node_modules[\\/]@supabase[\\/]/ },
            { name: "motion", test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
            { name: "radix", test: /node_modules[\\/]@radix-ui[\\/]/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
