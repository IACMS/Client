import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      // Forward all /api requests to the gateway — eliminates CORS entirely in dev.
      // The browser sees requests as same-origin (Vite server), Vite forwards them.
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.error("[Vite proxy] Gateway unreachable:", err.message);
          });
        },
      },
      "/ws": {
        target: "ws://127.0.0.1:3000",
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err: any) => {
            // Silence harmless pipe breaks that occur when browser reconnects during HMR
            if (err?.code === "EPIPE" || err?.code === "ECONNRESET") return;
            console.error("[Vite WS proxy] error:", err.message);
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
