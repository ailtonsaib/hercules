import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { CheckSquare, ShieldCheck, User, Eye, EyeOff, Search, X, UserPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";

type CardDoc = Pick<Doc<"cards">, "_id" | "cardNumber" | "buyerName" | "buyerPhone" | "paid" | "validated">;

// Fixed DDD prefix always shown in the phone input
const PHONE_PREFIX = "(62) ";

// Mask for the local digits after the DDD (8 or 9 digits)
function applyLocalMask(local: string): string {
  const d = local.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// Build full masked value, always starting with "(62) "
function buildPhoneValue(rawInput: string): string {
  const allDigits = rawInput.replace(/\D/g, "");
  // Strip the fixed DDD if the user typed it
  const local = allDigits.startsWith("62") ? allDigits.slice(2) : allDigits;
  return PHONE_PREFIX + applyLocalMask(local);
}

// Reconstruct masked value from a stored raw phone string
function phoneMaskFromStored(stored: string): string {
  const digits = stored.replace(/\D/g, "");
  // stored always includes DDD
  const local = digits.startsWith("62") ? digits.slice(2) : digits;
  return PHONE_PREFIX + applyLocalMask(local);
}

// Dialog to assign buyer and optionally validate a card directly from the validate page
function SellAndValidateDialog({
  card,
  onClose,
}: {
  card: CardDoc;
  onClose: () => void;
}) {
  const assignBuyer = useMutation(api.cards.assignBuyer);
  const clearBuyer = useMutation(api.cards.clearBuyer);
  const setValidated = useMutation(api.cards.setValidated);

  const [name, setName] = useState(card.buyerName ?? "");
  const [phone, setPhone] = useState(
    card.buyerPhone ? phoneMaskFromStored(card.buyerPhone) : PHONE_PREFIX
  );
  const [paid, setPaid] = useState(card.paid ?? false);
  const [validate, setValidate] = useState(card.validated ?? false);
  const [saving, setSaving] = useState(false);
  const phoneRef = React.useRef<HTMLInputElement>(null);

  // Keep cursor after the fixed prefix if user clicks into the prefix area
  const handlePhoneFocus = () => {
    const el = phoneRef.current;
    if (!el) return;
    if ((el.selectionStart ?? 0) < PHONE_PREFIX.length) {
      el.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Prevent deleting the fixed prefix
    if (!raw.startsWith(PHONE_PREFIX)) {
      setPhone(PHONE_PREFIX);
      return;
    }
    const newVal = buildPhoneValue(raw);
    setPhone(newVal);
    // Restore cursor to end of typed content
    requestAnimationFrame(() => {
      const el = phoneRef.current;
      if (el) el.setSelectionRange(newVal.length, newVal.length);
    });
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = phoneRef.current;
    if (!el) return;
    // Block backspace/delete from eating into the fixed prefix
    const pos = el.selectionStart ?? 0;
    if ((e.key === "Backspace" || e.key === "Delete") && pos <= PHONE_PREFIX.length) {
      e.preventDefault();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do comprador");
      return;
    }
    if (validate && !paid) {
      toast.error("Para validar é necessário marcar como paga primeiro");
      return;
    }
    setSaving(true);
    try {
      const rawPhone = phone.replace(/\D/g, "");
      await assignBuyer({
        cardId: card._id,
        buyerName: name.trim(),
        buyerPhone: rawPhone || undefined,
        paid,
      });
      if (validate) {
        await setValidated({ cardId: card._id, validated: true });
      } else if (card.validated && !validate) {
        await setValidated({ cardId: card._id, validated: false });
      }
      toast.success(validate ? "Cartela vendida e validada!" : "Comprador salvo!");
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
      if (card.validated) {
        await setValidated({ cardId: card._id, validated: false });
      }
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
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Cartela #{String(card.cardNumber).padStart(6, "0")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
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
            <Label>Telefone</Label>
            <Input
              ref={phoneRef}
              value={phone}
              onChange={handlePhoneChange}
              onKeyDown={handlePhoneKeyDown}
              onFocus={handlePhoneFocus}
              onClick={handlePhoneFocus}
              inputMode="numeric"
            />
          </div>

          {/* Paid toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !paid;
              setPaid(next);
              if (!next) setValidate(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all cursor-pointer ${
              paid
                ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {paid ? "Marcada como paga" : "Marcar como paga"}
          </button>

          {/* Validate toggle — only available if paid */}
          <button
            type="button"
            onClick={() => paid && setValidate(!validate)}
            disabled={!paid}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${
              !paid
                ? "border-border text-muted-foreground opacity-40 cursor-not-allowed"
                : validate
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                : "border-border text-muted-foreground hover:border-emerald-500 cursor-pointer"
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {validate ? "Será validada ao salvar" : "Validar cartela ao salvar"}
            {!paid && <span className="ml-auto text-xs">(requer pagamento)</span>}
          </button>
        </div>
        <DialogFooter className="gap-2">
          {card.buyerName && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClear}
              disabled={saving}
              className="mr-auto gap-1"
            >
              <X className="w-4 h-4" />
              Remover
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ValidatePage() {
  const events = useQuery(api.events.list, {});
  const [selectedEvent, setSelectedEventState] = useState<string>(
    () => sessionStorage.getItem("validate_selectedEvent") ?? ""
  );
  const [toggling, setToggling] = useState<string | null>(null);
  const [showBuyerInfo, setShowBuyerInfo] = useState(false);
  const [search, setSearch] = useState("");
  const [sellCard, setSellCard] = useState<CardDoc | null>(null);

  // Persist selection so it survives any remount during mutations
  const setSelectedEvent = (value: string) => {
    setSelectedEventState(value);
    sessionStorage.setItem("validate_selectedEvent", value);
  };

  const setValidated = useMutation(api.cards.setValidated);
  const eventId = selectedEvent as Id<"events">;

  const cards = useQuery(
    api.cards.listForExport,
    selectedEvent ? { eventId } : "skip",
  );

  const vendorMap = useQuery(
    api.vendorBatches.cardVendorMap,
    selectedEvent ? { eventId } : "skip",
  );

  // Clear saved selection if the event no longer exists in the list
  if (events && selectedEvent && !events.find((e) => e._id === selectedEvent)) {
    setSelectedEvent("");
  }

  // Sort: paid first, then unpaid; within each group by cardNumber
  const sorted = cards
    ? [...cards].sort((a, b) => {
        const pa = a.paid ? 1 : 0;
        const pb = b.paid ? 1 : 0;
        if (pb !== pa) return pb - pa;
        return a.cardNumber - b.cardNumber;
      })
    : [];

  const totalPaid = sorted.filter((c) => c.paid).length;
  const totalValidated = sorted.filter((c) => c.validated).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => {
      if (String(c.cardNumber).includes(q)) return true;
      if (c.buyerName?.toLowerCase().includes(q)) return true;
      if (c.buyerPhone?.includes(q)) return true;
      return false;
    });
  }, [sorted, search]);

  const handleToggle = async (cardId: Id<"cards">, current: boolean | undefined, paid: boolean | undefined) => {
    if (!paid) {
      toast.error("Só é possível validar cartelas pagas");
      return;
    }
    const key = cardId as string;
    setToggling(key);
    try {
      const newVal = !current;
      await setValidated({ cardId, validated: newVal });
      toast.success(newVal ? "Cartela validada!" : "Validação removida");
    } catch {
      toast.error("Erro ao atualizar validação");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-foreground">Validar Cartelas</h2>
        <p className="text-muted-foreground font-medium mt-1">
          Toque no número da cartela para validar ou remover a validação
        </p>
      </div>

      {/* Event selector */}
      <div className="p-4 bg-card rounded-xl border mb-6 space-y-1.5">
        <label className="text-sm font-semibold">Selecionar Evento</label>
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
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
            <EmptyMedia variant="icon"><CheckSquare /></EmptyMedia>
            <EmptyTitle>Selecione um evento</EmptyTitle>
            <EmptyDescription>Escolha um evento para validar cartelas</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : !cards ? (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CheckSquare /></EmptyMedia>
            <EmptyTitle>Nenhuma cartela gerada</EmptyTitle>
            <EmptyDescription>Gere as cartelas na aba Cartelas primeiro</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Summary + toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                Validadas: <strong className="text-foreground">{totalValidated}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                Pagas: <strong className="text-foreground">{totalPaid}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-muted-foreground/30 inline-block" />
                Não pagas: <strong className="text-foreground">{cards.length - totalPaid}</strong>
              </span>
              {search && (
                <span className="text-xs text-muted-foreground">
                  Exibindo <strong className="text-foreground">{filtered.length}</strong> de {cards.length}
                </span>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => setShowBuyerInfo((v) => !v)}
            >
              {showBuyerInfo ? <><EyeOff className="w-4 h-4" />Ocultar dados</> : <><Eye className="w-4 h-4" />Ver dados do comprador</>}
            </Button>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-emerald-500 inline-block" />
              Validada (clique para remover)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-blue-100 border border-blue-300 inline-block" />
              Paga — clique para validar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-orange-100 border border-orange-300 inline-block" />
              Com vendedor — bloqueada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-muted border border-border inline-block" />
              Não paga
            </span>
            <span className="flex items-center gap-1.5 ml-auto text-primary font-semibold">
              <UserPlus className="w-3.5 h-3.5" />
              Botão <UserPlus className="w-3.5 h-3.5 inline" /> = registrar venda
            </span>
          </div>

          {filtered.length === 0 && search ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Search /></EmptyMedia>
                <EmptyTitle>Nenhuma cartela encontrada</EmptyTitle>
                <EmptyDescription>Tente outro número, nome ou telefone</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : !showBuyerInfo ? (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {filtered.map((card) => {
                const isValidated = card.validated === true;
                const isPaid = card.paid === true;
                const isLoading = toggling === (card._id as string);
                const vendorName = vendorMap?.[card.cardNumber];
                const isAtVendor = !!vendorName && !isPaid; // in vendor batch, not yet paid

                return (
                  <div key={card._id} className="relative group">
                    <button
                      onClick={() => !isAtVendor && void handleToggle(card._id, card.validated, card.paid)}
                      disabled={isLoading || !isPaid || isAtVendor}
                      title={
                        isAtVendor
                          ? `Com vendedor: ${vendorName} — aguardando confirmação de venda`
                          : !isPaid
                          ? "Cartela não paga — clique em + para registrar venda"
                          : isValidated
                          ? `Clique para remover validação${vendorName ? ` — ${vendorName}` : ""}`
                          : `Clique para validar${vendorName ? ` — ${vendorName}` : ""}`
                      }
                      className={`
                        relative w-full h-12 rounded-xl flex items-center justify-center
                        font-black text-sm transition-all select-none
                        ${isLoading ? "opacity-50 scale-95" : ""}
                        ${isAtVendor
                          ? "bg-orange-100 dark:bg-orange-950/40 border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 cursor-not-allowed"
                          : isValidated
                          ? "bg-emerald-500 text-white shadow-md hover:bg-emerald-600 cursor-pointer active:scale-95"
                          : isPaid
                          ? "bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer active:scale-95"
                          : "bg-muted border border-border text-muted-foreground cursor-not-allowed opacity-50"
                        }
                      `}
                    >
                      {isValidated && (
                        <ShieldCheck className="absolute top-1 right-1 w-3 h-3 text-white/70" />
                      )}
                      {String(card.cardNumber).padStart(3, "0")}
                    </button>
                    {/* Sell button overlay — hidden for vendor-assigned cards */}
                    {!isAtVendor && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSellCard(card); }}
                        title="Registrar venda"
                        className={`
                          absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
                          bg-primary text-primary-foreground flex items-center justify-center
                          shadow-md transition-all cursor-pointer
                          ${isPaid ? "opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100" : "opacity-100"}
                        `}
                      >
                        <UserPlus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((card) => {
                const isValidated = card.validated === true;
                const isPaid = card.paid === true;
                const isLoading = toggling === (card._id as string);
                const vendorName = vendorMap?.[card.cardNumber];
                const isAtVendor = !!vendorName && !isPaid;

                return (
                  <div
                    key={card._id}
                    className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                      isAtVendor
                        ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 opacity-80"
                        : isValidated
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
                        : isPaid
                        ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                        : "bg-muted/40 border-border opacity-60"
                    }`}
                  >
                    {/* Card number badge */}
                    <button
                      onClick={() => !isAtVendor && void handleToggle(card._id, card.validated, card.paid)}
                      disabled={isLoading || !isPaid || isAtVendor}
                      title={
                        isAtVendor
                          ? `Com vendedor: ${vendorName} — aguardando confirmação`
                          : !isPaid
                          ? "Cartela não paga"
                          : isValidated
                          ? "Clique para remover validação"
                          : "Clique para validar"
                      }
                      className={`
                        relative shrink-0 w-16 h-12 rounded-xl flex items-center justify-center
                        font-black text-sm transition-all select-none
                        ${isLoading ? "opacity-50 scale-95" : ""}
                        ${isAtVendor
                          ? "bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200 cursor-not-allowed"
                          : isValidated
                          ? "bg-emerald-500 text-white shadow-md hover:bg-emerald-600 cursor-pointer active:scale-95"
                          : isPaid
                          ? "bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-300 cursor-pointer active:scale-95"
                          : "bg-muted border border-border text-muted-foreground cursor-not-allowed"
                        }
                      `}
                    >
                      {isValidated && (
                        <ShieldCheck className="absolute top-1 right-1 w-3 h-3 text-white/70" />
                      )}
                      {String(card.cardNumber).padStart(3, "0")}
                    </button>

                    {/* Buyer info */}
                    <div className="flex-1 min-w-0">
                      {card.buyerName ? (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                          <span className="flex items-center gap-1.5 font-semibold text-foreground text-sm truncate">
                            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {card.buyerName}
                          </span>
                          {card.buyerPhone && (
                            <span className="text-sm text-muted-foreground font-mono">
                              {card.buyerPhone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sem comprador</span>
                      )}
                      {vendorName && (
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          Vendedor: <span className="font-semibold">{vendorName}</span>
                        </span>
                      )}
                    </div>

                    {/* Status badge + sell button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        isValidated
                          ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                          : isPaid
                          ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {isValidated ? "Validada" : isPaid ? "Paga" : "Não paga"}
                      </span>
                      {!isAtVendor && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-muted-foreground hover:text-primary shrink-0"
                          title="Registrar / editar venda"
                          onClick={() => setSellCard(card)}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Sell & validate dialog */}
      {sellCard && (
        <SellAndValidateDialog
          card={sellCard}
          onClose={() => setSellCard(null)}
        />
      )}
    </div>
  );
}
