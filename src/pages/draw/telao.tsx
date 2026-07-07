import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function TelaoBingo() {
  // 1. Busca os eventos salvos no banco de dados da Convex em tempo real
  const eventos = useQuery(api.events.list) || [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans">
      {/* Cabeçalho do Telão */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-amber-500 uppercase">
          Telão Oficial - Bingo Premier
        </h1>
        <p className="text-slate-400 mt-2">
          Acompanhamento de eventos e rodadas em tempo real
        </p>
      </header>

      {/* Grid Principal de Informações */}
      <main className="grid flex-1 gap-6 md:grid-cols-3">
        {/* Painel do Catálogo/Eventos */}
        <section className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-2xl backdrop-blur-md">
          <h2 className="text-xl font-bold mb-4 text-slate-200 border-b border-slate-800 pb-2">
            Rodadas e Eventos Ativos
          </h2>
          
          {eventos.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              Nenhum evento ativo cadastrado no painel.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {eventos.map((evento: any) => (
                <div 
                  key={evento._id} 
                  className="rounded-lg border border-slate-800 bg-slate-900 p-4 transition-all hover:border-amber-500/50"
                >
                  <h3 className="font-bold text-lg text-amber-400">{evento.title}</h3>
                  {evento.description && (
                    <p className="text-sm text-slate-400 mt-1">{evento.description}</p>
                  )}
                  <div className="text-xs text-slate-500 mt-3 flex justify-between">
                    <span>Criado em: {new Date(evento.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Barra Lateral - Status */}
        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <h2 className="text-xl font-bold mb-4 text-slate-200">Painel Lateral</h2>
          <div className="rounded-lg bg-slate-950 p-4 text-center border border-slate-800">
            <span className="text-xs text-slate-500 uppercase tracking-wider block mb-1">
              Total de Eventos
            </span>
            <span className="text-5xl font-black text-amber-500">
              {eventos.length}
            </span>
          </div>
        </aside>
      </main>
    </div>
  );
}
