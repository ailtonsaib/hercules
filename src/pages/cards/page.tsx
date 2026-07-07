import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CreditCardIcon, RefreshCwIcon, ShieldCheckIcon, RowsIcon, LayersIcon } from "lucide-react";

export default function PaginaCardsGeral() {
  // 1. Recupera as credenciais de sessão local do localStorage
  const userDataRaw = localStorage.getItem("hercules_user");
  const user = userDataRaw ? JSON.parse(userDataRaw) : { name: "Usuário", role: "user" };

  // 2. Escuta os sorteios ativos diretamente na Convex em tempo real
  const listaEventos = useQuery((api as any).events.list) || [];

  // Trava de Segurança Mestre: Se não for administrador, barra o acesso imediatamente
  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-white">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center shadow-2xl backdrop-blur-md">
          <ShieldCheckIcon className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-rose-400">Acesso Restrito</h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Módulo restrito de gerenciamento. Apenas administradores do sistema possuem permissão para auditar o inventário e a matriz de cartelas globais.
          </p>
          <button 
            onClick={() => window.location.replace("/")}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 px-6 font-semibold text-sm text-slate-200 transition-colors hover:bg-slate-800"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans">
      {/* Cabeçalho */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <CreditCardIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase">
              Inventário de Cartelas (Cards)
            </h1>
            <p className="text-slate-400 mt-1">
              Visualização da matriz numérica de bilhetes gerados para sorteios da rede.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800"
        >
          <RefreshCwIcon className="h-4 w-4" /> Recarregar Matriz
        </button>
      </header>

      {/* Métricas do Inventário */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Modelos de Matriz</span>
            <span className="text-3xl font-black text-amber-500 mt-1 block">75.000 Combinações</span>
          </div>
          <RowsIcon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Sorteios Vinculados</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">{listaEventos.length}</span>
          </div>
          <LayersIcon className="h-8 w-8 text-slate-700" />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="grid gap-6 md:grid-cols-3">
        <section className="col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
            Status de Cartelas por Sorteio Ativo
          </h2>
          {listaEventos.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Nenhuma rodada mestre ativa localizada no Convex para mapeamento de matrizes numéricas.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {listaEventos.map((evento: any) => (
                <div key={evento._id} className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between hover:border-amber-500/30 transition-all">
                  <div>
                    <h3 className="font-bold text-amber-400 text-base">{evento.title}</h3>
                    <p className="text-xs text-slate-400 mt-2">{evento.description || "Sem descrição disponível."}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-600">REF: {evento._id}</span>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                      MATRIZ CONFIGURADA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
