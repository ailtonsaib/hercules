import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import {
  KeyRound, ShieldCheck, CheckSquare, Search, X, User,
  Eye, EyeOff, UserPlus, CheckCircle2, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";

const SESSION_KEY = "validador_session";
const PHONE_PREFIX = "(62) ";

function applyLocalMask(local: string): string {
  const d = local.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function buildPhoneValue(rawInput: string): string {
  const allDigits = rawInput.replace(/\D/g, "");
  const local = allDigits.startsWith("62") ? allDigits.slice(2) : allDigits;
  return PHONE_PREFIX + applyLocalMask(local);
}

function phoneMaskFromStored(stored: string): string {
  const digits = stored.replace(/\D/g, "");
  const local = digits.startsWith("62") ? digits.slice(2) : digits;
  return PHONE_PREFIX + applyLocalMask(local);
}

type CardDoc = Pick<Doc<"cards">, "_id" | "cardNumber" | "buyerName" | "buyerPhone" | "paid" | "validated">;

// ---- Sell & Validate Dialog ----
function SellAndValidateDialog({ card, onClose }: { card: CardDoc; onClose: () => void }) {
  const assignBuyer = useMutation(api.cards.assignBuyer);
  const setValidated = useMutation(api.cards.setValidated);
  const clearBuyer = useMutation(api.cards.clearBuyer);

  const [name, setName] = useState(card.buyerName ?? "");
  const [phone, setPhone] = useState(
    card.buyerPhone ? phoneMaskFromStored(card.buyerPhone) : PHONE_PREFIX
  );
  const [paid, setPaid] = useState(card.paid ?? false);
  const [validate, setValidate] = useState(card.validated ?? false);
  const [saving, setSaving] = useState(false);
  const phoneRef = React.useRef<HTMLInputElement>(null);

  const handlePhoneFocus = () => {
    const el = phoneRef.current;
    if (!el) return;
    if ((el.selectionStart ?? 0) < PHONE_PREFIX.length) {
      el.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw.startsWith(PHONE_PREFIX)) { setPhone(PHONE_PREFIX); return; }
    const newVal = buildPhoneValue(raw);
    setPhone(newVal);
    requestAnimationFrame(() => {
      const el = phoneRef.current;
      if (el) el.setSelectionRange(newVal.length, newVal.length);
    });
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = phoneRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    if ((e.key === "Backspace" || e.key === "Delete") && pos <= PHONE_PREFIX.length) {
      e.preventDefault();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Informe o nome do comprador"); return; }
    if (validate && !paid) { toast.error("Para validar é necessário marcar como paga primeiro"); return; }
    setSaving(true);
    try {
      const rawPhone = phone.replace(/\D/g, "");
      await assignBuyer({ cardId: card._id, buyerName: name.trim(), buyerPhone: rawPhone || undefined, paid });
      if (validate) await setValidated({ cardId: card._id, validated: true });
      else if (card.validated && !validate) await setValidated({ cardId: card._id, validated: false });
      toast.success(validate ? "Cartela vendida e validada!" : "Comprador salvo!");
      onClose();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await clearBuyer({ cardId: card._id });
      if (card.validated) await setValidated({ cardId: card._id, validated: false });
      toast.success("Comprador removido");
      onClose();
    } catch { toast.error("Erro ao remover"); }
    finally { setSaving(false); }
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
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Silva" autoFocus />
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
          <button
            type="button"
            onClick={() => { const next = !paid; setPaid(next); if (!next) setValidate(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all cursor-pointer ${paid ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300" : "border-border text-muted-foreground hover:border-primary"}`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {paid ? "Marcada como paga" : "Marcar como paga"}
          </button>
          <button
            type="button"
            onClick={() => paid && setValidate(!validate)}
            disabled={!paid}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${!paid ? "border-border text-muted-foreground opacity-40 cursor-not-allowed" : validate ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 cursor-pointer" : "border-border text-muted-foreground hover:border-emerald-500 cursor-pointer"}`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {validate ? "Será validada ao salvar" : "Validar cartela ao salvar"}
            {!paid && <span className="ml-auto text-xs">(requer pagamento)</span>}
          </button>
        </div>
        <DialogFooter className="gap-2">
          {card.buyerName && (
            <Button variant="destructive" size="sm" onClick={handleClear} disabled={saving} className="mr-auto gap-1">
              <X className="w-4 h-4" />Remover
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Access Code Screen ----
function AccessCodeScreen({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const configuredCode = useQuery(api.appSettings.get, { key: "validator_access_code" });

  const handleKey = (digit: string) => {
    if (code.length < 6) setCode((c) => c + digit);
  };

  const handleBackspace = () => setCode((c) => c.slice(0, -1));

  const handleConfirm = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 200));

    if (!configuredCode || configuredCode.trim() === "") {
      setError("Validador por código não está habilitado. Contate o administrador.");
      setLoading(false);
      return;
    }

    if (code !== configuredCode.trim()) {
      setError("Código incorreto. Verifique com o administrador.");
      setCode("");
      setLoading(false);
      return;
    }

    sessionStorage.setItem(SESSION_KEY, code);
    onSuccess();
    setLoading(false);
  };

  // Auto-confirm when 6 digits entered
  React.useEffect(() => {
    if (code.length === 6) void handleConfirm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"] as const;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl">
          <KeyRound className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-foreground">Validador de Cartelas</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Digite o código de 6 dígitos fornecido pelo administrador
          </p>
        </div>

        {/* Code display */}
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-11 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-black transition-colors ${
                i < code.length
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                  : i === code.length
                  ? "border-emerald-400 bg-card animate-pulse"
                  : "border-border bg-card"
              }`}
            >
              {i < code.length ? "•" : ""}
            </div>
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-sm font-semibold text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
          {digits.map((d, i) => {
            if (d === "") return <div key={i} />;
            const isBack = d === "⌫";
            return (
              <button
                key={i}
                onClick={() => isBack ? handleBackspace() : handleKey(d)}
                disabled={loading}
                className={`h-14 rounded-2xl text-xl font-black transition-all active:scale-95 cursor-pointer ${
                  isBack
                    ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    : "bg-card border-2 border-border text-foreground hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground animate-pulse">Verificando...</p>
        )}
      </motion.div>
    </div>
  );
}

// ---- Main Validator Page ----
export default function ValidadorPage() {
  const [authenticated, setAuthenticated] = useState(
    () => !!sessionStorage.getItem(SESSION_KEY)
  );
  const [selectedEvent, setSelectedEventState] = useState<string>(
    () => sessionStorage.getItem("validador_event") ?? ""
  );
  const [toggling, setToggling] = useState<string | null>(null);
  const [showBuyerInfo, setShowBuyerInfo] = useState(false);
  const [search, setSearch] = useState("");
  const [sellCard, setSellCard] = useState<CardDoc | null>(null);

  const events = useQuery(api.events.list, authenticated ? {} : "skip");
  const eventId = selectedEvent as Id<"events">;
  const cards = useQuery(api.cards.listForExport, authenticated && selectedEvent ? { eventId } : "skip");
  const vendorMap = useQuery(api.vendorBatches.cardVendorMap, authenticated && selectedEvent ? { eventId } : "skip");
  const setValidatedMut = useMutation(api.cards.setValidated);

  const setSelectedEvent = (value: string) => {
    setSelectedEventState(value);
    sessionStorage.setItem("validador_event", value);
  };

  if (events && selectedEvent && !events.find((e) => e._id === selectedEvent)) {
    setSelectedEvent("");
  }

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
    if (!paid) { toast.error("Só é possível validar cartelas pagas"); return; }
    const key = cardId as string;
    setToggling(key);
    try {
      const newVal = !current;
      await setValidatedMut({ cardId, validated: newVal });
      toast.success(newVal ? "Cartela validada!" : "Validação removida");
    } catch { toast.error("Erro ao atualizar validação"); }
    finally { setToggling(null); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <AccessCodeScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-foreground text-sm">Validador de Cartelas</span>
        </div>
        <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />Sair
        </Button>
      </div>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        {/* Event selector */}
        <div className="bg-card border rounded-xl p-4 space-y-1.5">
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
            {Array.from({ length: 30 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              </div>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => setShowBuyerInfo((v) => !v)}>
                {showBuyerInfo ? <><EyeOff className="w-4 h-4" />Ocultar dados</> : <><Eye className="w-4 h-4" />Ver dados</>}
              </Button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-emerald-500 inline-block" />Validada</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-blue-100 border border-blue-300 inline-block" />Paga — clique para validar</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-orange-100 border border-orange-300 inline-block" />Com vendedor</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-muted border border-border inline-block" />Não paga</span>
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
                  const isAtVendor = !!vendorName && !isPaid;

                  return (
                    <div key={card._id} className="relative group">
                      <button
                        onClick={() => !isAtVendor && void handleToggle(card._id, card.validated, card.paid)}
                        disabled={isLoading || !isPaid || isAtVendor}
                        className={`relative w-full h-12 rounded-xl flex items-center justify-center font-black text-sm transition-all select-none ${isLoading ? "opacity-50 scale-95" : ""} ${isAtVendor ? "bg-orange-100 dark:bg-orange-950/40 border-2 border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 cursor-not-allowed" : isValidated ? "bg-emerald-500 text-white shadow-md hover:bg-emerald-600 cursor-pointer active:scale-95" : isPaid ? "bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer active:scale-95" : "bg-muted border border-border text-muted-foreground cursor-not-allowed opacity-50"}`}
                      >
                        {isValidated && <ShieldCheck className="absolute top-1 right-1 w-3 h-3 text-white/70" />}
                        {String(card.cardNumber).padStart(3, "0")}
                      </button>
                      {!isAtVendor && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSellCard(card); }}
                          title="Registrar venda"
                          className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md transition-all cursor-pointer ${isPaid ? "opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100" : "opacity-100"}`}
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
                      className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${isAtVendor ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200" : isValidated ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300" : isPaid ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200" : "bg-muted/40 border-border opacity-60"}`}
                    >
                      <button
                        onClick={() => !isAtVendor && void handleToggle(card._id, card.validated, card.paid)}
                        disabled={isLoading || !isPaid || isAtVendor}
                        className={`relative shrink-0 w-16 h-12 rounded-xl flex items-center justify-center font-black text-sm transition-all select-none ${isLoading ? "opacity-50" : ""} ${isAtVendor ? "bg-orange-200 dark:bg-orange-900 text-orange-800 cursor-not-allowed" : isValidated ? "bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer active:scale-95" : isPaid ? "bg-blue-200 dark:bg-blue-900 text-blue-800 hover:bg-blue-300 cursor-pointer active:scale-95" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
                      >
                        {isValidated && <ShieldCheck className="absolute top-1 right-1 w-3 h-3 text-white/70" />}
                        {String(card.cardNumber).padStart(3, "0")}
                      </button>
                      <div className="flex-1 min-w-0">
                        {card.buyerName ? (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                            <span className="flex items-center gap-1.5 font-semibold text-foreground text-sm truncate">
                              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />{card.buyerName}
                            </span>
                            {card.buyerPhone && <span className="text-sm text-muted-foreground font-mono">{card.buyerPhone}</span>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem comprador</span>
                        )}
                        {vendorName && <span className="text-xs text-muted-foreground mt-0.5 block">Vendedor: <span className="font-semibold">{vendorName}</span></span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${isValidated ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700" : isPaid ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                          {isValidated ? "Validada" : isPaid ? "Paga" : "Não paga"}
                        </span>
                        {!isAtVendor && (
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-primary" onClick={() => setSellCard(card)}>
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
      </div>

      {sellCard && <SellAndValidateDialog card={sellCard} onClose={() => setSellCard(null)} />}
    </div>
  );
}
