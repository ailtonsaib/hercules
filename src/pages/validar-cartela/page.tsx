import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Phone, KeyRound, Delete, CheckCircle2, XCircle, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// Phone mask helper
function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// Numeric keypad
function NumericKeypad({ value, onChange, maxLen = 6 }: { value: string; onChange: (v: string) => void; maxLen?: number }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto">
      {keys.map((k, i) =>
        k === "" ? (
          <div key={i} />
        ) : k === "del" ? (
          <button
            key={k}
            onClick={() => onChange(value.slice(0, -1))}
            className="h-14 rounded-2xl bg-muted flex items-center justify-center active:bg-muted/70 transition-colors cursor-pointer"
          >
            <Delete className="w-5 h-5 text-foreground" />
          </button>
        ) : (
          <button
            key={k}
            onClick={() => value.length < maxLen && onChange(value + k)}
            className="h-14 rounded-2xl bg-muted text-2xl font-bold flex items-center justify-center active:bg-emerald-100 dark:active:bg-emerald-900/40 transition-colors cursor-pointer"
          >
            {k}
          </button>
        )
      )}
    </div>
  );
}

// ---- Session stored in localStorage ----
const SESSION_KEY = "validador_cartela_session";
type SessionData = {
  eventId: string;
  eventName: string;
  vendorName?: string;
  accessCode: string;
};

// ---- Login Screen ----
function LoginScreen({ onSuccess }: { onSuccess: (data: SessionData) => void }) {
  const [mode, setMode] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Batch selection when vendor has multiple
  const [batchOptions, setBatchOptions] = useState<Array<{
    batch: { _id: string; eventId: string; cardNumbers: number[]; accessCode: string };
    event: { name: string } | null;
  }> | null>(null);
  const [vendorNameForSelect, setVendorNameForSelect] = useState<string | undefined>(undefined);

  const codeQuery = useQuery(
    api.vendorBatches.getByCode,
    mode === "code" && code.length === 6 ? { accessCode: code } : "skip",
  );

  const phoneQuery = useQuery(
    api.vendorBatches.getBatchesByPhone,
    mode === "phone" && phone.replace(/\D/g, "").length >= 10 ? { phone } : "skip",
  );

  const handleConfirmCode = async () => {
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 300));
    if (!codeQuery) {
      setError("Código não encontrado. Verifique com o administrador.");
      setLoading(false);
      return;
    }
    const { batch, event } = codeQuery;
    if (!event) { setError("Evento não encontrado."); setLoading(false); return; }
    onSuccess({ eventId: batch.eventId, eventName: event.name, vendorName: batch.vendorName, accessCode: code });
    setLoading(false);
  };

  const handleConfirmPhone = async () => {
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 300));
    if (!phoneQuery) {
      setError("Número não encontrado. Verifique se está cadastrado como vendedor.");
      setLoading(false);
      return;
    }
    const { vendor, batches } = phoneQuery;
    const valid = batches.filter((b) => b.event !== null);
    if (valid.length === 0) {
      setError("Nenhum lote encontrado para este número.");
      setLoading(false);
      return;
    }
    if (valid.length === 1) {
      const { batch, event } = valid[0];
      if (!event) { setError("Evento não encontrado."); setLoading(false); return; }
      onSuccess({ eventId: batch.eventId, eventName: event.name, vendorName: vendor.name, accessCode: batch.accessCode });
    } else {
      setVendorNameForSelect(vendor.name);
      setBatchOptions(valid as typeof batchOptions);
    }
    setLoading(false);
  };

  // Batch picker screen
  if (batchOptions) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 bg-background">
        <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl">
          <ShieldCheck className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black">Olá, {vendorNameForSelect}!</h1>
          <p className="text-muted-foreground mt-1 text-sm">Escolha qual evento validar:</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          {batchOptions.map(({ batch, event }) => (
            <button
              key={batch._id}
              onClick={() => {
                if (!event) return;
                onSuccess({ eventId: batch.eventId, eventName: event.name, vendorName: vendorNameForSelect, accessCode: batch.accessCode });
              }}
              className="w-full p-4 bg-card border rounded-xl text-left hover:border-emerald-500 transition-colors cursor-pointer"
            >
              <p className="font-bold">{event?.name ?? "Evento"}</p>
              <p className="text-sm text-muted-foreground">{batch.cardNumbers.length} cartelas</p>
            </button>
          ))}
        </div>
        <Button variant="secondary" className="w-full max-w-xs" onClick={() => { setBatchOptions(null); setPhone(""); }}>
          Voltar
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-screen px-6 gap-6 bg-background">
      {/* Header */}
      <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl">
        {mode === "phone" ? <Phone className="w-10 h-10 text-white" /> : <KeyRound className="w-10 h-10 text-white" />}
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-black">Validador de Cartelas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "phone" ? "Digite seu número de celular cadastrado" : "Digite o código de 6 dígitos do seu lote"}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 bg-muted rounded-xl p-1 w-full max-w-[280px]">
        <button
          onClick={() => { setMode("phone"); setError(""); setCode(""); }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${mode === "phone" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          Celular
        </button>
        <button
          onClick={() => { setMode("code"); setError(""); setPhone(""); }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${mode === "code" ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          Código
        </button>
      </div>

      {mode === "phone" ? (
        <div className="w-full max-w-[280px]">
          <Input
            type="tel"
            placeholder="(99) 99999-9999"
            value={phone}
            onChange={(e) => { setPhone(applyPhoneMask(e.target.value)); setError(""); }}
            inputMode="numeric"
            className="text-center text-lg font-bold h-14 rounded-xl"
          />
        </div>
      ) : (
        <>
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
                {code[i] ?? ""}
              </div>
            ))}
          </div>
          <NumericKeypad value={code} onChange={(v) => { setCode(v); setError(""); }} />
        </>
      )}

      {error && <p className="text-sm text-destructive font-medium text-center">{error}</p>}

      <Button
        size="lg"
        className="w-full max-w-[280px] bg-emerald-600 hover:bg-emerald-700 text-white h-13 text-base font-bold rounded-xl"
        disabled={(mode === "code" ? code.length !== 6 : phone.replace(/\D/g, "").length < 10) || loading}
        onClick={() => void (mode === "code" ? handleConfirmCode() : handleConfirmPhone())}
      >
        {loading ? "Verificando..." : "Entrar"}
      </Button>
    </motion.div>
  );
}

// ---- Card Validator Screen ----
function ValidatorScreen({ session, onLogout }: { session: SessionData; onLogout: () => void }) {
  const [cardNumStr, setCardNumStr] = useState("");
  const [lastResult, setLastResult] = useState<"validated" | "already" | "not_found" | "no_buyer" | null>(null);

  const cardNum = cardNumStr.length > 0 ? parseInt(cardNumStr) : null;
  const setValidated = useMutation(api.cards.setValidated);

  const card = useQuery(
    api.cards.getByNumber,
    cardNum !== null && !isNaN(cardNum) && cardNumStr.length >= 1
      ? { eventId: session.eventId as Id<"events">, cardNumber: cardNum }
      : "skip",
  );

  const handleValidate = async () => {
    if (!card) { setLastResult("not_found"); return; }
    if (!card.buyerName) { setLastResult("no_buyer"); return; }
    if (card.validated) { setLastResult("already"); return; }
    try {
      await setValidated({ cardId: card._id, validated: true });
      setLastResult("validated");
      toast.success(`Cartela #${String(card.cardNumber).padStart(6, "0")} validada!`);
    } catch {
      toast.error("Erro ao validar cartela");
    }
  };

  const handleNewCard = () => {
    setCardNumStr("");
    setLastResult(null);
  };

  const cardStatus = card !== undefined && cardNum !== null ? (
    card === null ? "not_found" :
    !card.buyerName ? "no_buyer" :
    card.validated ? "validated_already" :
    card.paid ? "ready" :
    "unpaid"
  ) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-emerald-700 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-black text-lg">Validador</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="text-xs gap-1.5 bg-white/20 text-white border-0 hover:bg-white/30"
            onClick={onLogout}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sair
          </Button>
        </div>
        <div className="mt-1.5">
          <p className="text-sm font-semibold text-emerald-100 truncate">{session.eventName}</p>
          {session.vendorName && <p className="text-xs text-emerald-200">Vendedor: {session.vendorName}</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-8 gap-6">
        <div className="text-center">
          <h2 className="text-xl font-black">Validar Cartela</h2>
          <p className="text-muted-foreground text-sm mt-1">Digite o número da cartela do comprador</p>
        </div>

        {/* Card number input */}
        <div className="w-full max-w-[280px] space-y-3">
          <div className="flex gap-2 items-center bg-muted rounded-xl px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-2xl font-black tracking-widest text-foreground flex-1 text-center">
              {cardNumStr ? String(parseInt(cardNumStr)).padStart(6, "0") : "------"}
            </span>
            {cardNumStr && (
              <button onClick={() => { setCardNumStr(""); setLastResult(null); }} className="cursor-pointer">
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Card status indicator */}
          <AnimatePresence mode="wait">
            {card !== undefined && cardNumStr && (
              <motion.div
                key={cardStatus}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                  cardStatus === "not_found" ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-300" :
                  cardStatus === "no_buyer" ? "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300" :
                  cardStatus === "validated_already" ? "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-300" :
                  cardStatus === "ready" ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300" :
                  "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-300"
                }`}
              >
                {cardStatus === "not_found" && "Cartela não encontrada"}
                {cardStatus === "no_buyer" && "Cartela sem comprador registrado"}
                {cardStatus === "validated_already" && `✓ Já validada — ${card?.buyerName ?? ""}`}
                {cardStatus === "ready" && `Pronta para validar — ${card?.buyerName ?? ""}`}
                {cardStatus === "unpaid" && `Não paga — ${card?.buyerName ?? ""}`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <NumericKeypad value={cardNumStr} onChange={(v) => { setCardNumStr(v); setLastResult(null); }} maxLen={6} />

        {/* Action buttons */}
        <div className="w-full max-w-[280px] space-y-3">
          {lastResult === "validated" ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 p-5 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 rounded-2xl text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              <div>
                <p className="font-black text-emerald-700 dark:text-emerald-400 text-lg">Validada!</p>
                <p className="text-sm text-muted-foreground">Cartela #{cardNumStr.padStart(6, "0")} — {card?.buyerName}</p>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleNewCard}>
                Próxima Cartela
              </Button>
            </motion.div>
          ) : (
            <>
              <Button
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                disabled={!cardNumStr || cardStatus === "not_found" || cardStatus === "no_buyer" || cardStatus === "validated_already" || card === undefined}
                onClick={() => void handleValidate()}
              >
                <ShieldCheck className="w-5 h-5 mr-2" />
                Validar Cartela
              </Button>
              {cardNumStr && (
                <Button variant="secondary" className="w-full" onClick={handleNewCard}>
                  Limpar
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function ValidarCartelaPage() {
  const [session, setSession] = useState<SessionData | null>(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      return s ? (JSON.parse(s) as SessionData) : null;
    } catch { return null; }
  });

  const handleLogin = (data: SessionData) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
    setSession(data);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (!session) {
    return <LoginScreen onSuccess={handleLogin} />;
  }

  return <ValidatorScreen session={session} onLogout={handleLogout} />;
}
