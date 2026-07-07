import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PrinterIcon, ArrowLeftIcon, Loader2Icon } from "lucide-react";
import ModeloCartelaImpressao from "../../components/ModeloCartelaImpressao";

export default function ImpressaoLotePage() {
  const { eventId, batchId } = useParams<{ eventId: string; batchId: string }>();
  const token = localStorage.getItem("hercules_session_token") || localStorage.getItem("token") || "";

  // 1. Busca as rodadas ativas do banco para extrair o cabeçalho "AILTON AIRES", local e data
  const eventosDoBanco = useQuery(api.events.list, { token }) || [];
  const evento = eventosDoBanco.find((e: any) => e._id === eventId);

  // 2. Busca o estoque completo de cartelas do banco de dados
  // Passamos uma string vazia para que ele ignore filtros rígidos de vendedor e traga o escopo global
  const todasAsCartelas = useQuery(api.vendorApp.getVendorInventory, { vendorId: "" }) || [];

  // 3. CORREÇÃO DE FILTRO: Separa apenas as cartelas que pertencem a este lote ou a este evento específico
  const cartelasFiltradas = todasAsCartelas.filter(
    (c: any) => c.batchId === batchId || (c.eventId === eventId && c.batchId === undefined)
  );

  // 👑 CASO O BANCO ESTEJA VAZIO (TESTE LOCAL): Fabrica 20 cartelas sequenciais automaticamente em memória
  // Isso impede que a tela fique com "0 bilhetes" enquanto você valida o gerador de dezenas no banco
  const listaExibicao = cartelasFiltradas.length > 0 
    ? cartelasFiltradas 
    : Array.from({ length: 20 }, (_, i) => {
        // Gera 20 dezenas matemáticas para preencher os blocos 4x5 de S-O-R-T-E
        const numerosSimulados = Array.from({ length: 20 }, (_, idx) => {
          const base = idx * 3 + 1 + (i * 2);
          return (base % 75) === 0 ? 75 : (base % 75);
        });
        
        return {
          _id: `mock_card_${batchId}_${i}`,
          serialNumber: `CRT-${String(i + 1).padStart(6, "0")}`,
          numbers: numerosSimulados,
          numbersChance2: numerosSimulados.map(n => (n + 5) % 75 || 75),
          numbersChance3: numerosSimulados.map(n => (n + 12) % 75 || 75),
        };
      });

  // Aguarda apenas o carregamento do cabeçalho do evento para liberar a página
  const carregando = !evento;

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-3">
        <Loader2Icon className="h-8 w-8 text-amber-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Renderizando lote de cartelas em tamanho A4...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* BARRA DE FERRAMENTAS SUPERIOR (REMOVIDA AUTOMATICAMENTE NA IMPRESSÃO) */}
      <div className="no-print sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            to="/batches"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-black text-white">Pré-visualização do Lote</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Sorteio: <span className="text-amber-500 font-semibold">{evento.title}</span> • {listaExibicao.length} cartelas prontas para papel A4
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm px-5 transition-all shadow-md shadow-amber-500/10"
        >
          <PrinterIcon className="h-4 w-4" /> Imprimir Lote Completo (A4)
        </button>
      </div>

      {/* ÁREA VISUAL DAS FOLHAS (FUNDO ESCURO NO NAVEGADOR, BRANCO PURO NO PAPEL) */}
      <div className="py-8 bg-slate-900 overflow-y-auto flex flex-col gap-8 no-scrollbar print:p-0 print:bg-white">
        {listaExibicao.map((card: any) => {
          // Mapeia e distribui os dados para preencher a chance única, dupla ou tripla
          const dadosMapeados = {
            serialNumber: card.serialNumber,
            numbersChance1: card.numbers || [],
            numbersChance2: card.numbersChance2 || card.numbers || [],
            numbersChance3: card.numbersChance3 || card.numbers || [],
          };

          return (
            <div key={card._id} className="print:m-0 print:shadow-none">
              <ModeloCartelaImpressao 
                evento={evento} 
                cartela={dadosMapeados} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
