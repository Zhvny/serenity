import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Urutan penting + regex anchored: CSS lebih dulu, lalu modul leaflet persis.
      { find: /^leaflet\/dist\/leaflet\.css$/, replacement: fileURLToPath(new URL("./src/test-stubs/empty.css", import.meta.url)) },
      { find: /^leaflet$/, replacement: fileURLToPath(new URL("./src/test-stubs/leaflet.ts", import.meta.url)) },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    isolate: false,
  },
});
