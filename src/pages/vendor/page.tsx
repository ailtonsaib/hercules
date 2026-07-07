import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StoreIcon, ShieldCheckIcon, RefreshCwIcon, ShoppingBagIcon, UserCheckIcon, WalletIcon } from "lucide-react";

export default function PaginaVendedor() {
  // 1. Recupera as credenciais locais do localStorage
  const userDataRaw = localStorage.getItem("hercules_user");
  const user = userDataRaw ? JSON.parse(userDataRaw) : { name: "Usuário", role: "user" };

  // 2. Escuta a listagem de eventos ativos na Convex em tempo real
  const listaEventos = useQuery((api as any).events.list) || [];

  // Trava de Segurança Visual: Se não for administrador, barra o acesso imediatamente
  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-white">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center shadow-2xl backdrop-blur-md">
          <ShieldCheckIcon className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-rose-400">Acesso Restrito</h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Módulo restrito para credenciados. Apenas usuários administradores possuem autorização para gerenciar a distribuição e venda de lotes comerciais.
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
            <StoreIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase">
              Painel de Distribuição (Vendedor)
            </h1>
            <p className="text-slate-400 mt-1">
              Gerencie a venda de bilhetes físicos e créditos de forma síncrona.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800"
        >
          <RefreshCwIcon className="h-4 w-4" /> Atualizar Terminal
        </button>
      </header>

      {/* Grade de Métricas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Comissão Acumulada</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">R$ 1.840,00</span>
          </div>
          <WalletIcon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Bilhetes Repassados</span>
            <span className="text-3xl font-black text-amber-500 mt-1 block">184</span>
          </div>
          <ShoppingBagIcon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Vendedor Vinculado</span>
            <span className="text-sm font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded mt-2 inline-block">DISTRIBUIDOR MESTRE</span>
          </div>
          <UserCheckIcon className="h-8 w-8 text-slate-700" />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <main className="grid gap-6 md:grid-cols-3">
        <section className="col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
            Vincular Venda a Rodadas Ativas
          </h2>
          {listaEventos.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Nenhuma extração ativa localizada no Convex para associação de vendas comerciais.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {listaEventos.map((evento: any) => (
                <div key={evento._id} className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-amber-400 text-base">{evento.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">Status: Liberação para Revenda Autorizada</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-slate-600">REF: {evento._id}</span>
                    <button className="h-8 px-3 rounded-md bg-amber-500 text-slate-950 font-bold text-xs transition-colors hover:bg-amber-400">
                      Emitir neste Sorteio
                    </button>
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
