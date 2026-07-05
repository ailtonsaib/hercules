import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { Layers, CheckCircle2, Clock, Search, Package, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type CardDoc = {
  _id: Id<"cards">;
  cardNumber: number;
  buyerName?: string;
  buyerPhone?: string;
  paid?: boolean;
  validated?: boolean;
  eventId: Id<"events">;
};

function SellDialog({
  card,
  open,
  onClose,
}: {
  card: CardDoc;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(card.buyerName ?? "");
  const [phone, setPhone] = useState(card.buyerPhone ?? "");
  const [loading, setLoading] = useState(false);
  const assignBuyer = useMutation(api.cards.assignBuyer);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome do comprador"); return; }
    setLoading(true);
    try {
      await assignBuyer({ cardId: card._id, buyerName: name.trim(), buyerPhone: phone, paid: true });
      toast.success("Venda registrada!");
      onClose();
    } catch {
      toast.error("Erro ao registrar venda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Venda — Cartela #{card.cardNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome do comprador</Label>
            <Input placeholder="João Silva" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone (opcional)</Label>
            <Input placeholder="(62) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1 cursor-pointer" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 cursor-pointer" onClick={() => void handleSave()} disabled={loading}>
              {loading ? "Salvando..." : "Confirmar Venda"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MeuPainelPage() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const allEvents = useQuery(api.events.list);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sellCard, setSellCard] = useState<CardDoc | null>(null);

  const linkedVendorId = currentUser?.linkedVendorId;

  const vendorBatches = useQuery(
    api.vendors.getVendorBatches,
    linkedVendorId ? { vendorId: linkedVendorId } : "skip"
  );

  const eventCards = useQuery(
    api.cards.listPaginated,
    selectedEventId ? { eventId: selectedEventId as Id<"events">, paginationOpts: { numItems: 200, cursor: null } } : "skip"
  );

  if (!currentUser) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (currentUser.role !== "vendor" && !currentUser.isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-muted-foreground">Acesso restrito.</p>
      </div>
    );
  }

  const myBatchByEvent: Record<string, number[]> = {};
  if (vendorBatches) {
    for (const batch of vendorBatches) {
      const eid = batch.eventId as string;
      if (!myBatchByEvent[eid]) myBatchByEvent[eid] = [];
      myBatchByEvent[eid].push(...batch.cardNumbers);
    }
  }

  const myEventIds = Object.keys(myBatchByEvent);
  const myEvents = allEvents?.filter((e) => myEventIds.includes(e._id)) ?? [];

  const assignedNumbers = selectedEventId ? (myBatchByEvent[selectedEventId] ?? []) : [];
  const myCards = (eventCards?.page ?? []).filter((c) =>
    assignedNumbers.includes(c.cardNumber)
  );

  const filtered = myCards.filter((c) => {
    if (!search) return true;
    return (
      c.cardNumber.toString().includes(search) ||
      (c.buyerName?.toLowerCase().includes(search.toLowerCase()) ?? false)
    );
  });

  const stats = {
    total: myCards.length,
    sold: myCards.filter((c) => c.paid).length,
    pending: myCards.filter((c) => !c.paid).length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Meu Painel</h1>
        <p className="text-muted-foreground text-sm">
          Bem-vindo, {currentUser.name ?? "Vendedor"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Selecione um evento" />
          </SelectTrigger>
          <SelectContent>
            {myEvents.map((e) => (
              <SelectItem key={e._id} value={e._id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedEventId && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou comprador..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {selectedEventId && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Package className="w-3 h-3" /> Total
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-green-600">{stats.sold}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> Pagos
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-yellow-500" /> Pendentes
            </div>
          </div>
        </div>
      )}

      {selectedEventId && (
        <div className="space-y-2">
          {!eventCards ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma cartela encontrada</p>
            </div>
          ) : (
            filtered.map((card) => (
              <div
                key={card._id}
                className={cn(
                  "flex items-center justify-between p-4 bg-card border rounded-xl",
                  card.paid && "border-green-200 dark:border-green-900"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm",
                      card.paid
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {card.cardNumber}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      {card.buyerName ?? <span className="text-muted-foreground italic">Sem comprador</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.buyerPhone ?? ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {card.paid ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Pago
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => setSellCard(card as CardDoc)}
                    >
                      <DollarSign className="w-3 h-3 mr-1" /> Vender
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!selectedEventId && myEvents.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum lote atribuído</p>
          <p className="text-sm mt-1">Aguarde o administrador atribuir cartelas a você.</p>
        </div>
      )}

      {sellCard && (
        <SellDialog card={sellCard} open={true} onClose={() => setSellCard(null)} />
      )}
    </div>
  );
}
