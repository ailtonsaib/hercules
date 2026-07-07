import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BarChart3Icon, ShieldCheckIcon, RefreshCwIcon, FileSpreadsheetIcon, TrendingUpIcon, ActivityIcon } from "lucide-react";

export default function PaginaRelatorios() {
  // 1. Recupera as credenciais locais do localStorage
  const userDataRaw = localStorage.getItem("hercules_user");
  const user = userDataRaw ? JSON.parse(userDataRaw) : { name: "Usuário", role: "user" };

  // 2. Escuta a listagem de eventos ativos na Convex
  const listaEventos = useQuery((api as any).events.list) || [];

  // Trava de Segurança Visual: Se não for administrador, barra o acesso imediatamente
  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-white">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center shadow-2xl backdrop-blur-md">
          <ShieldCheckIcon className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-rose-400">Acesso Negado</h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Apenas usuários com privilégios de administrador possuem autorização para auditar relatórios fiscais e métricas de faturamento do sistema.
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
            <BarChart3Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase">
              Relatórios & Auditoria
            </h1>
            <p className="text-slate-400 mt-1">
              Painel analítico mestre de faturamento, engajamento e extrações.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800"
        >
          <RefreshCwIcon className="h-4 w-4" /> Atualizar Relatórios
        </button>
      </header>

      {/* Grid de Cards de Métricas Avançadas */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Volume de Vendas (Simulado)</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">R$ 12.450,00</span>
          </div>
          <TrendingUpIcon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Cartelas Emitidas</span>
            <span className="text-3xl font-black text-amber-500 mt-1 block">{listaEventos.length * 150}</span>
          </div>
          <FileSpreadsheetIcon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Taxa de Conversão</span>
            <span className="text-3xl font-black text-sky-400 mt-1 block">84.2%</span>
          </div>
          <ActivityIcon className="h-8 w-8 text-slate-700" />
        </div>
      </div>

      {/* Conteúdo Informativo */}
      <main className="grid gap-6 md:grid-cols-3">
        <section className="col-span-3 rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
            Histórico Consolidado de Sorteios
          </h2>
          {listaEventos.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              Nenhum dado de rodada localizado no Convex para gerar estatísticas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase text-amber-500 font-bold border border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Identificador do Sorteio</th>
                    <th className="px-4 py-3">Status do Banco</th>
                    <th className="px-4 py-3">Data de Emissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 border-x border-b border-slate-800">
                  {listaEventos.map((evento: any) => (
                    <tr key={evento._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-100">{evento.title}</td>
                      <td className="px-4 py-3">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          CONSOLIDADO
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(evento.createdAt).toLocaleDateString()} {new Date(evento.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
