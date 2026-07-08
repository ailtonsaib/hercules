import * as React from "react";
import { useBatches } from "./useBatches";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { 
  RefreshCwIcon, PlusIcon, LayersIcon, TicketIcon, 
  UsersIcon, CalendarIcon, Trash2Icon, MoveRightIcon, PrinterIcon, CopyIcon
} from "lucide-react";

export default function GerenciadorLotes() {
  const b = useBatches();
  const transferirCotas = useMutation((api as any).batches.transferToVendor);

  // Estados locais para o formulário de transferência
  const [tStart, setTStart] = React.useState("");
  const [tEnd, setTEnd] = React.useState("");
  const [tVendor, setTVendor] = React.useState("");
  const [isTransf, setIsTransf] = React.useState(false);

  // 📲 LINK CORRIGIDO: Alterado para a rota correta do aplicativo do vendedor do seu sistema
  // Se for testar no celular pela rede local, lembre-se de usar: "http://SEU_IP_LOCAL:5173/appvendedor"
  const linkDoAppVendedor = "https://netlify.app";

  // 📋 Função para copiar o endereço do app do vendedor para a área de transferência
  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkDoAppVendedor);
    toast.success("Link de acesso do vendedor copiado!");
  };

     // 🚀 VERSÃO BLINDADA COM ALERTA NATIVO: Captura a resposta e força a exibição do erro na tela
  const handleTransferenciaLocal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!b.selectedEventId) {
      alert("⚠️ Atenção! Por favor, selecione o 'Sorteio Vinculado' no Painel 1 antes de transferir.");
      return;
    }

    if (!tVendor || !tStart || !tEnd) {
      alert("⚠️ Atenção! Preencha todos os campos do formulário para fazer a transferência.");
      return;
    }

    const nInicio = parseInt(tStart, 10);
    const nFim = parseInt(tEnd, 10);

    if (nInicio > nFim) {
      alert("⚠️ Erro: O número inicial não pode ser maior que o número final.");
      return;
    }

    // Varredura de segurança local por inteiros
    const lotesComCambistas = listaLotesBruta.filter((lote: any) => {
      const idDoDono = lote.vendorId || lote.userId;
      return idDoDono && idDoDono !== "";
    });

    const loteConflitante = lotesComCambistas.find((lote: any) => {
      const loteInicio = parseInt(lote.startNumber, 10);
      const loteFim = parseInt(lote.endNumber, 10);
      return nInicio <= loteFim && nFim >= loteInicio;
    });

    if (loteConflitante) {
      const donoDoEstoque = b.vendedores.find((vd: any) => vd._id === (loteConflitante.vendorId || loteConflitante.userId));
      const nomeDono = donoDoEstoque ? donoDoEstoque.name : "outro cambista";
      
      // 🔥 ALERTA NATIVO: Se o frontend detectar o conflito antes, força a janela pop-up na tela
      alert(`🚫 OPERAÇÃO RECUSADA!\n\nOs números de ${nInicio} a ${nFim} já colidem com o vendedor (${nomeDono}) no Lote #${loteConflitante._id.slice(-4).toUpperCase()} [${loteConflitante.startNumber} a ${loteConflitante.endNumber}].`);
      return;
    }

    setIsTransf(true);
    try {
      // Faz a chamada ao banco de dados do Convex
      await transferirCotas({
        eventId: b.selectedEventId,
        startNumber: nInicio,
        endNumber: nFim,
        vendorId: tVendor,
      });
      
      alert(`🎉 Sucesso!\nCartelas de ${nInicio} a ${nFim} foram transferidas com sucesso.`);
      setTStart(""); 
      setTEnd(""); 
      setTVendor("");
    } catch (error: any) {
      console.error(error);
      // 🔥 ALERTA CRÍTICO: Se o erro acontecer no servidor (Ex: número duplicado no Convex), o alert() vai travar a tela e te mostrar a mensagem em texto puro
      alert(`❌ Erro no Servidor!\n\nO banco de dados rejeitou a transferência.\nMotivo: ${error.message || "Conflito de numeração cadastrada"}`);
    } finally {
      setIsTransf(false);
    }
  };

  // Garante que a lista seja tratada sempre como uma array para não quebrar
  const listaLotesBruta = Array.isArray(b.lotes) ? b.lotes : [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans w-full">
      {/* Cabeçalho */}
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase flex items-center gap-2">
            <LayersIcon className="h-8 w-8 text-amber-500" />
            Movimentação & Transferência de Lotes
          </h1>
          <p className="text-slate-400 mt-1">Fabrique bilhetes sequenciais no estoque mestre e distribua frações para cambistas.</p>
        </div>
        <button onClick={() => window.location.reload()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800">
          <RefreshCwIcon className="h-4 w-4" /> Sincronizar Grade
        </button>
      </header>

      {/* Grid Operacional Duplo */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* PAINEL 1: GERAR EM MASSA NO ESTOQUE CENTRAL */}
          <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <PlusIcon className="h-4 w-4 text-amber-500" /> 1. Fabricar no Estoque Central
            </h2>
            <form onSubmit={b.handleGerarLotes} className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Sorteio Vinculado</label>
                <select value={b.selectedEventId} onChange={(e) => b.setSelectedEventId(e.target.value)} className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 text-slate-100 focus:outline-none">
                  <option value="">-- Selecione o Sorteio --</option>
                  {b.eventos.map((ev: any) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Nº Inicial</label>
                  <input type="number" min="1" value={b.startNumber} onChange={(e) => b.setStartNumber(e.target.value)} className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 font-mono" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Nº Final</label>
                  <input type="number" min="1" value={b.endNumber} onChange={(e) => b.setEndNumber(e.target.value)} className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 font-mono" />
                </div>
              </div>
              <button type="submit" disabled={b.isLoading} className="w-full h-10 inline-flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50 mt-1 cursor-pointer">
                {b.isLoading ? "Fabricando..." : "Fabricar Bilhetes"}
              </button>
            </form>
          </section>

          {/* PAINEL 2: TRANSFERIR DO ESTOQUE PARA O VENDEDOR */}
          <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-5 shadow-xl backdrop-blur-md">
            <h2 className="text-sm font-bold text-amber-500 mb-3 border-b border-slate-800 pb-2 flex items-center gap-1.5">
              <MoveRightIcon className="h-4 w-4" /> 2. Transferir para Vendedor
            </h2>
            <form onSubmit={handleTransferenciaLocal} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Da Cartela (Nº)</label>
                  <input type="number" min="1" placeholder="Ex: 1" value={tStart} onChange={(e) => setTStart(e.target.value)} className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 font-mono" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-slate-400">Até a Cartela (Nº)</label>
                  <input type="number" min="1" placeholder="Ex: 200" value={tEnd} onChange={(e) => setTEnd(e.target.value)} className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 font-mono" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-medium">Vendedor Destinatário</label>
                <select 
                  value={tVendor} 
                  onChange={(e) => setTVendor(e.target.value)} 
                  className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 text-slate-100 focus:outline-none"
                >
                  <option value="">-- Selecione o Cambista --</option>
                  {b.vendedores.map((vd: any) => <option key={vd._id} value={vd._id}>{vd.name}</option>)}
                </select>
              </div>
              
              <div className="flex flex-col gap-2 mt-1">
                <button type="submit" className="w-full h-10 inline-flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 mt-1 cursor-pointer transition-colors">
                  {isTransf ? "Transferindo..." : "Efetuar Transferência"}
                </button>
              </div>
            </form>

            {/* CAIXA EXCLUSIVA DE ACESSO DO VENDEDOR */}
            <div className="mt-4 border-t border-slate-800/80 pt-4 flex flex-col gap-1.5 text-xs">
              <label className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Endereço de Acesso do Vendedor</label>
              <div className="flex items-center gap-1.5">
                <input 
                  type="text" 
                  readOnly 
                  value={linkDoAppVendedor} 
                  className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 font-mono text-[11px] text-slate-400 select-all outline-none"
                />
                <button 
                  type="button" 
                  onClick={handleCopiarLink}
                  title="Copiar link do app"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* LISTAGEM HISTÓRICA À DIREITA (ORDENADA POR LOTE DE FORMA DECRESCENTE E EXIBINDO LOCALIZAÇÃO) */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200">Histórico de Movimentações na Nuvem</h2>
          
          {listaLotesBruta.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
              Nenhuma movimentação ou lote ativo localizado.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...listaLotesBruta].reverse().map((lote: any) => {
                const idDoDono = lote.vendorId || lote.userId;
                const donoDoEstoque = b.vendedores.find((vd: any) => vd._id === idDoDono);
                const localEstoque = donoDoEstoque ? donoDoEstoque.name : "Estoque Central";

                return (
                  <div key={lote._id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-2 transition-all hover:border-slate-700">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-slate-200">Lote #{lote._id.slice(-4).toUpperCase()}</span>
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase">Ativo</span>
                    </div>
                    <div className="flex flex-col gap-1 text-slate-400 text-xs">
                      <div className="flex justify-between"><span>De:</span><span className="font-mono text-slate-200">{lote.startNumber}</span></div>
                      <div className="flex justify-between"><span>Até:</span><span className="font-mono text-slate-200">{lote.endNumber}</span></div>
                      
                      <div className="flex justify-between mt-1 border-t border-slate-800/60 pt-1 text-[11px]">
                        <span className="text-slate-500 font-bold uppercase">Localização:</span>
                        <span className="font-semibold text-amber-500 capitalize">{localEstoque}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
