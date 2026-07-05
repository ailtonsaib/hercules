import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag,
  Camera,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  User,
  Phone,
  Ticket,
  FlipHorizontal,
  X,
  FileUp,
  KeyRound,
  Delete,
  Link2,
  Copy,
  Mail,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCamera } from "@/hooks/use-camera.ts";

// Phone mask: (99) 99999-9999
function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// ---- Camera Capture Modal ----
function CameraCaptureModal({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const { videoRef, stream, isLoading, error, isDenied, isSupported, start, stop, switchCamera, capturePhoto } =
    useCamera({ facingMode: "environment" });

  if (open && !stream && !isLoading && !error) void start();

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) {
      stop();
      onCapture(photo);
      onClose();
    }
  };

  const handleClose = () => {
    stop();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="p-0 max-w-sm mx-auto overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-base">Fotografar Comprovante</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-3">
          {!isSupported ? (
            <p className="text-sm text-muted-foreground text-center py-6">Câmera não disponível</p>
          ) : isDenied ? (
            <p className="text-sm text-destructive text-center py-6">
              Permissão de câmera negada. Habilite nas configurações do navegador.
            </p>
          ) : error ? (
            <p className="text-sm text-destructive text-center py-6">{error}</p>
          ) : (
            <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <p className="text-white text-sm">Iniciando câmera...</p>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            {stream && (
              <Button size="icon" variant="secondary" onClick={() => void switchCamera()}>
                <FlipHorizontal className="w-4 h-4" />
              </Button>
            )}
            {!stream && isSupported && !isDenied && (
              <Button className="flex-1" onClick={() => void start()} disabled={isLoading}>
                <Camera className="w-4 h-4 mr-2" />
                {isLoading ? "Iniciando..." : "Abrir Câmera"}
              </Button>
            )}
            {stream && (
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCapture}>
                <Camera className="w-4 h-4 mr-2" />
                Fotografar
              </Button>
            )}
            <Button variant="secondary" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Sale Modal ----
function SaleModal({
  card,
  eventId,
  eventName,
  buyerTrackingEnabled,
  onClose,
}: {
  card: { cardNumber: number; _id: Id<"cards">; buyerName?: string; buyerPhone?: string; buyerEmail?: string; paid?: boolean };
  eventId: Id<"events">;
  eventName: string;
  buyerTrackingEnabled: boolean;
  onClose: () => void;
}) {
  const [buyerName, setBuyerName] = useState(card.buyerName ?? "");
  const [buyerPhone, setBuyerPhone] = useState(card.buyerPhone ?? "");
  const [buyerEmail, setBuyerEmail] = useState(card.buyerEmail ?? "");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.vendor.generateUploadUrl);
  const savePaymentProof = useMutation(api.vendor.savePaymentProof);
  const assignBuyer = useMutation(api.cards.assignBuyer);
  const clearBuyer = useMutation(api.cards.clearBuyer);

  const isSold = !!card.buyerName;
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [soldSuccess, setSoldSuccess] = useState<{ name: string; phone: string; cardNumber: number } | null>(null);

  // suppress unused eventId warning — kept for future use
  void eventId;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (dataUrl: string) => {
    setProofPreview(dataUrl);
    void fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `comprovante-${card.cardNumber}.jpg`, { type: "image/jpeg" });
        setProofFile(file);
      });
  };

  const handleSave = async () => {
    if (!buyerName.trim()) {
      toast.error("Informe o nome do comprador");
      return;
    }
    setSaving(true);
    try {
      if (proofFile) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": proofFile.type },
          body: proofFile,
        });
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        await savePaymentProof({ cardId: card._id, storageId, buyerName: buyerName.trim(), buyerPhone: buyerPhone || undefined, buyerEmail: buyerEmail.trim() || undefined });
      } else {
        await assignBuyer({ cardId: card._id, buyerName: buyerName.trim(), buyerPhone: buyerPhone || undefined, buyerEmail: buyerEmail.trim() || undefined, paid: true });
      }
      toast.success(`Cartela #${card.cardNumber} vendida!`);
      // Show success state with WhatsApp option
      setSoldSuccess({ name: buyerName.trim(), phone: buyerPhone, cardNumber: card.cardNumber });
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message?: string };
        toast.error(d.message ?? "Erro ao registrar venda");
      } else {
        toast.error("Erro ao registrar venda");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSale = async () => {
    setSaving(true);
    try {
      await clearBuyer({ cardId: card._id });
      toast.success(`Venda da cartela #${card.cardNumber} cancelada`);
      onClose();
    } catch {
      toast.error("Erro ao cancelar venda");
    } finally {
      setSaving(false);
      setShowCancelConfirm(false);
    }
  };

  return (
    <>
      <CameraCaptureModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
      <Dialog open onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-600" />
              {isSold ? `Cartela #${String(card.cardNumber).padStart(6, "0")} — Vendida` : `Vender Cartela #${String(card.cardNumber).padStart(6, "0")}`}
            </DialogTitle>
          </DialogHeader>

          {/* ── Success state after sale ── */}
          {soldSuccess ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-black text-emerald-700 dark:text-emerald-400 text-base">Venda registrada!</p>
                <p className="text-sm text-muted-foreground">
                  Cartela <strong>#{String(soldSuccess.cardNumber).padStart(6, "0")}</strong> para <strong>{soldSuccess.name}</strong>
                </p>
              </div>

              {/* WhatsApp button — only if buyer tracking is enabled */}
              {buyerTrackingEnabled && (
                <div className="space-y-2">
                  {soldSuccess.phone ? (
                    <>
                      <p className="text-xs text-center text-muted-foreground">
                        Enviar o link de acompanhamento do sorteio para o comprador?
                      </p>
                      <a
                        href={`https://wa.me/55${soldSuccess.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Obrigado por adquirir a cartela da *${eventName}*! 🎉\n\nCartela: *#${String(soldSuccess.cardNumber).padStart(6, "0")}*\n\nAcompanhe o sorteio em tempo real pelo link abaixo:\n${window.location.origin}/minhas-cartelas\n\nBoa sorte! 🍀`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold rounded-xl py-3 px-4 transition-colors cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.119.553 4.107 1.522 5.837L.057 23.882a.5.5 0 0 0 .611.61l6.101-1.457A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.927 0-3.733-.515-5.287-1.415l-.379-.223-3.927.938.972-3.842-.247-.396A9.954 9.954 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                        </svg>
                        Enviar via WhatsApp
                      </a>
                    </>
                  ) : (
                    <p className="text-xs text-center text-muted-foreground py-2 px-3 bg-muted rounded-lg">
                      Telefone não cadastrado — não é possível enviar o link via WhatsApp
                    </p>
                  )}
                </div>
              )}

              <Button className="w-full" variant="secondary" onClick={onClose}>
                Fechar
              </Button>
            </div>
          ) : showCancelConfirm ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-300 rounded-xl text-center space-y-2">
                <p className="font-black text-red-700 dark:text-red-400 text-base">Cancelar esta venda?</p>
                <p className="text-sm text-red-600 dark:text-red-500">
                  A cartela <strong>#{String(card.cardNumber).padStart(6, "0")}</strong> voltará a ficar disponível.
                </p>
                {card.buyerName && (
                  <p className="text-sm text-muted-foreground">Comprador: <strong>{card.buyerName}</strong></p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCancelConfirm(false)} disabled={saving}>
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={() => void handleCancelSale()}
                  disabled={saving}
                >
                  <XCircle className="w-4 h-4" />
                  {saving ? "Cancelando..." : "Confirmar Cancelamento"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <User className="w-4 h-4" /> Nome do Comprador *
              </label>
              <Input placeholder="João da Silva" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> Telefone
              </label>
              <Input
                type="tel"
                placeholder="(99) 99999-9999"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(applyPhoneMask(e.target.value))}
                inputMode="numeric"
              />
            </div>
            {buyerTrackingEnabled && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> E-mail <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                </label>
                <Input
                  type="email"
                  placeholder="comprador@email.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  inputMode="email"
                />
                <p className="text-[11px] text-muted-foreground">Usado para enviar o link de acompanhamento no dia do sorteio</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Comprovante de Pagamento
              </label>
              {proofPreview ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={proofPreview} alt="Comprovante" className="w-full object-cover max-h-48" />
                  <button
                    onClick={() => { setProofPreview(null); setProofFile(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" className="gap-2 h-14 flex-col text-xs" onClick={() => setCameraOpen(true)}>
                    <Camera className="w-5 h-5" /> Tirar Foto
                  </Button>
                  <Button variant="secondary" className="gap-2 h-14 flex-col text-xs" onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="w-5 h-5" /> Anexar Arquivo
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>Fechar</Button>
              {isSold && (
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={saving}
                >
                  <XCircle className="w-4 h-4" />
                  Cancelar Venda
                </Button>
              )}
              {!isSold && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={() => void handleSave()}
                  disabled={saving || !buyerName.trim()}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? "Salvando..." : "Confirmar Venda"}
                </Button>
              )}
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- Card Item ----
function CardItem({
  cardNumber,
  card,
  onSell,
}: {
  cardNumber: number;
  card: { _id: Id<"cards">; buyerName?: string; buyerPhone?: string; paid?: boolean } | undefined;
  onSell: () => void;
}) {
  const isSold = !!card?.buyerName;
  const isPaid = card?.paid === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
        isPaid
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
          : isSold
          ? "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700"
          : "bg-card border-border cursor-pointer active:scale-95"
      }`}
      onClick={!isPaid ? onSell : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm ${
            isPaid ? "bg-emerald-600 text-white" : isSold ? "bg-yellow-500 text-white" : "bg-muted text-foreground"
          }`}
        >
          {String(cardNumber).padStart(3, "0")}
        </div>
        <div>
          {isSold ? (
            <>
              <p className="font-semibold text-sm leading-tight">{card?.buyerName}</p>
              <p className="text-xs text-muted-foreground">{card?.buyerPhone ?? "Sem telefone"}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Disponível</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isPaid ? (
          <Badge className="bg-emerald-600 text-white text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" /> Pago
          </Badge>
        ) : isSold ? (
          <Badge className="bg-yellow-500 text-white text-xs">Pendente</Badge>
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
}

// ---- Numeric Keypad ----
function NumericKeypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
            className="h-14 rounded-2xl bg-muted flex items-center justify-center active:bg-muted/70 transition-colors"
          >
            <Delete className="w-5 h-5 text-foreground" />
          </button>
        ) : (
          <button
            key={k}
            onClick={() => value.length < 6 && onChange(value + k)}
            className="h-14 rounded-2xl bg-muted text-2xl font-bold flex items-center justify-center active:bg-emerald-100 dark:active:bg-emerald-900/40 transition-colors"
          >
            {k}
          </button>
        )
      )}
    </div>
  );
}

// ---- Access Code Screen ----
function AccessCodeScreen({ onSuccess }: { onSuccess: (batchId: string, eventId: string, eventName: string, vendorName: string | undefined, cardNumbers: number[], accessCode: string) => void }) {
  const [mode, setMode] = useState<"code" | "phone">("phone");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Batch selection when multiple batches found by phone
  const [batchOptions, setBatchOptions] = useState<Array<{ batch: { _id: string; eventId: string; cardNumbers: number[]; accessCode: string }; event: { name: string } | null }> | null>(null);
  const [vendorName, setVendorName] = useState<string | undefined>(undefined);

  const convexQuery = useQuery(
    api.vendorBatches.getByCode,
    mode === "code" && code.length === 6 ? { accessCode: code } : "skip",
  );

  const phoneQuery = useQuery(
    api.vendorBatches.getBatchesByPhone,
    mode === "phone" && phone.replace(/\D/g, "").length >= 10 ? { phone } : "skip",
  );

  const handleConfirmCode = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 300));
    if (!convexQuery) {
      setError("Código não encontrado. Verifique com o administrador.");
      setLoading(false);
      return;
    }
    const { batch, event } = convexQuery;
    if (!event) {
      setError("Evento não encontrado.");
      setLoading(false);
      return;
    }
    onSuccess(batch._id, batch.eventId, event.name, batch.vendorName, batch.cardNumbers, code);
    setLoading(false);
  };

  const handleConfirmPhone = async () => {
    if (phone.replace(/\D/g, "").length < 10) return;
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 300));
    if (!phoneQuery) {
      setError("Número não encontrado. Verifique se está cadastrado como vendedor.");
      setLoading(false);
      return;
    }
    const { vendor, batches } = phoneQuery;
    const validBatches = batches.filter((b) => b.event !== null);
    if (validBatches.length === 0) {
      setError("Nenhum lote encontrado para este número. Solicite um lote ao administrador.");
      setLoading(false);
      return;
    }
    if (validBatches.length === 1) {
      const { batch, event } = validBatches[0];
      if (!event) { setError("Evento não encontrado."); setLoading(false); return; }
      onSuccess(batch._id, batch.eventId, event.name, vendor.name, batch.cardNumbers, batch.accessCode);
    } else {
      // Multiple batches — let vendor pick
      setVendorName(vendor.name);
      setBatchOptions(validBatches as typeof batchOptions);
    }
    setLoading(false);
  };

  if (batchOptions) {
    return (
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center min-h-[80vh] px-6 gap-6">
        <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl">
          <ShoppingBag className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-foreground">Olá, {vendorName}!</h1>
          <p className="text-muted-foreground mt-1 text-sm">Escolha qual lote deseja acessar:</p>
        </div>
        <div className="w-full space-y-3">
          {batchOptions.map(({ batch, event }) => (
            <button
              key={batch._id}
              onClick={() => {
                if (!event) return;
                onSuccess(batch._id, batch.eventId, event.name, vendorName, batch.cardNumbers, batch.accessCode);
              }}
              className="w-full p-4 bg-card border rounded-xl text-left hover:border-emerald-500 transition-colors cursor-pointer"
            >
              <p className="font-bold text-foreground">{event?.name ?? "Evento"}</p>
              <p className="text-sm text-muted-foreground">{batch.cardNumbers.length} cartelas · Código {batch.accessCode}</p>
            </button>
          ))}
        </div>
        <Button variant="secondary" className="w-full" onClick={() => { setBatchOptions(null); setPhone(""); }}>
          Voltar
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[80vh] px-6 gap-6"
    >
      <div className="w-20 h-20 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl">
        {mode === "phone" ? <Phone className="w-10 h-10 text-white" /> : <KeyRound className="w-10 h-10 text-white" />}
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-black text-foreground">
          {mode === "phone" ? "Entrar pelo Celular" : "Código de Acesso"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "phone"
            ? "Digite seu número de celular cadastrado"
            : "Digite o código de 6 dígitos fornecido pelo administrador"}
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
        <div className="w-full max-w-[280px] space-y-4">
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
                {code[i] ?? ""}
              </div>
            ))}
          </div>
          <NumericKeypad value={code} onChange={(v) => { setCode(v); setError(""); }} />
        </>
      )}

      {error && (
        <p className="text-sm text-destructive font-medium text-center">{error}</p>
      )}

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

// ---- Main Vendor Page ----
type BatchState = {
  batchId: string;
  eventId: Id<"events">;
  eventName: string;
  vendorName?: string;
  cardNumbers: number[];
};

const VENDOR_SESSION_KEY = "bingo_vendor_session";

type VendorSession = {
  batchId: string;
  eventId: string;
  eventName: string;
  vendorName?: string;
  cardNumbers: number[];
  accessCode: string;
};

import { Lock } from "lucide-react";

const PLAN_DISPLAY_VENDOR: Record<string, string> = {
  free: "Gratuito", basic: "BASIC", pro: "PRO", max: "MAX",
  ultra: "ULTRA", enterprise: "ENTERPRISE", mega: "MEGA",
};

export default function VendorPage() {
  const vendorAppStatus = useQuery(api.appSettings.getVendorAppStatus);
  const buyerTrackingStatus = useQuery(api.appSettings.getBuyerTrackingStatus);

  const [batch, setBatch] = useState<BatchState | null>(() => {
    try {
      const saved = localStorage.getItem(VENDOR_SESSION_KEY);
      if (saved) {
        const s = JSON.parse(saved) as VendorSession;
        return { batchId: s.batchId, eventId: s.eventId as Id<"events">, eventName: s.eventName, vendorName: s.vendorName, cardNumbers: s.cardNumbers };
      }
    } catch { /* ignore */ }
    return null;
  });
  const [savedCode, setSavedCode] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(VENDOR_SESSION_KEY);
      if (saved) return (JSON.parse(saved) as VendorSession).accessCode;
    } catch { /* ignore */ }
    return null;
  });
  const [selectedCard, setSelectedCard] = useState<{
    cardNumber: number;
    _id: Id<"cards">;
    buyerName?: string;
    buyerPhone?: string;
    buyerEmail?: string;
    paid?: boolean;
  } | null>(null);
  const [search, setSearch] = useState("");

  // Keep cardNumbers in sync with backend (in case admin adds more cards to batch)
  const liveBatch = useQuery(
    api.vendorBatches.getByCode,
    savedCode ? { accessCode: savedCode } : "skip",
  );

  // When live data updates card list, sync local state and localStorage
  useMemo(() => {
    if (liveBatch && batch && liveBatch.batch.cardNumbers.length !== batch.cardNumbers.length) {
      const updated = { ...batch, cardNumbers: liveBatch.batch.cardNumbers, batchId: liveBatch.batch._id };
      setBatch(updated);
      try {
        const saved = localStorage.getItem(VENDOR_SESSION_KEY);
        if (saved && savedCode) {
          const s = JSON.parse(saved) as VendorSession;
          localStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify({ ...s, cardNumbers: liveBatch.batch.cardNumbers }));
        }
      } catch { /* ignore */ }
    }
  }, [liveBatch]);

  const cards = useQuery(
    api.vendor.getByNumbers,
    batch ? { eventId: batch.eventId, cardNumbers: batch.cardNumbers } : "skip",
  );

  const cardMap = new Map(cards?.map((c) => [c.cardNumber, c]) ?? []);

  const filtered = (batch?.cardNumbers ?? []).filter((n) => {
    if (!search) return true;
    if (String(n).includes(search)) return true;
    const card = cardMap.get(n);
    if (card?.buyerName?.toLowerCase().includes(search.toLowerCase())) return true;
    return false;
  });

  const totalCards = batch?.cardNumbers.length ?? 0;
  const totalSold = (batch?.cardNumbers ?? []).filter((n) => cardMap.get(n)?.buyerName).length;
  const totalPaid = (batch?.cardNumbers ?? []).filter((n) => cardMap.get(n)?.paid).length;

  const openSaleModal = (cardNumber: number) => {
    const card = cardMap.get(cardNumber);
    if (!card) {
      toast.error("Cartela não encontrada. Verifique a conexão.");
      return;
    }
    setSelectedCard(card);
  };

  return (
    <>
      {/* Loading */}
      {vendorAppStatus === undefined && (
        <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Bloqueado por plano */}
      {vendorAppStatus !== undefined && !vendorAppStatus.enabled && (
        <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock className="text-emerald-400" size={36} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">App do Vendedor indisponível</h1>
            <p className="text-emerald-300 text-sm max-w-sm">
              Este recurso não está disponível no plano atual. Entre em contato com o organizador para mais informações.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/50">
            Plano necessário: <span className="text-emerald-300 font-semibold">{PLAN_DISPLAY_VENDOR[vendorAppStatus.minPlan] ?? vendorAppStatus.minPlan}</span>
          </div>
        </div>
      )}

      {/* Conteúdo normal — só renderiza se habilitado */}
      {vendorAppStatus?.enabled && (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-emerald-700 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <span className="font-black text-lg tracking-tight">Bingo Vendas</span>
          </div>
          {batch && (
            <Button
              size="sm"
              variant="secondary"
              className="text-xs gap-1.5 bg-white/20 text-white border-0 hover:bg-white/30"
              onClick={() => { localStorage.removeItem(VENDOR_SESSION_KEY); setSavedCode(null); setBatch(null); }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Trocar Lote
            </Button>
          )}
        </div>
        {batch && (
          <div className="mt-2">
            <p className="text-sm font-semibold text-emerald-100 truncate">{batch.eventName}</p>
            {batch.vendorName && <p className="text-xs text-emerald-200">Vendedor: {batch.vendorName}</p>}
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        {/* Quick access links */}
        {batch && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Links úteis para compartilhar
            </p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground font-mono flex-1 truncate">{window.location.origin}/minhas-cartelas</span>
                <button
                  onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/minhas-cartelas`).then(() => toast.success("Link do comprador copiado!"))}
                  className="text-[10px] text-primary font-bold flex items-center gap-0.5 cursor-pointer hover:underline shrink-0"
                >
                  <Copy className="w-3 h-3" />Copiar
                </button>
              </div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-[11px] text-muted-foreground font-mono flex-1 truncate">{window.location.origin}/vendedor</span>
                <button
                  onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/vendedor`).then(() => toast.success("Link do vendedor copiado!"))}
                  className="text-[10px] text-primary font-bold flex items-center gap-0.5 cursor-pointer hover:underline shrink-0"
                >
                  <Copy className="w-3 h-3" />Copiar
                </button>
              </div>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {!batch ? (
            <AccessCodeScreen
              key="code"
              onSuccess={(batchId, eventId, eventName, vendorName, cardNumbers, accessCode) => {
                const session: VendorSession = { batchId, eventId, eventName, vendorName, cardNumbers, accessCode };
                localStorage.setItem(VENDOR_SESSION_KEY, JSON.stringify(session));
                setSavedCode(accessCode);
                setBatch({ batchId, eventId: eventId as Id<"events">, eventName, vendorName, cardNumbers });
              }}
            />
          ) : (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total", value: totalCards, color: "bg-card border" },
                  { label: "Vendidas", value: totalSold, color: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800" },
                  { label: "Pagas", value: totalPaid, color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
                    <p className="text-2xl font-black">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Search */}
              <Input
                placeholder="Buscar por número ou comprador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl"
              />

              {/* Card list */}
              <div className="space-y-2">
                {filtered.map((cardNumber) => (
                  <CardItem
                    key={cardNumber}
                    cardNumber={cardNumber}
                    card={cardMap.get(cardNumber)}
                    onSell={() => openSaleModal(cardNumber)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sale modal */}
      {selectedCard && batch && (
        <SaleModal
          card={selectedCard}
          eventId={batch.eventId}
          eventName={batch.eventName}
          buyerTrackingEnabled={buyerTrackingStatus?.enabled ?? false}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
      )}
    </>
  );
}
