import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev
export default defineConfig({
  base: "./", // 🚀 INJEÇÃO RELATIVA: Força o Vite a ignorar barras absolutas e achar o src/main.tsx em qualquer servidor
  plugins: [
    react(),
    tailwindcss() 
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
