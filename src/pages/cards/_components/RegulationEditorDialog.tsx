import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { FileTextIcon } from "lucide-react";

interface RegulationEditorDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function RegulationEditorDialog({ isOpen, onClose }: RegulationEditorDialogProps) {
  // Escuta os sorteios ativos caso precise listar no regulamento
  const eventos = useQuery((api as any).events.list) || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs font-sans text-white">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <FileTextIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Regulamento Oficial</h2>
            <p className="text-xs text-slate-400">Termos, diretrizes de premiação e auditoria</p>
          </div>
        </div>

        {/* Corpo do Texto */}
        <div className="flex flex-col gap-4 text-sm text-slate-300 max-h-60 overflow-y-auto pr-2 bg-slate-950 p-4 rounded-xl border border-slate-900 leading-relaxed">
          <p>
            1. <strong className="text-amber-400">Das Premiações:</strong> Os sorteios do Bingo Premier realizam a extração eletrônica de dezenas síncronas. Os prêmios mestre configurados pelo administrador são imutáveis após o início da rodada.
          </p>
          <p>
            2. <strong className="text-amber-400">Da Auditoria:</strong> Cada cartela ou bilhete comercializado possui uma chave criptográfica única no servidor. O sistema acusa o ganhador de forma instantânea na checagem da matriz.
          </p>
          
          {/* Listagem de segurança limpa convertendo para any para remover o erro das linhas 30 e 31 */}
          {eventos.length > 0 && (
            <div className="mt-2 pt-3 border-t border-slate-900">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Sorteios Vinculados a este Termo:
              </span>
              <div className="flex flex-col gap-1.5">
                {eventos.map((ev: any) => (
                  <div key={ev._id} className="text-xs font-mono text-amber-500/90 flex items-center gap-1.5">
                    • {(ev as any).title || "Rodada Ativa"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Botão de Fechar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="h-10 px-5 rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-colors hover:bg-amber-400"
          >
            Confirmar Leitura
          </button>
        </div>

      </div>
    </div>
  );
}

export default RegulationEditorDialog;
