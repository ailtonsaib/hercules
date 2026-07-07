import React from "react";
import { CheckCircle2Icon, ShieldCheckIcon, Loader2Icon } from "lucide-react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export default function ValidationPage() {
  // 1. Captura o ID do evento diretamente da URL da rota
  const { eventId } = useParams<{ eventId: string }>();
  const token = localStorage.getItem("hercules_session_token") || localStorage.getItem("token") || "";

  const [selectedCards, setSelectedCards] = React.useState<string[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // 2. Busca todas as cartelas globais cadastradas na nuvem
  const todasCartelas = useQuery(api.vendorApp.getVendorInventory, { vendorId: "" }) || [];
  const validateCardsInBulk = useMutation(api.cards.validateCardsInBulk);

  // 3. Filtra pelo evento atual e ordena por número sequencial crescente
  const cartelasOrdenadas = todasCartelas
    .filter((c: any) => c.eventId === eventId)
    .sort((a: any, b: any) => {
      return (a.serialNumber || "").localeCompare(b.serialNumber || "", undefined, { numeric: true });
    });

  const toggleSelectCard = (cardId: string, isSold: boolean, isValidated: boolean) => {
    if (!isSold) {
      toast.error("Esta cartela está livre no estoque. Não pode ser validada.");
      return;
    }
    if (isValidated) {
      toast.warning("Esta cartela já foi validada anteriormente.");
      return;
    }

    setSelectedCards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleConfirmarValidacao = async () => {
    if (selectedCards.length === 0) return;
    setIsProcessing(true);

    try {
      await validateCardsInBulk({
        token,
        cardIds: selectedCards
      });
      toast.success(`${selectedCards.length} cartela(s) auditada(s) e liberada(s) para o sorteio!`);
      setSelectedCards([]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao validar cartelas.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#0b0c16] rounded-xl border border-slate-800/80 p-5 shadow-2xl backdrop-blur-md w-full text-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4 mb-4">
        <div>
          <h2 className="text-lg font-black text-slate-200 flex items-center gap-1.5 uppercase">
            <ShieldCheckIcon className="h-5 w-5 text-emerald-400" />
            Mesa de Auditoria & Validação
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Selecione as cartelas vendidas pelos cambistas para liberar a entrada no sorteio.</p>
        </div>

        <button
          onClick={handleConfirmarValidacao}
          disabled={selectedCards.length === 0 || isProcessing}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs px-5 transition-all shadow-lg"
        >
          {isProcessing ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2Icon className="h-4 w-4" />
          )}
          Validar {selectedCards.length} Selecionada(s)
        </button>
      </div>

      {/* INDICADORES DE LEGENDA */}
      <div className="flex gap-4 text-[10px] uppercase font-bold text-slate-400 mb-4 bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800" /> Disponível</div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400" /> Vendida (Pendente)</div>
        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 text-slate-950" /> Validada (No Globo)</div>
      </div>

      {/* GRADE DE CARTELAS EM ORDEM CRESCENTE */}
      {cartelasOrdenadas.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
          Nenhuma cartela fabricada para este sorteio até o momento.
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 overflow-y-auto max-h-[450px] pr-1 font-mono">
          {cartelasOrdenadas.map((card: any) => {
            const numeroLimpo = card.serialNumber.replace("CRT-", "");
            const isSelected = selectedCards.includes(card._id);
            
            let classesEstilo = "bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed";
            
            if (card.isSold) {
              if (card.isValidated) {
                classesEstilo = "bg-emerald-500 border-emerald-400 text-slate-950 font-black";
              } else if (isSelected) {
                classesEstilo = "bg-amber-500 border-amber-400 text-slate-950 font-black scale-[1.03] shadow-md";
              } else {
                classesEstilo = "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:border-amber-400";
              }
            }

            return (
              <button
                key={card._id}
                disabled={!card.isSold || card.isValidated}
                onClick={() => toggleSelectCard(card._id, !!card.isSold, !!card.isValidated)}
                className={`h-11 rounded-lg border text-xs flex flex-col items-center justify-center font-bold tracking-wide transition-all ${classesEstilo}`}
              >
                <span>{numeroLimpo}</span>
                {card.isSold && !card.isValidated && (
                  <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-slate-950' : 'bg-amber-400'}`} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
