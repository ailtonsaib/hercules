import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SearchIcon, TicketIcon, UserIcon, ShieldAlertIcon, HashIcon } from "lucide-react";

export default function PainelCartelasMestre() {
  const [busca, setBusca] = React.useState("");
  const [eventoSelecionado, setEventoSelecionado] = React.useState("");

  // Recupera o token de sessão do administrador
  const token = localStorage.getItem("hercules_session_token") || localStorage.getItem("token") || "";

  // 1. Busca os sorteios disponíveis para o filtro superior
  const eventos = useQuery(api.events.list, { token }) || [];

  // Se nenhum evento foi selecionado e houver sorteios, assume o primeiro do cache ou do banco
  React.useEffect(() => {
    if (eventos.length > 0 && !eventoSelecionado) {
      const lastId = localStorage.getItem("hercules_last_event_id");
      const existe = eventos.some((e: any) => e._id === lastId);
      setEventoSelecionado(existe && lastId ? lastId : eventos[0]._id);
    }
  }, [eventos, eventoSelecionado]);

  // 2. Busca o inventário completo de cartelas do Convex
  const todasCartelas = useQuery(api.vendorApp.getVendorInventory, { vendorId: "" }) || [];

  // 3. Aplica os filtros de Evento e de Número de Série digitado (Ordem Crescente)
  const cartelasFiltradas = todasCartelas
    .filter((c: any) => {
      const bateEvento = c.eventId === eventoSelecionado;
      const numeroLimpo = c.serialNumber.replace("CRT-", "");
      const bateBusca = busca.trim() === "" || numeroLimpo.includes(busca) || c.serialNumber.includes(busca);
      return bateEvento && bateBusca;
    })
    .sort((a: any, b: any) => {
      return (a.serialNumber || "").localeCompare(b.serialNumber || "", undefined, { numeric: true });
    });

  const renderMiniGrade = (numeros: number[]) => {
    if (!numeros || numeros.length < 20) return <span className="text-slate-600">Não gerado</span>;
    return (
      <div className="grid grid-cols-5 gap-0.5 p-1 bg-slate-950 rounded border border-slate-800 font-mono w-fit mx-auto">
        {numeros.map((n, idx) => (
          <div key={idx} className="h-5 w-6 text-[10px] font-bold flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-300 rounded-sm">
            {String(n).padStart(2, "0")}
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans w-full">
      {/* Cabeçalho */}
      <header className="mb-6 border-b border-slate-900 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-rose-500 uppercase flex items-center gap-2">
          <TicketIcon className="h-8 w-8 text-rose-500" />
          Estoque Mestre de Cartelas
        </h1>
        <p className="text-slate-400 mt-1">Consulte números de série, dezenas geradas e o status de auditoria em tempo real.</p>
      </header>

      {/* Barra de Filtros Superior */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6 bg-slate-900/40 p-4 rounded-xl border border-slate-900 backdrop-blur-md">
        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-slate-400 font-bold uppercase tracking-wider">Filtrar Sorteio</label>
          <select 
            value={eventoSelecionado} 
            onChange={(e) => setEventoSelecionado(e.target.value)} 
            className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-slate-100 font-semibold focus:outline-none focus:border-rose-500"
          >
            <option value="">-- Selecione o Sorteio --</option>
            {eventos.map((ev: any) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2 flex flex-col gap-1.5 text-xs">
          <label className="text-slate-400 font-bold uppercase tracking-wider">Buscar por Número de Série</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Digite o número (Ex: 000025)..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm font-semibold focus:outline-none focus:border-rose-500 font-mono"
            />
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          </div>
        </div>
      </div>

      {/* Tabela de Dados Expandida */}
      <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 shadow-xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 font-bold uppercase tracking-wider text-slate-400">
                <th className="p-4 flex items-center gap-1"><HashIcon className="h-3.5 w-3.5" /> Série</th>
                <th className="p-4 text-center">Grade de Dezenas (4x5)</th>
                <th className="p-4">Portador Atual</th>
                <th className="p-4">Comprador</th>
                <th className="p-4 text-center">Auditoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 font-medium">
              {cartelasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-bold uppercase text-[11px]">
                    Nenhuma cartela encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                cartelasFiltradas.map((card: any) => (
                  <tr key={card._id} className="hover:bg-slate-900/20 transition-colors">
                    <td className="p-4 font-mono font-black text-rose-400 text-sm">
                      {card.serialNumber.replace("CRT-", "")}
                    </td>
                    <td className="p-3 text-center">
                      {renderMiniGrade(card.numbers)}
                    </td>
                    <td className="p-4 text-slate-300 font-semibold truncate max-w-[150px]">
                      {card.vendorName || <span className="text-slate-600 italic">Estoque Central</span>}
                    </td>
                    <td className="p-4 truncate max-w-[180px]">
                      {card.isSold ? (
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-bold capitalize flex items-center gap-1">
                            <UserIcon className="h-3 w-3 text-amber-500" /> {card.buyerName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">{card.buyerPhone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Não Comercializada</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {card.isValidated ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
                          No Globo
                        </span>
                      ) : card.isSold ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[10px] font-black uppercase text-amber-400 animate-pulse">
                          Pendente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 border border-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500">
                          Disponível
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
