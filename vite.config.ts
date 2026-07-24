import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const hmrClientPort = Number(process.env.HMR_CLIENT_PORT ?? 18787);

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: true,
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: hmrClientPort,
    },
    watch: {
      usePolling: true,
    },
  },
});
