import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite"; // Adiciona o compilador nativo do v4
import path from "path";

// https://vite.dev
export default defineConfig({
  plugins: [
    react(),
    tailwindcss() // Injeta o Tailwind v4 diretamente no motor do Vite
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
    },
  },
});
