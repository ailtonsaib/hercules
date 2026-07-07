import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export function useBatches() {
  const [selectedEventId, setSelectedEventId] = React.useState("");
  const [startNumber, setStartNumber] = React.useState("1");
  const [endNumber, setEndNumber] = React.useState("100");
  const [selectedVendorId, setSelectedVendorId] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  // 1. Captura o token de sessão ativo do localStorage
  const token = localStorage.getItem("hercules_session_token") || localStorage.getItem("token") || "";

  // 2. Passa o token de forma explícita para validar o privilégio de Admin no backend
  const eventos = useQuery(api.events.list, { token }) || [];

  const vendedores = useQuery((api as any).vendors.list) || [];
  const lotes = useQuery((api as any).batches.list) || [];

  // EFEITO INTELIGENTE: Bloqueia duplicidade e sugere a numeração correta na hora
  React.useEffect(() => {
    if (!selectedEventId || lotes.length === 0) {
      setStartNumber("1");
      setEndNumber("100");
      return;
    }

    const lotesDoEvento = lotes.filter((l: any) => l.eventId === selectedEventId);
    
    if (lotesDoEvento.length > 0) {
      const maiorNumeroFinal = Math.max(...lotesDoEvento.map((l: any) => l.endNumber));
      const proximoInicio = maiorNumeroFinal + 1;
      
      setStartNumber(proximoInicio.toString());
      setEndNumber((proximoInicio + 199).toString()); // Sugere lote de 200 padrão
    } else {
      setStartNumber("1");
      setEndNumber("100");
    }
  }, [selectedEventId, lotes]);

  const emitirLoteMassa = useMutation((api as any).batches.createBatch);
  const deletarLoteMassa = useMutation((api as any).batches.deleteBatch);

  const handleGerarLotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      toast.error("Por favor, selecione um evento/sorteio ativo.");
      return;
    }

    const start = Number(startNumber);
    const end = Number(endNumber);

    if (isNaN(start) || isNaN(end) || start <= 0 || end < start) {
      toast.error("O intervalo numérico de cartelas informado é inválido.");
      return;
    }

    setIsLoading(true);
    try {
      await emitirLoteMassa({
        eventId: selectedEventId,
        startNumber: start,
        endNumber: end,
        vendorId: selectedVendorId || undefined,
      });
      toast.success("Lote de cartelas enviado e distribuído com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao tentar processar a emissão.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcluirLote = async (batchId: string) => {
    if (!window.confirm("Atenção! Isso removerá o lote e todas as cartelas geradas dentro dele. Deseja continuar?")) {
      return;
    }

    try {
      await deletarLoteMassa({ batchId });
      toast.success("Lote e bilhetes excluídos com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao tentar excluir.");
    }
  };

  // 📊 MÓDULO AUXILIAR: Calcula o saldo acumulado distribuído para cada cambista
  const obterResumoPorVendedor = () => {
    const mapa = new Map<string, number>();
    lotes.forEach((l: any) => {
      if (l.eventId === selectedEventId) {
        const total = l.endNumber - l.startNumber + 1;
        const chave = l.vendorName || "Estoque Central";
        mapa.set(chave, (mapa.get(chave) || 0) + total);
      }
    });
    return Array.from(mapa.entries()).map(([vendedor, total]) => ({ vendedor, total }));
  };

  return {
    selectedEventId, setSelectedEventId, startNumber, setStartNumber,
    endNumber, setEndNumber, selectedVendorId, setSelectedVendorId,
    isLoading, handleGerarLotes, handleExcluirLote, obterResumoPorVendedor,
    eventos, vendedores, lotes
  };
}
