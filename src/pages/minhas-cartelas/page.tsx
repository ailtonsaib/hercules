import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { TicketIcon, RefreshCwIcon, TrophyIcon } from "lucide-react";

export default function MinhasCartelas() {
  // Conecta com a listagem de eventos/rodadas ativos do banco de dados
  const eventos = useQuery(api.events.list) || [];

  // Recupera o nome do usuário salvo localmente no login
  const userDataRaw = localStorage.getItem("hercules_user");
  const usuarioLogado = userDataRaw ? JSON.parse(userDataRaw) : { name: "Jogador" };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans">
      {/* Cabeçalho da Página */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase flex items-center gap-2">
            <TicketIcon className="h-8 w-8 text-amber-500" />
            Minhas Cartelas
          </h1>
          <p className="text-slate-400 mt-1">
            Olá, {usuarioLogado.name}. Confira suas cartelas adquiridas e acompanhe os sorteios.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800"
        >
          <RefreshCwIcon className="h-4 w-4" /> Sincronizar
        </button>
      </header>

      {/* Grid de Conteúdo */}
      <main className="grid gap-6 md:grid-cols-3">
        {/* Painel de Exibição das Cartelas */}
        <section className="col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200">Cartelas Adquiridas</h2>
          
          {/* Mock visual elegante de cartela de bingo */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-mono tracking-widest text-amber-500 uppercase font-bold">
                SÉRIE PREMIER #001
              </span>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                <TrophyIcon className="h-3.5 w-3.5" /> Ativa no Sorteio
              </div>
            </div>

            {/* Layout em grade da cartela (Simulação 5x5) */}
            <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              {[
                7, 18, 32, 51, 64,
                12, 24, 40, 55, 71,
                3, 29, "FREE", 48, 62,
                15, 21, 38, 59, 68,
                9, 27, 44, 52, 75
              ].map((num: string | number, i: number) => (
                <div 
                  key={i} 
                  className={`aspect-square flex items-center justify-center font-bold text-base rounded-md border transition-all ${
                    num === "FREE" 
                      ? "bg-amber-500/10 border-amber-500 text-amber-500 text-xs" 
                      : "bg-slate-900 border-slate-800/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Barra Lateral com Informações de Rodadas */}
        <aside className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200">Rodadas Disponíveis</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-xl backdrop-blur-md">
            {eventos.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhum sorteio programado no momento.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {eventos.map((evento: any) => (
                  <div key={evento._id} className="rounded-lg bg-slate-950 p-3 border border-slate-800/60">
                    <h3 className="font-bold text-sm text-amber-400">{evento.title}</h3>
                    <span className="text-xs text-slate-500 block mt-1">
                      Data: {new Date(evento.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
