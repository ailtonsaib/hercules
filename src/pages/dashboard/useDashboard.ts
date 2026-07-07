import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export function useDashboard() {
  const token = localStorage.getItem("hercules_session_token") || localStorage.getItem("token") || "";

  // 1. Estados locais do formulário de eventos
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [localName, setLocalName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [eventTime, setEventTime] = React.useState("");
  const [totalCards, setTotalCards] = React.useState(1000);
  const [chanceType, setChanceType] = React.useState("unica");
  const [cardValue, setCardValue] = React.useState("0,00");
  const [prizes, setPrizes] = React.useState<string[]>([]);
  const [newPrize, setNewPrize] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // 2. Chamadas de Query e Mutation para o Convex
  const eventos = useQuery(api.events.list, { token }) || [];
  const cadastrarEvento = useMutation(api.events.create || (api as any).events.createEvent);
  const editarEvento = useMutation(api.events.update || (api as any).events.updateEvent);
  const deletarEvento = useMutation(api.events.remove || (api as any).events.deleteEvent);

  // SELEÇÃO INTELIGENTE AUTOMÁTICA: Memoriza o primeiro sorteio da nuvem se nenhum estiver ativo no cache
  React.useEffect(() => {
    if (Array.isArray(eventos) && eventos.length > 0) {
      const currentStored = localStorage.getItem("hercules_last_event_id");
      const existeNaLista = eventos.some((e: any) => e._id === currentStored);
      if (!currentStored || !existeNaLista) {
        localStorage.setItem("hercules_last_event_id", eventos[0]._id);
      }
    }
  }, [eventos]);

  const handleIniciarEdicao = (evento: any) => {
    localStorage.setItem("hercules_last_event_id", evento._id);

    setEditingEventId(evento._id);
    setTitle(evento.title || "");
    setDescription(evento.description || "");
    setLocalName(evento.localName || "");
    setAddress(evento.address || "");
    setCity(evento.city || "");
    setPhone(evento.phone || "");
    setEventDate(evento.eventDate || "");
    setEventTime(evento.eventTime || "");
    setTotalCards(evento.totalCards || 1000);
    setChanceType(evento.chanceType || "unica");
    
    const valorConvertido = ((evento.cardValue || 0) / 100).toFixed(2).replace(".", ",");
    setCardValue(valorConvertido);
    
    setPrizes(Array.isArray(evento.prizes) ? evento.prizes : []);
    toast.success(`Carregando dados de: ${evento.title}`);
  };

  const handleCancelarEdicao = () => {
    setEditingEventId(null);
    setTitle("");
    setDescription("");
    setLocalName("");
    setAddress("");
    setCity("");
    setPhone("");
    setEventDate("");
    setEventTime("");
    setTotalCards(1000);
    setChanceType("unica");
    setCardValue("0,00");
    setPrizes([]);
    setNewPrize("");
  };

  const handleAddPrize = () => {
    if (!newPrize.trim()) return;
    if (prizes.length >= 5) {
      toast.warning("Limite máximo de 5 prêmios atingido.");
      return;
    }
    setPrizes([...prizes, newPrize.trim()]);
    setNewPrize("");
  };

  const handleRemovePrize = (index: number) => {
    setPrizes(prizes.filter((_, idx) => idx !== index));
  };
  const handleLancarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título do sorteio é obrigatório.");
      return;
    }

    setIsLoading(true);
    const centavos = Math.round(parseFloat(cardValue.replace(".", "").replace(",", ".")) * 100) || 0;

    try {
      if (editingEventId) {
        await editarEvento({
          token,
          // 👑 BLINDAGEM DO ERRO: Coerção mestre as any para calar o TypeScript
          eventId: editingEventId as any,
          title,
          description,
          localName,
          address,
          city,
          phone,
          eventDate,
          eventTime,
          totalCards,
          chanceType,
          cardValue: centavos,
          prizes,
        });
        toast.success("Rodada de sorteio atualizada com sucesso na nuvem!");
        handleCancelarEdicao();
      } else {
        const novoId = await cadastrarEvento({
          token,
          title,
          description,
          localName,
          address,
          city,
          phone,
          eventDate,
          eventTime,
          totalCards,
          chanceType,
          cardValue: centavos,
          prizes,
        });
        if (novoId) {
          localStorage.setItem("hercules_last_event_id", novoId as string);
        }
        toast.success("Nova rodada de bingo lançada com sucesso!");
        handleCancelarEdicao();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Ocorreu um erro ao processar o sorteio.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletarEvento = async (id: string) => {
    if (window.confirm("Atenção! Excluir esta rodada apagará todas as cartelas vinculadas permanentemente. Confirmar?")) {
      try {
        // 👑 BLINDAGEM DO ERRO: Coerção mestre as any contra a tipagem rígida Id<"events">
        await deletarEvento({ token, eventId: id as any });
        toast.success("Rodada excluída do banco de dados.");
        if (editingEventId === id) handleCancelarEdicao();
        
        if (localStorage.getItem("hercules_last_event_id") === id) {
          localStorage.removeItem("hercules_last_event_id");
        }
      } catch (err: any) {
        toast.error(err.message || "Erro ao deletar rodada.");
      }
    }
  };

  return {
    eventos,
    title, setTitle,
    description, setDescription,
    localName, setLocalName,
    address, setAddress,
    city, setCity,
    phone, setPhone,
    eventDate, setEventDate,
    eventTime, setEventTime,
    totalCards, setTotalCards,
    chanceType, setChanceType,
    cardValue, setCardValue,
    prizes, handleAddPrize, handleRemovePrize,
    newPrize, setNewPrize,
    isLoading,
    editingEventId,
    handleLancarEvento,
    handleIniciarEdicao,
    handleCancelarEdicao,
    handleDeletarEvento,
  };
}
