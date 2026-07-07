import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PaintbrushIcon, RefreshCwIcon, LayoutIcon, PaletteIcon } from "lucide-react";

export default function DesignCartela() {
  const [corPrincipal, setCorPrincipal] = React.useState("#f59e0b"); // Padrão Amber do Tailwind
  const [estiloBorda, setEstiloBorda] = React.useState<"rounded" | "square">("rounded");

  // Conecta com a listagem de eventos ativos em tempo real
  const eventos = useQuery(api.events.list) || [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans">
      {/* Cabeçalho da Página */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase flex items-center gap-2">
            <PaintbrushIcon className="h-8 w-8 text-amber-500" />
            Customizador de Cartelas
          </h1>
          <p className="text-slate-400 mt-1">
            Configure a identidade visual, cores e layout dos seus cartões de bingo.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800"
        >
          <RefreshCwIcon className="h-4 w-4" /> Sincronizar
        </button>
      </header>

      {/* Grid Principal */}
      <main className="grid gap-6 md:grid-cols-3">
        {/* Painel de Controles */}
        <section className="flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
            <PaletteIcon className="h-5 w-5 text-slate-400" /> Ajustes de Estilo
          </h2>

          {/* Controle de Cor */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cor de Destaque
            </label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={corPrincipal} 
                onChange={(e) => setCorPrincipal(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-slate-700 bg-transparent"
              />
              <span className="font-mono text-sm text-slate-300 uppercase">{corPrincipal}</span>
            </div>
          </div>

          {/* Controle de Formato */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Formato dos Números
            </label>
            <div className="flex gap-2">
              <button 
                onClick={() => setEstiloBorda("rounded")}
                className={`flex-1 h-9 rounded-lg font-medium text-sm border transition-all ${
                  estiloBorda === "rounded" 
                    ? "bg-slate-800 border-amber-500 text-amber-500" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Arredondado
              </button>
              <button 
                onClick={() => setEstiloBorda("square")}
                className={`flex-1 h-9 rounded-lg font-medium text-sm border transition-all ${
                  estiloBorda === "square" 
                    ? "bg-slate-800 border-amber-500 text-amber-500" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Quadrado
              </button>
            </div>
          </div>
        </section>

        {/* Painel de Visualização (Preview) */}
        <section className="col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <LayoutIcon className="h-5 w-5 text-slate-400" /> Pré-visualização em Tempo Real
          </h2>
          
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-mono tracking-widest uppercase font-bold text-slate-400">
                PROTÓTIPO DE IMPRESSÃO
              </span>
              <div 
                className="h-3 w-3 rounded-full shadow-xs" 
                style={{ backgroundColor: corPrincipal }} 
              />
            </div>

            {/* Layout dinâmico baseado nos controles acima */}
            <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              {[
                "B", "I", "N", "G", "O",
                14, 22, 35, 49, 66,
                5, 19, "★", 53, 70,
                11, 28, 42, 50, 61,
                2, 17, 31, 58, 74
              ].map((item: string | number, i: number) => {
                const isLetter = i < 5;
                const isStar = item === "★";

                return (
                  <div 
                    key={i} 
                    className="aspect-square flex items-center justify-center font-bold text-base transition-all border"
                    style={{
                      borderRadius: estiloBorda === "rounded" ? "0.375rem" : "0px",
                      borderColor: isLetter || isStar ? corPrincipal : "#1e293b",
                      backgroundColor: isLetter || isStar ? `${corPrincipal}15` : "#0f172a",
                      color: isLetter || isStar ? corPrincipal : "#cbd5e1"
                    }}
                  >
                    {item}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
