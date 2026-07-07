import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Seus estilos globais do Tailwind
import { ConvexProvider, ConvexReactClient } from "convex/react";

// 1. Inicializa o cliente de conexão em tempo real com a sua nuvem do Convex
const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
const convex = new ConvexReactClient(convexUrl);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* 👑 REGRA OPERACIONAL MESTRE: O ConvexProvider DEVE ser o primeiro da árvore, 
        envolvendo absolutamente tudo o que o React renderizar, inclusive o roteador e as páginas. */}
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>
);
