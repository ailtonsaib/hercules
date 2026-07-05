import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ArrowRightLeft, Package, Trash2, RotateCcw, CheckSquare, Square, ChevronDown, ChevronUp, Users, PlusCircle, Link2, Copy, Lock } from "lucide-react";
import { toast } from "sonner";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";

function copyToClipboard(text: string, label: string) {
  void navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado!`));
}

type Batch = Doc<"vendorBatches">;

function BatchRow({
  batch,
  cards,
  selectedCards,
  onToggleCard,
  onSelectAll,
  onDeselectAll,
  expanded,
  onToggleExpand,
  onAddCards,
}: {
  batch: Batch;
  cards: Record<number, { buyerName?: string; paid?: boolean }>;
  selectedCards: Set<number>;
  onToggleCard: (n: number) => void;
  onSelectAll: (nums: number[]) => void;
  onDeselectAll: (nums: number[]) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onAddCards: (batch: Batch) => void;
}) {
  const nums = [...batch.cardNumbers].sort((a, b) => a - b);
  const unpaidNums = nums.filter((n) => !cards[n]?.buyerName || !cards[n]?.paid);
  const paidNums = nums.filter((n) => cards[n]?.buyerName && cards[n]?.paid);
  const batchSelected = nums.filter((n) => selectedCards.has(n));

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Batch header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpand}
      >
        <Package className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">
            {batch.vendorName ?? "Sem vendedor"}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            Código: <span className="font-bold text-foreground">{batch.accessCode}</span>
            {" · "}{nums.length} cartelas
            {paidNums.length > 0 && <span className="text-green-600"> · {paidNums.length} vendidas</span>}
            {unpaidNums.length > 0 && <span className="text-yellow-600"> · {unpaidNums.length} não vendidas</span>}
          </p>
          {/* Vendor URL help */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Link do vendedor:</span>
            <span className="text-[10px] font-mono text-foreground/70 bg-muted px-1.5 py-0.5 rounded truncate max-w-[160px]">
              {window.location.origin}/vendedor
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); copyToClipboard(`${window.location.origin}/vendedor`, "Link do vendedor"); }}
              className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5 font-semibold cursor-pointer"
              title="Copiar link do app do vendedor"
            >
              <Copy className="w-3 h-3" />
              Copiar
            </button>
          </div>
        </div>
        {batchSelected.length > 0 && (
          <Badge className="bg-primary text-primary-foreground text-xs font-bold">
            {batchSelected.length} selecionadas
          </Badge>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onAddCards(batch); }}
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-2 py-1 cursor-pointer transition-colors"
          title="Adicionar mais cartelas a este lote"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Adicionar
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3">
          {/* Select helpers */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => onSelectAll(nums)}
              className="text-primary underline font-semibold cursor-pointer"
            >Selecionar todas</button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={() => onSelectAll(unpaidNums)}
              className="text-yellow-600 underline font-semibold cursor-pointer"
            >Só não vendidas ({unpaidNums.length})</button>
            <span className="text-muted-foreground">·</span>
            <button
              onClick={() => onDeselectAll(nums)}
              className="text-muted-foreground underline font-semibold cursor-pointer"
            >Desmarcar todas</button>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            {nums.map((n) => {
              const card = cards[n];
              const isSold = !!card?.buyerName;
              const isPaid = isSold && !!card?.paid;
              const isSelected = selectedCards.has(n);
              return (
                <button
                  key={n}
                  onClick={() => onToggleCard(n)}
                  className={`relative rounded-lg border-2 py-1.5 text-center text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : isPaid
                      ? "border-green-400 bg-green-50 dark:bg-green-950/20 text-green-700"
                      : isSold
                      ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700"
                      : "border-border bg-background text-muted-foreground hover:border-primary"
                  }`}
                  title={card?.buyerName ?? "Disponível"}
                >
                  {isSelected && (
                    <CheckSquare className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-primary" />
                  )}
                  {String(n).padStart(3, "0")}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400 inline-block" />Paga</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-400 inline-block" />Atribuída</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-border inline-block" />Disponível</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-primary inline-block" />Selecionada</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BatchesPage() {
  const moduleStatus = useQuery(api.appSettings.getUserModuleStatus);
  const events = useQuery(api.events.list, {});
  const vendors = useQuery(api.vendors.list, {});
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const eventId = selectedEvent as Id<"events">;

  const batches = useQuery(api.vendorBatches.listByEvent, selectedEvent ? { eventId } : "skip");
  const allCards = useQuery(api.cards.listForExport, selectedEvent ? { eventId } : "skip");
  const transferCards = useMutation(api.vendorBatches.transferCards);
  const addCardsMutation = useMutation(api.vendorBatches.addCards);

  // Add cards to batch dialog state
  const [addToBatch, setAddToBatch] = useState<Batch | null>(null);
  const [addMode, setAddMode] = useState<"range" | "manual">("range");
  const [addFrom, setAddFrom] = useState("");
  const [addTo, setAddTo] = useState("");
  const [addManual, setAddManual] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAddCards = async () => {
    if (!addToBatch) return;
    setAdding(true);
    try {
      let cardNumbers: number[] = [];
      if (addMode === "range") {
        const from = parseInt(addFrom);
        const to = parseInt(addTo);
        if (isNaN(from) || isNaN(to) || from > to) throw new Error("Intervalo inválido");
        cardNumbers = Array.from({ length: to - from + 1 }, (_, i) => from + i);
      } else {
        cardNumbers = addManual
          .split(/[,\s]+/)
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n));
        if (cardNumbers.length === 0) throw new Error("Nenhuma cartela válida informada");
      }
      const result = await addCardsMutation({ batchId: addToBatch._id, cardNumbers });
      toast.success(`${cardNumbers.length} cartela(s) adicionada(s)! Código: ${result.code} — Total: ${result.total}`);
      setAddToBatch(null);
      setAddFrom("");
      setAddTo("");
      setAddManual("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar cartelas");
    } finally {
      setAdding(false);
    }
  };

  // Map cardNumber -> card info
  const cardMap = useMemo(() => {
    const map: Record<number, { buyerName?: string; paid?: boolean }> = {};
    for (const c of allCards ?? []) {
      map[c.cardNumber] = { buyerName: c.buyerName, paid: c.paid };
    }
    return map;
  }, [allCards]);

  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set());
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [targetVendor, setTargetVendor] = useState<string>("return"); // "return" = devolver ao app
  const [transferring, setTransferring] = useState(false);
  const [resultCode, setResultCode] = useState<string | null>(null);

  const toggleCard = (n: number) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectAll = (nums: number[]) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      nums.forEach((n) => next.add(n));
      return next;
    });
  };

  const deselectAll = (nums: number[]) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      nums.forEach((n) => next.delete(n));
      return next;
    });
  };

  const handleTransfer = async () => {
    if (selectedCards.size === 0) return;
    setTransferring(true);
    try {
      const cardNumbers = [...selectedCards];
      let targetVendorId: Id<"vendors"> | undefined;
      let targetVendorName: string | undefined;

      if (targetVendor !== "return") {
        const vendor = vendors?.find((v) => v._id === targetVendor);
        if (vendor) {
          targetVendorId = vendor._id as Id<"vendors">;
          targetVendorName = vendor.name;
        }
      }

      const result = await transferCards({
        eventId,
        cardNumbers,
        targetVendorId,
        targetVendorName,
      });

      setResultCode(result.code);
      setSelectedCards(new Set());
      if (targetVendor === "return") {
        toast.success(`${result.removed} cartela(s) devolvidas ao aplicativo!`);
        setShowTransferDialog(false);
      } else {
        toast.success(`${cardNumbers.length} cartela(s) transferidas com sucesso!`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao transferir");
    } finally {
      setTransferring(false);
    }
  };

  const handleCloseDialog = () => {
    setShowTransferDialog(false);
    setResultCode(null);
    setTargetVendor("return");
  };

  // Cards not in any batch
  const assignedCards = new Set((batches ?? []).flatMap((b) => b.cardNumbers));
  const unassignedCards = (allCards ?? []).filter((c) => !assignedCards.has(c.cardNumber) && !c.buyerName);

  // Block access if vendor app module is not enabled
  if (moduleStatus !== undefined && moduleStatus !== null && !moduleStatus.vendorApp.enabled) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-20 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Módulo não liberado</h2>
        <p className="text-muted-foreground">
          O módulo <strong>App do Vendedor / Transferência de Lotes</strong> está disponível a partir do plano{" "}
          <strong>{moduleStatus.vendorApp.minPlan.toUpperCase()}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">Entre em contato com o administrador para fazer upgrade do seu plano.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
          <ArrowRightLeft className="w-7 h-7 text-primary" />
          Transferência de Lotes
        </h2>
        <p className="text-muted-foreground font-medium mt-1">
          Selecione cartelas de um lote e transfira para outro vendedor ou devolva ao aplicativo
        </p>
      </div>

      {/* Event selector */}
      <div className="max-w-xs space-y-1.5">
        <Label>Selecionar Evento</Label>
        <Select value={selectedEvent} onValueChange={(v) => {
          setSelectedEvent(v);
          setSelectedCards(new Set());
          setExpandedBatch(null);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha um evento..." />
          </SelectTrigger>
          <SelectContent>
            {events?.map((e) => (
              <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedEvent ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ArrowRightLeft /></EmptyMedia>
            <EmptyTitle>Selecione um evento</EmptyTitle>
            <EmptyDescription>Escolha um evento para gerenciar os lotes de vendedores</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : batches === undefined || allCards === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : batches.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Package /></EmptyMedia>
            <EmptyTitle>Nenhum lote gerado</EmptyTitle>
            <EmptyDescription>Gere lotes na página de Cartelas para que apareçam aqui</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Summary + action bar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-card border rounded-xl">
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm font-bold text-foreground">
                {batches.length} lote{batches.length !== 1 ? "s" : ""} · {assignedCards.size} cartelas em lotes
                {unassignedCards.length > 0 && (
                  <span className="text-muted-foreground font-medium"> · {unassignedCards.length} sem lote</span>
                )}
              </p>
              {selectedCards.size > 0 && (
                <p className="text-xs text-primary font-semibold">
                  {selectedCards.size} cartela(s) selecionada(s)
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {selectedCards.size > 0 && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedCards(new Set())}
                    className="gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Limpar seleção
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setTargetVendor("return"); setShowTransferDialog(true); }}
                    className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Devolver ao app ({selectedCards.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowTransferDialog(true)}
                    className="gap-1.5"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Transferir ({selectedCards.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Batch list */}
          <div className="space-y-3">
            {batches.map((batch) => (
              <BatchRow
                key={batch._id}
                batch={batch}
                cards={cardMap}
                selectedCards={selectedCards}
                onToggleCard={toggleCard}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                expanded={expandedBatch === batch._id}
                onToggleExpand={() => setExpandedBatch(expandedBatch === batch._id ? null : batch._id)}
                onAddCards={(b) => { setAddToBatch(b); setAddMode("range"); setAddFrom(""); setAddTo(""); setAddManual(""); }}
              />
            ))}
          </div>
        </>
      )}

      {/* Transfer dialog */}
      <Dialog open={showTransferDialog} onOpenChange={(v) => !v && handleCloseDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              {targetVendor === "return" ? "Devolver ao Aplicativo" : "Transferir Cartelas"}
            </DialogTitle>
          </DialogHeader>

          {resultCode ? (
            <div className="space-y-4 text-center py-2">
              <p className="text-sm text-muted-foreground">
                Cartelas transferidas! Novo código de acesso para o vendedor:
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 rounded-2xl py-6 px-4">
                <p className="text-5xl font-black tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
                  {resultCode}
                </p>
              </div>
              <Button className="w-full" onClick={handleCloseDialog}>Fechar</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-bold text-foreground">{selectedCards.size} cartela(s)</span> selecionada(s).
                </p>

                <div className="space-y-1.5">
                  <Label>Destino</Label>
                  <Select value={targetVendor} onValueChange={setTargetVendor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="return">
                        <span className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-orange-500" />
                          Devolver ao aplicativo (sem lote)
                        </span>
                      </SelectItem>
                      {vendors?.map((v) => (
                        <SelectItem key={v._id} value={v._id}>
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            {v.name}{v.phone ? ` — ${v.phone}` : ""}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {targetVendor === "return" && (
                  <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-xs text-orange-700 dark:text-orange-300">
                    As cartelas serão removidas dos lotes e voltarão a ficar disponíveis no painel de Cartelas.
                  </div>
                )}
                {targetVendor !== "return" && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                    As cartelas serão movidas para o lote do vendedor selecionado. Um novo código será gerado se necessário.
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                <Button
                  onClick={() => void handleTransfer()}
                  disabled={transferring}
                  className={targetVendor === "return" ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}
                >
                  {transferring ? "Processando..." : targetVendor === "return" ? "Devolver" : "Transferir"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Cards to Batch dialog */}
      <Dialog open={!!addToBatch} onOpenChange={(v) => { if (!v) setAddToBatch(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              Adicionar Cartelas ao Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addToBatch && (
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <span className="font-bold">{addToBatch.vendorName ?? "Sem vendedor"}</span>
                <span className="text-muted-foreground font-mono text-xs ml-2">Código: {addToBatch.accessCode}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{addToBatch.cardNumbers.length} cartelas atuais</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={addMode === "range" ? "default" : "secondary"}
                onClick={() => setAddMode("range")}
                className="flex-1"
              >Intervalo</Button>
              <Button
                size="sm"
                variant={addMode === "manual" ? "default" : "secondary"}
                onClick={() => setAddMode("manual")}
                className="flex-1"
              >Manual</Button>
            </div>
            {addMode === "range" ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">De</Label>
                  <Input placeholder="1" value={addFrom} onChange={(e) => setAddFrom(e.target.value)} type="number" min="1" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Até</Label>
                  <Input placeholder="50" value={addTo} onChange={(e) => setAddTo(e.target.value)} type="number" min="1" />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">Números (separados por vírgula ou espaço)</Label>
                <Input placeholder="101, 102, 103" value={addManual} onChange={(e) => setAddManual(e.target.value)} />
              </div>
            )}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-xs text-emerald-700 dark:text-emerald-300">
              O código de acesso <strong>{addToBatch?.accessCode}</strong> permanece o mesmo. O vendedor não precisa de um novo código.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setAddToBatch(null)}>Cancelar</Button>
            <Button onClick={() => void handleAddCards()} disabled={adding} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {adding ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
