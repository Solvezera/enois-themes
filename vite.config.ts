import { defineConfig } from "vite";
// @ts-expect-error process is a nodejs global
import process from "node:process";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  root: "src",

  // Garante que o build final vai para `dist/` na raiz do projeto
  // (fora do `root`), que é o que o Tauri espera em `frontendDist`.
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));