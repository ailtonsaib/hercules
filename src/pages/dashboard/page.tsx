import * as React from "react";
import { useDashboard } from "./useDashboard";
import { Link } from "react-router-dom";
import { 
  LayoutDashboardIcon, RefreshCwIcon, TrophyIcon, 
  TicketIcon, UsersIcon, LayersIcon, ArrowRightIcon 
} from "lucide-react";

export default function DashboardPrincipal() {
  const s = useDashboard();

  // 👑 BLINDAGEM CONTRA TELA BRANCA: Garante que se eventos estiver carregando, assume array vazia []
  const totalEventosAtivos = Array.isArray(s.eventos) ? s.eventos.length : 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans w-full">
      {/* Cabeçalho */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase flex items-center gap-2">
            <LayoutDashboardIcon className="h-8 w-8 text-amber-500" />
            Dashboard Geral
          </h1>
          <p className="text-slate-400 mt-1">Seja bem-vindo. Acompanhe as estatísticas operacionais do Bingo Premier.</p>
        </div>
        <button onClick={() => window.location.reload()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800">
          <RefreshCwIcon className="h-4 w-4" /> Atualizar Painel
        </button>
      </header>

      {/* Grid de Resumos Analíticos */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Sorteios Ativos</span>
            {/* ✅ Utiliza a variável segura em vez de ler direto do useQuery indefinido */}
            <span className="text-3xl font-black text-amber-500 mt-1 block">{totalEventosAtivos}</span>
          </div>
          <TrophyIcon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Minhas Cartelas</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">1</span>
          </div>
          <TicketIcon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Nível de Acesso</span>
            <span className="text-sm font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded mt-2 inline-block uppercase">ADMIN MESTRE</span>
          </div>
          <UsersIcon className="h-8 w-8 text-slate-700" />
        </div>
      </div>

      {/* ⚡ CARD OPERACIONAL: ATALHO DE EMISSÃO EM MASSA INJETADO */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
              <LayersIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">Geração de Lotes em Massa</h3>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                Acesse o painel operacional para fabricar sequências de bilhetes criptográficos (Ex: de #101 até #500) e realizar a entrega imediata para cambistas ou estoque central.
              </p>
            </div>
          </div>
          <Link
            to="/batches"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-all hover:bg-amber-400 shadow-md shadow-amber-500/5 group"
          >
            Abrir Emissão em Massa
            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0f0f1e]/10 p-6 flex flex-col justify-center items-center text-center text-slate-500 border-dashed">
          <p className="text-sm">Navegue pelas demais ferramentas usando os links diretos na barra lateral esquerda.</p>
        </div>
      </div>
    </div>
  );
}
