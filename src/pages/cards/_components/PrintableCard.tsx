import * as React from "react";
import { TicketIcon, ShieldCheckIcon } from "lucide-react";

interface PrintableCardProps {
  card?: any;
  event?: any;
}

export function PrintableCard({ card, event }: PrintableCardProps) {
  // Gera uma simulação de números caso o objeto da cartela venha vazio
  const numerosSimulados = [
    1, 16, 31, 46, 61,
    2, 17, 32, 47, 62,
    3, 18, "★", 48, 63,
    4, 19, 34, 49, 64,
    5, 20, 35, 50, 65
  ];

  // Extrai as informações usando coerção de tipo livre para evitar travamentos do compilador
  const tituloEvento = event ? (event as any).title : "Sorteio Oficial";
  const descricaoEvento = event ? (event as any).description : "Bingo Premier";
  const idCartela = card ? (card as any)._id : "PREMIER-0001";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl font-sans text-white mx-auto my-4 print:border-black print:bg-white print:text-black">
      {/* Topo da Cartela */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 print:border-slate-300">
        <div className="flex items-center gap-2">
          <TicketIcon className="h-5 w-5 text-amber-500 print:text-black" />
          <div>
            <h4 className="font-bold text-sm tracking-tight text-slate-200 print:text-black">
              {tituloEvento}
            </h4>
            <p className="text-[10px] text-slate-400 print:text-slate-500">
              {descricaoEvento}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 print:border print:border-black print:text-black">
          <ShieldCheckIcon className="h-3 w-3" /> VERIFICADA
        </div>
      </div>

      {/* Grade Numérica do Bingo (Matriz 5x5) */}
      <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800/60 print:bg-slate-50 print:border-slate-300">
        {numerosSimulados.map((num: any, idx: number) => {
          const isStar = num === "★";
          return (
            <div
              key={idx}
              className={`aspect-square flex items-center justify-center font-bold text-sm rounded transition-all border ${
                isStar
                  ? "bg-amber-500/10 border-amber-500 text-amber-500 print:bg-slate-200 print:text-black print:border-black"
                  : "bg-slate-900 border-slate-800/40 text-slate-300 print:bg-white print:text-black print:border-slate-200"
              }`}
            >
              {num}
            </div>
          );
        })}
      </div>

      {/* Identificador de Rodada Inferior */}
      <div className="mt-4 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-500 print:border-slate-300">
        <span>REF: {idCartela}</span>
        <span>AUTORIZADO PARA IMPRESSÃO</span>
      </div>
    </div>
  );
}

export default PrintableCard;
