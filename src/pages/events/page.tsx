import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { CalendarDays, Plus, Pencil, Trash2, PlayCircle, DollarSign, X, Copy, Trophy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type EventStatus = "open" | "in_progress" | "finished";

const statusLabel: Record<EventStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  finished: "Encerrado",
};

const statusVariant: Record<EventStatus, "default" | "secondary" | "destructive"> = {
  open: "default",
  in_progress: "secondary",
  finished: "destructive",
};

const PRIZE_MEDAL = ["🥇", "🥈", "🥉", "4º", "5º"];

type Prize = { position: number; description: string };
type InitialEvent = {
  _id: Id<"events">;
  name: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  address?: string;
  city?: string;
  phone?: string;
  totalCards: number;
  cardPrice?: number;
  prizes?: Prize[];
  chanceTipo?: "unica" | "dupla" | "tripla";
};

function EventFormDialog({
  open,
  onClose,
  initial,
  isDuplicate,
}: {
  open: boolean;
  onClose: () => void;
  initial?: InitialEvent;
  isDuplicate?: boolean;
}) {
  const create = useMutation(api.events.create);
  const update = useMutation(api.events.update);
  const currentUser = useQuery(api.users.getCurrentUser);

  const [name, setName] = useState(initial ? (isDuplicate ? `${initial.name} (Cópia)` : initial.name) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  // For duplicates, clear the date so the operator must pick a new one
  const [date, setDate] = useState(initial?.date && !isDuplicate ? initial.date.substring(0, 10) : "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [totalCards, setTotalCards] = useState(String(initial?.totalCards ?? "100"));
  const [cardPrice, setCardPrice] = useState(initial?.cardPrice ? String(initial.cardPrice) : "");
  const [prizes, setPrizes] = useState<Prize[]>(initial?.prizes ?? []);
  const [chanceTipo, setChanceTipo] = useState<"unica" | "dupla" | "tripla">(initial?.chanceTipo ?? "dupla");
  const [loading, setLoading] = useState(false);

  const maxCards = currentUser?.cardLimit ?? 70;

  const addPrize = () => {
    if (prizes.length >= 5) return;
    setPrizes([...prizes, { position: prizes.length + 1, description: "" }]);
  };

  const removePrize = (idx: number) => {
    const updated = prizes.filter((_, i) => i !== idx).map((p, i) => ({ ...p, position: i + 1 }));
    setPrizes(updated);
  };

  const updatePrize = (idx: number, description: string) => {
    setPrizes(prizes.map((p, i) => (i === idx ? { ...p, description } : p)));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !date) {
      toast.error("Preencha nome e data do evento");
      return;
    }
    const cards = parseInt(totalCards);
    if (isNaN(cards) || cards < 1 || cards > maxCards) {
      toast.error(`Total de cartelas deve ser entre 1 e ${maxCards.toLocaleString("pt-BR")}`);
      return;
    }
    const price = cardPrice ? parseFloat(cardPrice.replace(",", ".")) : undefined;
    if (price !== undefined && (isNaN(price) || price < 0)) {
      toast.error("Valor da cartela inválido");
      return;
    }
    const validPrizes = prizes.filter((p) => p.description.trim());
    setLoading(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        date,
        time: time || undefined,
        location: location || undefined,
        address: address || undefined,
        city: city || undefined,
        phone: phone || undefined,
        totalCards: cards,
        cardPrice: price,
        prizes: validPrizes.length > 0 ? validPrizes : undefined,
        chanceTipo,
      };
      if (initial && !isDuplicate) {
        await update({ eventId: initial._id, ...payload });
        toast.success("Evento atualizado!");
      } else {
        await create(payload);
        toast.success(isDuplicate ? "Evento duplicado!" : "Evento criado!");
      }
      onClose();
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Erro ao salvar evento");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Basic info */}
          <div className="space-y-1.5">
            <Label>Nome do Evento</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Bingo de Natal" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do evento..." rows={2} />
          </div>

          <Separator />

          {/* Location info */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Local do Evento</p>
          <div className="space-y-1.5">
            <Label>Nome do Local</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Área de lazer da Comunidade" />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ex: Rua Limeira, Jardim Guanabara" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Abadia de Goiás - GO" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <Separator />

          {/* Date / time */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data e Horário</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data do Evento</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="20:00" />
            </div>
          </div>

          <Separator />

          {/* Cards */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cartelas</p>
          <div className="space-y-1.5">
            <Label>Total de Cartelas (máx. {maxCards.toLocaleString("pt-BR")})</Label>
            <Input
              type="number"
              min={1}
              max={maxCards}
              value={totalCards}
              onChange={(e) => setTotalCards(e.target.value)}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">Seu plano permite até {maxCards.toLocaleString("pt-BR")} cartelas por evento.</p>
          </div>

          {/* Card price */}
          <div className="space-y-1.5">
            <Label>Tipo de Chance</Label>
            <Select value={chanceTipo} onValueChange={(v) => setChanceTipo(v as "unica" | "dupla" | "tripla")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">
                  <span className="flex flex-col">
                    <span className="font-semibold">Chance Única</span>
                    <span className="text-xs text-muted-foreground">1 grade por cartela (20 números)</span>
                  </span>
                </SelectItem>
                <SelectItem value="dupla">
                  <span className="flex flex-col">
                    <span className="font-semibold">Chance Dupla</span>
                    <span className="text-xs text-muted-foreground">2 grades por cartela (40 números)</span>
                  </span>
                </SelectItem>
                <SelectItem value="tripla">
                  <span className="flex flex-col">
                    <span className="font-semibold">Chance Tripla</span>
                    <span className="text-xs text-muted-foreground">3 grades por cartela (60 números)</span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Card value */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              Valor da Cartela (R$)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">R$</span>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={cardPrice}
                onChange={(e) => setCardPrice(e.target.value)}
                placeholder="0,00"
                className="pl-10"
              />
            </div>
          </div>

          <Separator />

          {/* Prizes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
                Prêmios (até 5)
              </Label>
              {prizes.length < 5 && (
                <Button type="button" size="sm" variant="secondary" onClick={addPrize} className="gap-1 h-7 text-xs">
                  <Plus className="w-3 h-3" />
                  Adicionar
                </Button>
              )}
            </div>
            {prizes.length === 0 && (
              <p className="text-muted-foreground text-xs text-center py-2">
                Nenhum prêmio cadastrado. Clique em &quot;Adicionar&quot; para incluir.
              </p>
            )}
            <div className="space-y-2">
              {prizes.map((prize, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-base w-7 text-center shrink-0">{PRIZE_MEDAL[idx]}</span>
                  <Input
                    value={prize.description}
                    onChange={(e) => updatePrize(idx, e.target.value)}
                    placeholder={`Descrição do ${idx + 1}º prêmio...`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removePrize(idx)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EventsPage() {
  const events = useQuery(api.events.list, {});
  const remove = useMutation(api.events.remove);
  const updateStatus = useMutation(api.events.updateStatus);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InitialEvent | null>(null);
  const [duplicating, setDuplicating] = useState<InitialEvent | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"events"> | null>(null);

  const handleDelete = async (id: Id<"events">) => {
    try {
      await remove({ eventId: id });
      toast.success("Evento removido");
    } catch {
      toast.error("Erro ao remover evento");
    }
    setDeletingId(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-foreground">Eventos</h2>
          <p className="text-muted-foreground font-medium mt-1">Gerencie seus eventos de bingo</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Evento
        </Button>
      </div>

      {events === undefined ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
            <EmptyTitle>Nenhum evento criado</EmptyTitle>
            <EmptyDescription>Crie seu primeiro evento de bingo para começar</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setShowForm(true)}>Criar Evento</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event._id} className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-lg text-foreground truncate">{event.name}</h3>
                      <Badge variant={statusVariant[event.status as EventStatus]}>
                        {statusLabel[event.status as EventStatus]}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-muted-foreground text-sm mt-1">{event.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(event.date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <span className="font-semibold text-primary">{event.totalCards.toLocaleString()} cartelas</span>
                      {event.cardPrice !== undefined && (
                        <span className="flex items-center gap-1 font-semibold text-green-600">
                          <DollarSign className="w-3.5 h-3.5" />
                          R$ {event.cardPrice.toFixed(2).replace(".", ",")} / cartela
                        </span>
                      )}
                    </div>
                    {event.prizes && event.prizes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {event.prizes.map((prize) => (
                          <span
                            key={prize.position}
                            className="inline-flex items-center gap-1 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-full px-2.5 py-0.5 font-semibold"
                          >
                            {PRIZE_MEDAL[prize.position - 1]} {prize.description}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {event.status === "open" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => updateStatus({ eventId: event._id, status: "in_progress" })}
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Iniciar
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Duplicar evento"
                      onClick={() =>
                        setDuplicating({
                          _id: event._id,
                          name: event.name,
                          description: event.description,
                          date: event.date,
                          time: event.time,
                          location: event.location,
                          address: event.address,
                          city: event.city,
                          phone: event.phone,
                          totalCards: event.totalCards,
                          cardPrice: event.cardPrice,
                          prizes: event.prizes,
                        })
                      }
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setEditing({
                          _id: event._id,
                          name: event.name,
                          description: event.description,
                          date: event.date,
                          time: event.time,
                          location: event.location,
                          address: event.address,
                          city: event.city,
                          phone: event.phone,
                          totalCards: event.totalCards,
                          cardPrice: event.cardPrice,
                          prizes: event.prizes,
                        })
                      }
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(event._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EventFormDialog
        key={editing?._id ?? "new"}
        open={showForm || !!editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        initial={editing ?? undefined}
      />

      <EventFormDialog
        key={duplicating ? `dup-${duplicating._id}` : "dup-new"}
        open={!!duplicating}
        onClose={() => setDuplicating(null)}
        initial={duplicating ?? undefined}
        isDuplicate
      />

      {/* Delete confirmation */}
      <Dialog open={!!deletingId} onOpenChange={(v) => !v && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Evento</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Tem certeza? Todas as cartelas e sorteios serão removidos.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
