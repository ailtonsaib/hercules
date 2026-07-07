import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { 
  TicketIcon, PlusIcon, DollarSignIcon, PercentIcon, 
  CalendarIcon, TrophyIcon, SearchIcon 
} from "lucide-react";

export default function ModuloRifasMestre() {
  const token = localStorage.getItem("hercules_session_token") || localStorage.getItem("token") || "";
  const [busca, setBusca] = React.useState("");

  // Busca os dados informativos gerais do banco Convex
  const eventos = useQuery(api.events.list, { token }) || [];

  // Mock seguro de dados para a listagem de Rifas Ativas da Plataforma
  const rifasCadastradas = [
    { 
      _id: "r1", 
      title: "Rifa Moto Honda CG 160 Start 0km", 
      ticketValue: 500, // R$ 5,00 em centavos
      totalNumbers: 1000, 
      soldNumbers: 642, 
      prize: "Moto Honda 0km ou R$ 15.000 no PIX",
      drawDate: "25/12/2026" 
    },
    { 
      _id: "r2", 
      title: "Rifa iPhone 16 Pro Max 256GB", 
      ticketValue: 200, // R$ 2,00 em centavos
      totalNumbers: 500, 
      soldNumbers: 120, 
      prize: "iPhone 16 Pro Max Lacrado",
      drawDate: "15/08/2026" 
    }
  ];

  // Aplica o filtro de busca textual por título da rifa
  const rifasFiltradas = rifasCadastradas.filter(rifa => 
    rifa.title.toLowerCase().includes(busca.toLowerCase()) || rifa.prize.toLowerCase().includes(busca.toLowerCase())
  );

  // Cálculos consolidados para as estatísticas superiores em cards
  const totalArrecadadoRifas = rifasCadastradas.reduce((acc, r) => acc + ((r.soldNumbers * r.ticketValue) / 100), 0);
  const totalBilhetesVendidos = rifasCadastradas.reduce((acc, r) => acc + r.soldNumbers, 0);

  const handleLancarNovaRifa = () => {
    toast.success("O formulário para criação de nova rifa eletrônica foi aberto!");
  };

  return (
    <div className="flex flex-col bg-slate-950 p-6 text-white font-sans w-full min-h-full">
      {/* Cabeçalho */}
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6 w-full">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-rose-500 uppercase flex items-center gap-2">
            <TicketIcon className="h-8 w-8 text-rose-500" />
            Módulo de Rifas Eletrônicas
          </h1>
          <p className="text-slate-400 mt-1">Gerencie sorteios por cotas, acompanhe arrecadações e configure bilhetes premiados.</p>
        </div>
        <button 
          onClick={handleLancarNovaRifa}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-500 text-white font-black text-xs px-5 transition-all shadow-lg hover:bg-rose-400 cursor-pointer"
        >
          <PlusIcon className="h-4 w-4" /> Criar Nova Rifa
        </button>
      </header>

      {/* 📊 CARDS DE MÉTRICAS DAS RIFAS */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6 w-full">
        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-xl">
            <DollarSignIcon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Arrecadado em Rifas</span>
            <span className="text-xl font-black text-emerald-400 font-mono">R$ {totalArrecadadoRifas.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-4 flex items-center gap-4 backdrop-blur-md">
          <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center rounded-xl">
            <PercentIcon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Bilhetes Vendidos (Cotas)</span>
            <span className="text-xl font-black text-amber-400 font-mono">{totalBilhetesVendidos} Cotas</span>
          </div>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="mb-6 bg-slate-900/40 p-4 rounded-xl border border-slate-900 backdrop-blur-md flex flex-col gap-1.5 text-xs w-full">
        <label className="text-slate-400 font-bold uppercase tracking-wider">Filtrar por Título da Rifa ou Prêmio</label>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Digite termos para buscar..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm font-semibold focus:outline-none focus:border-rose-500 text-white"
          />
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
        </div>
      </div>

      {/* Lista de Rifas Ativas */}
      <div className="grid gap-4 sm:grid-cols-2 w-full">
        {rifasFiltradas.length === 0 ? (
          <div className="sm:col-span-2 text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl uppercase font-bold tracking-wider">
            Nenhuma ação ou cota de rifa localizada com o filtro inserido.
          </div>
        ) : (
          rifasFiltradas.map((rifa) => {
            const progressoPercent = Math.min(100, Math.round((rifa.soldNumbers / rifa.totalNumbers) * 100));
            const valorUnitario = (rifa.ticketValue / 100).toFixed(2).replace(".", ",");
            
            return (
              <div key={rifa._id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between hover:border-rose-500/20 transition-all shadow-xl relative overflow-hidden group">
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-extrabold text-white text-base capitalize group-hover:text-rose-400 transition-colors">{rifa.title}</h3>
                    <span className="text-[11px] font-mono font-black bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-lg border border-rose-500/20 uppercase shrink-0">
                      R$ {valorUnitario}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-900/60 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <TrophyIcon className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Prêmio: <strong className="text-slate-100 font-bold">{rifa.prize}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <CalendarIcon className="h-4 w-4 text-slate-600 shrink-0" />
                      <span>Data do Sorteio: <strong className="text-slate-300 font-mono">{rifa.drawDate}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso de Vendas */}
                <div className="mt-5 pt-3 border-t border-slate-800/40">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                    <span>Vendas: {rifa.soldNumbers}/{rifa.totalNumbers}</span>
                    <span className="font-mono text-amber-400">{progressoPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-900">
                    <div 
                      className="bg-gradient-to-r from-rose-600 to-rose-400 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${progressoPercent}%` }}
                    />
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
