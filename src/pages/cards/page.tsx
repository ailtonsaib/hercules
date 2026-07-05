import { useState, useRef } from "react";
import { useQuery, useMutation, usePaginatedQuery, useConvex } from "convex/react";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Layers, Zap, Trash2, FileDown, Eye, Search, UserPlus, CheckCircle2, XCircle, Download, UserX, Package, CreditCard, TrendingUp, Lock, ScrollText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { PrintableCard } from "./_components/PrintableCard.tsx";
import { BatchExportDialog } from "./_components/BatchExportDialog.tsx";
import { RegulationEditorDialog } from "./_components/RegulationEditorDialog.tsx";
import { generateCardsPDF } from "./_lib/generate-pdf.ts";
import { extractGrid, SORTE_LETTERS } from "./_lib/bingo-utils.ts";
import type { CardData, EventData } from "./_lib/bingo-utils.ts";

type CardDoc = Doc<"cards">;
type FilterType = "all" | "assigned" | "unassigned" | "paid" | "unpaid";

// Mini preview card for the grid view
function MiniCard({ card, onClick }: { card: CardDoc; onClick: () => void }) {
  const grid1 = extractGrid(card.numbers, 0);
  const statusColor = card.paid
    ? "border-green-400"
    : card.buyerName
    ? "border-yellow-400"
    : "border-border";

  return (
    <button
      onClick={onClick}
      className={`bg-white border-2 ${statusColor} rounded-lg p-2 w-full hover:border-primary hover:shadow-md transition-all cursor-pointer text-left`}
    >
      <div className="text-center font-black text-[10px] text-muted-foreground mb-1">
        #{String(card.cardNumber).padStart(6, "0")}
      </div>
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr>
            {SORTE_LETTERS.map((l) => (
              <th key={l} className="bg-black text-white text-center font-black py-0.5 border border-black">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: 5 }, (_, col) => (
                <td key={col} className="border border-black text-center font-bold py-0.5 text-[8px]">
                  {grid1[col][row].toString().padStart(2, "0")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {card.buyerName ? (
        <div className="text-[7px] mt-1 truncate font-semibold text-center">
          {card.paid
            ? <span className="text-green-600">✓ {card.buyerName}</span>
            : <span className="text-yellow-600">⏳ {card.buyerName}</span>
          }
        </div>
      ) : (
        <div className="text-[7px] text-muted-foreground text-center mt-1">1ª chance</div>
      )}
    </button>
  );
}

// Assign buyer dialog
function AssignBuyerDialog({
  card,
  onClose,
}: {
  card: CardDoc;
  onClose: () => void;
}) {
  const assignBuyer = useMutation(api.cards.assignBuyer);
  const clearBuyer = useMutation(api.cards.clearBuyer);
  const [name, setName] = useState(card.buyerName ?? "");
  // Split stored phone into DDD + number parts for editing
  const parsePhone = (p: string) => {
    const digits = p.replace(/\D/g, "");
    if (digits.length >= 2) return { ddd: digits.slice(0, 2), num: digits.slice(2) };
    return { ddd: "62", num: "" };
  };
  const parsed = parsePhone(card.buyerPhone ?? "");
  const [ddd, setDdd] = useState(parsed.ddd);
  const [phoneNum, setPhoneNum] = useState(parsed.num);
  const [paid, setPaid] = useState(card.paid ?? false);
  const [saving, setSaving] = useState(false);

  // Format number as (DDD) XXXXX-XXXX
  const fullPhone = `(${ddd}) ${phoneNum}`;

  const handleSave = async () => {
    // Allow saving without name only to change payment status on already-paid cards
    if (!name.trim() && !card.paid) { toast.error("Informe o nome do comprador"); return; }
    if (name.trim() && !phoneNum.trim()) { toast.error("Informe o telefone do comprador"); return; }
    setSaving(true);
    const buyerPhone = phoneNum.trim() ? fullPhone : undefined;
    try {
      await assignBuyer({ cardId: card._id, buyerName: name.trim() || card.buyerName || "—", buyerPhone, paid });
      toast.success("Comprador salvo!");
      onClose();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await clearBuyer({ cardId: card._id });
      toast.success("Comprador removido");
      onClose();
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Cartela #{String(card.cardNumber).padStart(6, "0")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome do Comprador *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Maria Silva"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone *</Label>
            <div className="flex gap-2">
              <div className="flex items-center border rounded-md px-2 gap-1 bg-background">
                <span className="text-muted-foreground text-sm">(</span>
                <input
                  className="w-10 text-sm font-medium bg-transparent outline-none text-center"
                  value={ddd}
                  maxLength={2}
                  inputMode="numeric"
                  onChange={(e) => setDdd(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="62"
                />
                <span className="text-muted-foreground text-sm">)</span>
              </div>
              <Input
                className="flex-1"
                value={phoneNum}
                onChange={(e) => setPhoneNum(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="99999-9999"
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPaid(!paid)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-semibold text-sm transition-all cursor-pointer ${
                paid ? "border-green-500 bg-green-50 text-green-700" : "border-border text-muted-foreground"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {paid ? "Pago ✓ — clique para desmarcar" : "Marcar como pago"}
            </button>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {card.buyerName && (
            <Button variant="destructive" size="sm" onClick={handleClear} disabled={saving} className="gap-1 mr-auto">
              <UserX className="w-4 h-4" />
              Remover
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Batch Register Dialog
function BatchRegisterDialog({
  eventId,
  cardCount,
  onClose,
  markBatchPaid,
}: {
  eventId: Id<"events">;
  cardCount: number;
  onClose: () => void;
  markBatchPaid: (args: { eventId: Id<"events">; cardNumbers: number[]; paid: boolean }) => Promise<number>;
}) {
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState(String(cardCount || ""));
  const [inputMode, setInputMode] = useState<"range" | "manual">("range");
  const [manualInput, setManualInput] = useState("");
  const [saving, setSaving] = useState(false);

  const parseManual = (text: string): number[] => {
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    const nums = parts.map((p) => parseInt(p)).filter((n) => !isNaN(n) && n >= 1);
    return [...new Set(nums)];
  };

  const getCardNumbers = (): number[] => {
    if (inputMode === "range") {
      const from = parseInt(rangeFrom);
      const to = parseInt(rangeTo);
      if (isNaN(from) || isNaN(to) || from > to) return [];
      return Array.from({ length: to - from + 1 }, (_, i) => from + i);
    }
    return parseManual(manualInput);
  };

  const cardNumbers = getCardNumbers();

  const handleSave = async () => {
    if (cardNumbers.length === 0) { toast.error("Nenhuma cartela selecionada"); return; }
    setSaving(true);
    try {
      const count = await markBatchPaid({ eventId, cardNumbers, paid: true });
      toast.success(`${count} cartela(s) registradas como pagas!`);
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message?: string };
        toast.error(d.message ?? "Erro ao registrar");
      } else {
        toast.error("Erro ao registrar cartelas");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Registro em Lote
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Marca cartelas como <strong>pagas</strong> sem necessidade de informar comprador ou telefone.
          </p>

          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("range")}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer ${
                inputMode === "range" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              Por intervalo
            </button>
            <button
              type="button"
              onClick={() => setInputMode("manual")}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer ${
                inputMode === "manual" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              Manual (números)
            </button>
          </div>

          {inputMode === "range" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cartela inicial</Label>
                <Input type="number" min={1} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cartela final</Label>
                <Input type="number" min={1} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Números das cartelas</Label>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={"Digite os números separados por vírgula, espaço ou enter:\nEx: 1, 5, 10, 15, 20"}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
            </div>
          )}

          {cardNumbers.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {cardNumbers.length} cartela(s) serão marcadas como pagas
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || cardNumbers.length === 0}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? "Registrando..." : `Registrar ${cardNumbers.length > 0 ? cardNumbers.length : ""} Cartela(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Batch Cancel Dialog
function BatchCancelDialog({
  eventId,
  cardCount,
  onClose,
}: {
  eventId: Id<"events">;
  cardCount: number;
  onClose: () => void;
}) {
  const cancelBatchSales = useMutation(api.cards.cancelBatchSales);
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState(String(cardCount || ""));
  const [inputMode, setInputMode] = useState<"range" | "manual">("range");
  const [manualInput, setManualInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const parseManual = (text: string): number[] => {
    const parts = text.split(/[\s,;]+/).filter(Boolean);
    const nums = parts.map((p) => parseInt(p)).filter((n) => !isNaN(n) && n >= 1);
    return [...new Set(nums)];
  };

  const getCardNumbers = (): number[] => {
    if (inputMode === "range") {
      const from = parseInt(rangeFrom);
      const to = parseInt(rangeTo);
      if (isNaN(from) || isNaN(to) || from > to) return [];
      return Array.from({ length: to - from + 1 }, (_, i) => from + i);
    }
    return parseManual(manualInput);
  };

  const cardNumbers = getCardNumbers();

  const handleCancel = async () => {
    if (cardNumbers.length === 0) { toast.error("Nenhuma cartela selecionada"); return; }
    setSaving(true);
    try {
      const count = await cancelBatchSales({ eventId, cardNumbers });
      toast.success(`${count} venda(s) cancelada(s) com sucesso!`);
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message?: string };
        toast.error(d.message ?? "Erro ao cancelar");
      } else {
        toast.error("Erro ao cancelar vendas");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Cancelar Vendas em Lote
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Remove o comprador e desmarca o pagamento das cartelas selecionadas. Esta ação <strong>não pode ser desfeita</strong>.
          </p>

          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("range")}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer ${
                inputMode === "range" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              Por intervalo
            </button>
            <button
              type="button"
              onClick={() => setInputMode("manual")}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer ${
                inputMode === "manual" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              Manual (números)
            </button>
          </div>

          {inputMode === "range" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cartela inicial</Label>
                <Input type="number" min={1} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cartela final</Label>
                <Input type="number" min={1} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Números das cartelas</Label>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={"Digite os números separados por vírgula, espaço ou enter:\nEx: 1, 5, 10, 15, 20"}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
            </div>
          )}

          {cardNumbers.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-300 rounded-lg">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {cardNumbers.length} cartela(s) terão a venda cancelada
              </p>
            </div>
          )}

          {/* Confirmation checkbox */}
          {cardNumbers.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmed((v) => !v)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer text-left ${
                confirmed ? "border-destructive bg-destructive/5 text-destructive" : "border-border text-muted-foreground"
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${confirmed ? "border-destructive bg-destructive" : "border-muted-foreground"}`}>
                {confirmed && <span className="text-white text-xs font-black">✓</span>}
              </div>
              Confirmo que desejo cancelar estas vendas
            </button>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => void handleCancel()}
            disabled={saving || cardNumbers.length === 0 || !confirmed}
            className="gap-2"
          >
            <XCircle className="w-4 h-4" />
            {saving ? "Cancelando..." : `Cancelar ${cardNumbers.length > 0 ? cardNumbers.length : ""} Venda(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CardsPage() {
  const convex = useConvex();
  const moduleStatus = useQuery(api.appSettings.getUserModuleStatus);
  const hasVendorApp = moduleStatus?.vendorApp.enabled ?? false;
  const events = useQuery(api.events.list, {});
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const eventId = selectedEvent as Id<"events">;
  const [filter, setFilter] = useState<FilterType>("all");
  const [showBatchRegister, setShowBatchRegister] = useState(false);
  const [showBatchCancel, setShowBatchCancel] = useState(false);

  const cardCount = useQuery(api.cards.getCount, selectedEvent ? { eventId } : "skip");
  const event = useQuery(api.events.get, selectedEvent ? { eventId } : "skip");
  const cardTemplate = useQuery(
    api.cardTemplates.getByTipo,
    event?.chanceTipo ? { chanceTipo: event.chanceTipo as "unica" | "dupla" | "tripla" } : "skip"
  );
  const summary = useQuery(api.cards.getSalesSummary, selectedEvent ? { eventId } : "skip");
  const userUsage = useQuery(api.cards.getTotalCountByUser, {});
  const generate = useMutation(api.cards.generate);
  const deleteAll = useMutation(api.cards.deleteAll);
  const deleteAllBatches = useMutation(api.vendorBatches.deleteAllBatches);
  const setPaid = useMutation(api.cards.setPaid);
  const markBatchPaid = useMutation(api.cards.markBatchPaid);

  const { results: pagedCards, status, loadMore } = usePaginatedQuery(
    api.cards.listPaginated,
    selectedEvent && filter === "all" ? { eventId } : "skip",
    { initialNumItems: 20 }
  );

  const filteredCards = useQuery(
    api.cards.listFiltered,
    selectedEvent && filter !== "all" ? { eventId, filter } : "skip"
  );

  const cards = filter === "all" ? pagedCards : filteredCards;

  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [showRegulationEditor, setShowRegulationEditor] = useState(false);
  const [showVendorBatch, setShowVendorBatch] = useState(false);
  const [vendorBatchFrom, setVendorBatchFrom] = useState("1");
  const [vendorBatchTo, setVendorBatchTo] = useState("");
  const [vendorBatchName, setVendorBatchName] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState<string>("none");
  const vendors = useQuery(api.vendors.list, {});
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const createVendorBatch = useMutation(api.vendorBatches.create);
  const existingBatches = useQuery(api.vendorBatches.listByEvent, selectedEvent ? { eventId } : "skip");
  const [previewCard, setPreviewCard] = useState<CardDoc | null>(null);
  const [assignCard, setAssignCard] = useState<CardDoc | null>(null);
  const [searchNum, setSearchNum] = useState("");
  const [buyerSearch, setBuyerSearch] = useState("");
  const [debouncedBuyerSearch] = useDebounce(buyerSearch, 350);

  const searchedCard = useQuery(
    api.cards.getByNumber,
    selectedEvent && searchNum && !isNaN(parseInt(searchNum))
      ? { eventId, cardNumber: parseInt(searchNum) }
      : "skip"
  );

  const buyerResults = useQuery(
    api.cards.searchByBuyer,
    selectedEvent && debouncedBuyerSearch.trim()
      ? { eventId, query: debouncedBuyerSearch.trim() }
      : "skip"
  );

  const [showGenerateBatch, setShowGenerateBatch] = useState(false);

  const handleGenerate = async (limit?: number) => {
    if (!selectedEvent) return;
    setGenerating(true);
    try {
      if (limit) {
        // Generate exactly `limit` cards in one call
        const result = await generate({ eventId, limit });
        toast.success(`${result.generated} cartela(s) geradas! (${result.total} de ${event?.totalCards}${result.remaining > 0 ? `, faltam ${result.remaining}` : " — concluído"})`);
      } else {
        // Generate all remaining
        let remaining = 1;
        while (remaining > 0) {
          const result = await generate({ eventId });
          remaining = result.remaining;
          if (remaining > 0) toast.info(`Gerando... ${result.total} de ${event?.totalCards}`);
        }
        toast.success("Todas as cartelas foram geradas!");
      }
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Erro ao gerar cartelas");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!selectedEvent) return;
    setDeleting(true);
    try {
      // Delete all vendor batches first
      await deleteAllBatches({ eventId });
      // Then delete cards in batches of 500
      let count = 1;
      while (count > 0) {
        const result = await deleteAll({ eventId });
        count = result.deleted;
      }
      toast.success("Cartelas e lotes de vendedores removidos");
    } catch {
      toast.error("Erro ao remover cartelas");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportPDF = async (cardsToExport: CardData[]) => {
    if (!event) return;
    setExporting(true);
    try {
      await generateCardsPDF(cardsToExport, event as EventData, undefined, null, null, null, cardTemplate ? { ...cardTemplate, prizeNumberLayoutsJson: cardTemplate.prizeNumberLayouts } : null);
      toast.success(`PDF gerado com ${cardsToExport.length} cartela(s)!`);
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!event || !selectedEvent) return;
    setExportingCSV(true);
    try {
      const allCards = await convex.query(api.cards.listForExport, { eventId });
      const rows = [
        ["Número", "Comprador", "Telefone", "Pago"],
        ...allCards.map((c) => [
          String(c.cardNumber).padStart(6, "0"),
          c.buyerName ?? "",
          c.buyerPhone ?? "",
          c.paid ? "Sim" : c.buyerName ? "Não" : "",
        ]),
      ];
      const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(";")).join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendas-${event.name.replace(/\s+/g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado!");
    } catch {
      toast.error("Erro ao exportar CSV");
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportVendorBatch = async () => {
    if (!event || !selectedEvent) return;
    if (!selectedVendorId || selectedVendorId === "none") {
      toast.error("Selecione um vendedor cadastrado");
      return;
    }
    const from = parseInt(vendorBatchFrom);
    const to = parseInt(vendorBatchTo) || (cardCount ?? 0);
    if (isNaN(from) || isNaN(to) || from < 1 || to < from) {
      toast.error("Informe um intervalo válido de cartelas");
      return;
    }
    const cardNumbers = Array.from({ length: to - from + 1 }, (_, i) => from + i);
    try {
      const vendorId = selectedVendorId as Id<"vendors">;
      const vendorName = vendors?.find((v) => v._id === vendorId)?.name;
      const code = await createVendorBatch({
        eventId,
        vendorId,
        vendorName,
        cardNumbers,
      });
      setGeneratedCode(code);
      toast.success(`Lote criado! Código: ${code}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar lote";
      toast.error(msg);
    }
  };

  const canGenerate = event && cardCount !== undefined && cardCount < event.totalCards;
  const hasCards = cardCount !== undefined && cardCount > 0;

  const FILTERS: { value: FilterType; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "unassigned", label: "Sem comprador" },
    { value: "assigned", label: "Com comprador" },
    { value: "paid", label: "Pagas" },
    { value: "unpaid", label: "Não pagas" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-foreground">Cartelas</h2>
        <p className="text-muted-foreground font-medium mt-1">Gere, venda e imprima as cartelas do evento</p>
      </div>

      {/* User usage panel */}
      {userUsage && (
        <div className="mb-6 p-4 bg-card border rounded-xl">
          <div className="flex flex-wrap items-center gap-4">
            {/* Plan badge */}
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plano</span>
              <Badge className={`font-bold text-xs px-2 ${
                userUsage.plan === "mega" ? "bg-rose-600 text-white" :
                userUsage.plan === "enterprise" ? "bg-orange-600 text-white" :
                userUsage.plan === "ultra" ? "bg-pink-600 text-white" :
                userUsage.plan === "max" ? "bg-purple-600 text-white" :
                userUsage.plan === "pro" ? "bg-blue-600 text-white" :
                userUsage.plan === "basic" ? "bg-emerald-600 text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {userUsage.plan === "mega" ? "MEGA" :
                 userUsage.plan === "enterprise" ? "ENTERPRISE" :
                 userUsage.plan === "ultra" ? "ULTRA" :
                 userUsage.plan === "max" ? "MAX" :
                 userUsage.plan === "pro" ? "PRO" :
                 userUsage.plan === "basic" ? "BASIC" : "FREE"}
              </Badge>
            </div>

            <div className="flex-1 min-w-48">
              {/* Progress bar */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Cartelas geradas</span>
                </div>
                <span className="text-xs font-bold text-foreground">
                  {userUsage.generated.toLocaleString("pt-BR")} / {userUsage.limit.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                {(() => {
                  const pct = Math.min((userUsage.generated / userUsage.limit) * 100, 100);
                  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-emerald-500";
                  return <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />;
                })()}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-lg font-black text-foreground">{userUsage.generated.toLocaleString("pt-BR")}</div>
                <div className="text-xs text-muted-foreground font-medium">Geradas</div>
              </div>
              <div>
                <div className={`text-lg font-black ${userUsage.limit - userUsage.generated <= 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {Math.max(userUsage.limit - userUsage.generated, 0).toLocaleString("pt-BR")}
                </div>
                <div className="text-xs text-muted-foreground font-medium">Disponíveis</div>
              </div>
              <div>
                <div className="text-lg font-black text-primary">{userUsage.limit.toLocaleString("pt-BR")}</div>
                <div className="text-xs text-muted-foreground font-medium">Limite</div>
              </div>
            </div>

            {/* Lock icon if at limit */}
            {userUsage.generated >= userUsage.limit && (
              <div className="flex items-center gap-1.5 text-red-500 font-semibold text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
                <Lock className="w-3.5 h-3.5" />
                Limite atingido — solicite upgrade
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event selector + actions */}
      <div className="flex flex-wrap items-end gap-4 mb-4 p-4 bg-card rounded-xl border">
        <div className="flex-1 min-w-48 space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Selecionar Evento</label>
          <Select value={selectedEvent} onValueChange={(v) => { setSelectedEvent(v); setFilter("all"); }}>
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
        {selectedEvent && (
          <>
            <Badge variant="secondary" className="font-bold text-sm px-3 py-1.5">
              {cardCount ?? "..."} / {event?.totalCards ?? "..."} cartelas
            </Badge>
            <div className="flex items-center">
              <Button
                onClick={() => handleGenerate()}
                disabled={generating || !canGenerate}
                className="gap-2 rounded-r-none border-r border-primary-foreground/20"
              >
                <Zap className="w-4 h-4" />
                {generating ? "Gerando..." : "Gerar Todas"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={generating || !canGenerate}
                    className="rounded-l-none px-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground font-semibold">
                    Gerar em lote de...
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {[100, 200, 500].map((n) => (
                    <DropdownMenuItem
                      key={n}
                      onClick={() => handleGenerate(n)}
                      className="gap-2 cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      {n} cartelas
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleGenerate()} className="gap-2 cursor-pointer">
                    <Zap className="w-4 h-4" />
                    Gerar todas ({(event?.totalCards ?? 0) - (cardCount ?? 0)} restantes)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {hasCards && (
              <>
                <Button variant="secondary" onClick={() => setShowBatchExport(true)} className="gap-2">
                  <FileDown className="w-4 h-4" />
                  PDF em Lote
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="gap-2">
                      Mais ações
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => handleExportPDF(cards as CardData[])} disabled={exporting || !cards?.length} className="gap-2 cursor-pointer">
                      <FileDown className="w-4 h-4" />
                      PDF (página atual)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowRegulationEditor(true)} className="gap-2 cursor-pointer">
                      <ScrollText className="w-4 h-4" />
                      Regulamento
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {hasVendorApp ? (
                      <DropdownMenuItem onClick={() => { setVendorBatchTo(String(cardCount ?? "")); setShowVendorBatch(true); }} className="gap-2 cursor-pointer">
                        <Package className="w-4 h-4" />
                        Gerar Lote Vendedor
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled className="gap-2 opacity-50 cursor-not-allowed">
                        <Package className="w-4 h-4" />
                        Gerar Lote Vendedor
                        <span className="ml-auto text-[10px] text-muted-foreground font-semibold">BASIC+</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowBatchRegister(true)} className="gap-2 cursor-pointer">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Registro em Lote
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowBatchCancel(true)} className="gap-2 cursor-pointer">
                      <XCircle className="w-4 h-4 text-destructive" />
                      Cancelar Vendas em Lote
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportCSV} disabled={exportingCSV} className="gap-2 cursor-pointer">
                      <Download className="w-4 h-4" />
                      {exportingCSV ? "Exportando..." : "Exportar CSV"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (summary && summary.assigned > 0) {
                          toast.error(`Não é possível apagar: ${summary.assigned} cartela(s) já foram vendidas.`);
                          return;
                        }
                        setShowDeleteConfirm(true);
                      }}
                      disabled={deleting}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? "Removendo..." : "Apagar Todas"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </>
        )}
      </div>

      {/* Sales summary */}
      {selectedEvent && summary && summary.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Vendidas", value: summary.assigned, color: "text-blue-600" },
            { label: "Disponíveis", value: summary.unassigned, color: "text-muted-foreground" },
            { label: "Pagas", value: summary.paid, color: "text-green-600" },
            { label: "A receber", value: summary.unpaid, color: "text-yellow-600" },
          ].map((s) => (
            <div key={s.label} className="bg-card border rounded-xl p-3 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      {selectedEvent && hasCards && (
        <div className="space-y-3 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Buscar por número..."
                value={searchNum}
                onChange={(e) => { setSearchNum(e.target.value); setBuyerSearch(""); }}
                className="pl-9"
              />
            </div>
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por comprador..."
                value={buyerSearch}
                onChange={(e) => { setBuyerSearch(e.target.value); setSearchNum(""); }}
                className="pl-9"
              />
            </div>
            {searchedCard !== undefined && searchNum && (
              <div className="flex gap-2">
                {searchedCard ? (
                  <>
                    <Button variant="secondary" size="sm" className="gap-1" onClick={() => setPreviewCard(searchedCard)}>
                      <Eye className="w-4 h-4" />Visualizar
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => setAssignCard(searchedCard)}>
                      <UserPlus className="w-4 h-4" />
                      {searchedCard.buyerName ? "Editar comprador" : "Atribuir comprador"}
                    </Button>
                    <Button variant="secondary" size="sm" className="gap-1" onClick={() => handleExportPDF([searchedCard as CardData])}>
                      <FileDown className="w-4 h-4" />Imprimir
                    </Button>
                  </>
                ) : (
                  <span className="self-center text-sm text-destructive font-semibold">Não encontrada</span>
                )}
              </div>
            )}
            {/* Filter tabs */}
            <div className="flex gap-1 ml-auto flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    filter === f.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Buyer search results */}
          {buyerSearch && (
            <div className="bg-card border rounded-xl p-3">
              {buyerResults === undefined ? (
                <p className="text-sm text-muted-foreground">Buscando...</p>
              ) : buyerResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum comprador encontrado para &quot;{buyerSearch}&quot;</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{buyerResults.length} resultado(s) para &quot;{buyerSearch}&quot;</p>
                  {buyerResults.map((c) => (
                    <div key={c._id} className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.paid ? "bg-green-500" : "bg-yellow-500"}`} />
                        <span className="font-semibold text-sm truncate">{c.buyerName}</span>
                        {c.buyerPhone && <span className="text-xs text-muted-foreground">{c.buyerPhone}</span>}
                        <Badge variant="secondary" className="text-xs">#{String(c.cardNumber).padStart(6, "0")}</Badge>
                        {c.paid
                          ? <Badge className="text-xs bg-green-600 text-white">Pago</Badge>
                          : <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">A pagar</Badge>
                        }
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => setPreviewCard(c)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => setAssignCard(c)}>
                          <UserPlus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!selectedEvent ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Layers /></EmptyMedia>
            <EmptyTitle>Selecione um evento</EmptyTitle>
            <EmptyDescription>Escolha um evento para visualizar ou gerar cartelas</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : cards === undefined ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : cards.length === 0 && filter === "all" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Layers /></EmptyMedia>
            <EmptyTitle>Nenhuma cartela gerada</EmptyTitle>
            <EmptyDescription>Clique em &quot;Gerar Cartelas&quot; para criar as cartelas deste evento</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => handleGenerate()} disabled={generating}>
              <Zap className="w-4 h-4 mr-1" />
              {generating ? "Gerando..." : "Gerar Todas"}
            </Button>
          </EmptyContent>
        </Empty>
      ) : cards.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><XCircle /></EmptyMedia>
            <EmptyTitle>Nenhuma cartela encontrada</EmptyTitle>
            <EmptyDescription>Nenhuma cartela corresponde ao filtro selecionado</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {cards.map((card) => (
              <div key={card._id} className="relative group">
                <MiniCard card={card} onClick={() => setPreviewCard(card)} />
                {/* Quick actions overlay */}
                <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewCard(card); }}
                    className="p-1.5 bg-white rounded-md text-black hover:bg-gray-100 cursor-pointer"
                    title="Visualizar"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAssignCard(card); }}
                    className="p-1.5 bg-white rounded-md text-black hover:bg-gray-100 cursor-pointer"
                    title="Atribuir comprador"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                  {card.buyerName && (
                    <button
                      onClick={(e) => { e.stopPropagation(); void setPaid({ cardId: card._id, paid: !card.paid }); }}
                      className={`p-1.5 rounded-md cursor-pointer ${card.paid ? "bg-green-500 text-white" : "bg-white text-black hover:bg-gray-100"}`}
                      title={card.paid ? "Marcar não pago" : "Marcar pago"}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {status === "CanLoadMore" && filter === "all" && (
            <div className="mt-6 text-center">
              <Button variant="secondary" onClick={() => loadMore(20)}>Carregar mais</Button>
            </div>
          )}
        </>
      )}

      {/* Card preview dialog */}
      <Dialog open={!!previewCard} onOpenChange={(v) => !v && setPreviewCard(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cartela #{previewCard ? String(previewCard.cardNumber).padStart(6, "0") : ""}
              {previewCard?.buyerName && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {previewCard.buyerName} {previewCard.paid ? "✓ Pago" : "⏳ A pagar"}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewCard && event && (
            <div className="overflow-x-auto">
              <PrintableCard card={previewCard as CardData} event={event as EventData} />
            </div>
          )}
          {previewCard && event && (
            <div className="flex justify-between gap-3 pt-2">
              <Button variant="secondary" className="gap-2" onClick={() => { setPreviewCard(null); setAssignCard(previewCard); }}>
                <UserPlus className="w-4 h-4" />
                {previewCard.buyerName ? "Editar comprador" : "Atribuir comprador"}
              </Button>
              <Button onClick={() => handleExportPDF([previewCard as CardData])} className="gap-2">
                <FileDown className="w-4 h-4" />
                Baixar PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign buyer dialog */}
      {assignCard && (
        <AssignBuyerDialog
          card={assignCard}
          onClose={() => setAssignCard(null)}
        />
      )}

      {/* Batch PDF export dialog */}
      {showBatchExport && event && (
        <BatchExportDialog
          eventId={eventId}
          event={event as EventData}
          totalCards={event.totalCards}
          onClose={() => setShowBatchExport(false)}
        />
      )}

      {/* Regulation editor dialog */}
      {showRegulationEditor && eventId && (
        <RegulationEditorDialog
          eventId={eventId}
          onClose={() => setShowRegulationEditor(false)}
        />
      )}

      {/* Vendor batch export dialog */}
      <Dialog open={showVendorBatch} onOpenChange={(v) => { if (!v) { setShowVendorBatch(false); setGeneratedCode(null); setVendorBatchName(""); setVendorBatchFrom("1"); setVendorBatchTo(""); setSelectedVendorId("none"); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Gerar Lote para Vendedor
            </DialogTitle>
          </DialogHeader>
          {/* Event banner */}
          {event && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg px-3 py-2 flex items-center gap-2 -mt-1">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Evento:</span>
              <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate">{event.name}</span>
            </div>
          )}
          {generatedCode ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Lote criado! Passe este código para o vendedor acessar no app:
              </p>
              {event && (
                <div className="bg-muted rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
                  Evento: <span className="font-semibold text-foreground">{event.name}</span>
                </div>
              )}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 rounded-2xl py-6 px-4">
                <p className="text-5xl font-black tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
                  {generatedCode}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                O vendedor acessa <strong>bingopremier.onhercules.app/vendedor</strong> e digita este código
              </p>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setShowVendorBatch(false); setGeneratedCode(null); setVendorBatchName(""); setVendorBatchFrom("1"); setVendorBatchTo(""); setSelectedVendorId("none"); }}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Define o intervalo de cartelas e um código de 6 dígitos será gerado automaticamente para o vendedor.
                </p>
                {/* Show existing batches */}
                {existingBatches && existingBatches.length > 0 && (
                  <div className="bg-muted rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lotes já gerados</p>
                    {existingBatches.map((b) => {
                      const nums = b.cardNumbers;
                      const min = Math.min(...nums);
                      const max = Math.max(...nums);
                      return (
                        <div key={b._id} className="flex items-center justify-between text-xs">
                          <span className="text-foreground font-medium">{b.vendorName ?? "Sem nome"}</span>
                          <span className="text-muted-foreground font-mono">#{min} – #{max} ({nums.length} cartelas)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Vendedor *</Label>
                  {vendors && vendors.length > 0 ? (
                    <>
                      <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um vendedor cadastrado..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v._id} value={v._id}>
                              {v.name}{v.phone ? ` — ${v.phone}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedVendorId === "none" && (
                        <p className="text-xs text-destructive font-medium">Selecione um vendedor para gerar o lote.</p>
                      )}
                    </>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 rounded-lg px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
                      Nenhum vendedor cadastrado. Cadastre um vendedor antes de gerar um lote.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Cartela inicial</Label>
                    <Input type="number" min={1} value={vendorBatchFrom} onChange={(e) => setVendorBatchFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cartela final</Label>
                    <Input type="number" min={1} value={vendorBatchTo} onChange={(e) => setVendorBatchTo(e.target.value)} />
                  </div>
                </div>
                {(() => {
                  const from = parseInt(vendorBatchFrom);
                  const to = parseInt(vendorBatchTo);
                  if (!vendorBatchFrom || !vendorBatchTo || isNaN(from) || isNaN(to) || to < from) return null;
                  const requested = new Set(Array.from({ length: to - from + 1 }, (_, i) => from + i));
                  const assigned = new Set((existingBatches ?? []).flatMap((b) => b.cardNumbers));
                  const conflicts = [...requested].filter((n) => assigned.has(n));
                  return (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {to - from + 1} cartelas no lote
                      </p>
                      {conflicts.length > 0 && (
                        <p className="text-xs text-destructive font-semibold">
                          ⚠ {conflicts.length} cartela(s) já em outro lote: {conflicts.slice(0, 5).join(", ")}{conflicts.length > 5 ? "..." : ""}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="secondary" onClick={() => setShowVendorBatch(false)}>Cancelar</Button>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!vendors || vendors.length === 0 || selectedVendorId === "none"} onClick={() => void handleExportVendorBatch()}>
                  <Download className="w-4 h-4" />
                  Gerar Código
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(v) => !v && setShowDeleteConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Apagar Todas as Cartelas
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja apagar <strong>todas as cartelas</strong> deste evento?
            Esta ação não pode ser desfeita. Você poderá gerá-las novamente após apagar.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => { setShowDeleteConfirm(false); void handleDeleteAll(); }}
            >
              {deleting ? "Removendo..." : "Apagar Todas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Register Dialog */}
      {showBatchRegister && selectedEvent && (
        <BatchRegisterDialog
          eventId={eventId}
          cardCount={cardCount ?? 0}
          onClose={() => setShowBatchRegister(false)}
          markBatchPaid={markBatchPaid}
        />
      )}

      {showBatchCancel && selectedEvent && (
        <BatchCancelDialog
          eventId={eventId}
          cardCount={cardCount ?? 0}
          onClose={() => setShowBatchCancel(false)}
        />
      )}
    </div>
  );
}
