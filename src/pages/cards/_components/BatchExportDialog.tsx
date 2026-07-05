import { useState, useRef, useMemo } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { FileDown, ImagePlus, X, ScrollText, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { EventData, CardData } from "../_lib/bingo-utils.ts";
import { generateCardsPDF } from "../_lib/generate-pdf.ts";

type ExportFilter = "all" | "paid";

type Props = {
  eventId: Id<"events">;
  event: EventData;
  totalCards: number;
  onClose: () => void;
};

const BATCH_PRESETS = [50, 100, 200, 500, 1000];

export function BatchExportDialog({ eventId, event, totalCards, onClose }: Props) {
  const convex = useConvex();
  const bgInputRef = useRef<HTMLInputElement>(null);

  const regulation = useQuery(api.regulations.getByEvent, { eventId });
  const cardTemplate = useQuery(
    api.cardTemplates.getByTipo,
    event.chanceTipo ? { chanceTipo: event.chanceTipo as "unica" | "dupla" | "tripla" } : "skip"
  );

  // Batch size mode vs manual range
  const [useBatchMode, setUseBatchMode] = useState(false);
  const [batchSize, setBatchSize] = useState(500);
  const [batchSizeInput, setBatchSizeInput] = useState("500");
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);

  // Manual range
  const [fromNumber, setFromNumber] = useState("1");
  const [toNumber, setToNumber] = useState(String(totalCards));

  const [exportFilter, setExportFilter] = useState<ExportFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [phase, setPhase] = useState<"idle" | "loading" | "generating" | "done">("idle");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgFileName, setBgFileName] = useState<string | null>(null);
  const [includeRegulation, setIncludeRegulation] = useState(false);
  const [qrCodeText, setQrCodeText] = useState("");

  // Compute batches
  const batches = useMemo(() => {
    const size = Math.max(1, batchSize);
    const result: { from: number; to: number }[] = [];
    for (let i = 1; i <= totalCards; i += size) {
      result.push({ from: i, to: Math.min(i + size - 1, totalCards) });
    }
    return result;
  }, [batchSize, totalCards]);

  const currentBatch = batches[currentBatchIndex] ?? { from: 1, to: totalCards };

  // Effective from/to
  const from = useBatchMode
    ? currentBatch.from
    : Math.max(1, parseInt(fromNumber) || 1);
  const to = useBatchMode
    ? currentBatch.to
    : Math.min(totalCards, parseInt(toNumber) || totalCards);
  const rangeValid = from <= to;

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBgImageUrl(url);
    setBgFileName(file.name);
  };

  const removeBg = () => {
    setBgImageUrl(null);
    setBgFileName(null);
    if (bgInputRef.current) bgInputRef.current.value = "";
  };

  const applyBatchSize = () => {
    const val = parseInt(batchSizeInput);
    if (!val || val < 1) return;
    setBatchSize(val);
    setCurrentBatchIndex(0);
  };

  const handleExport = async () => {
    if (!rangeValid) {
      toast.error("Faixa inválida");
      return;
    }

    setExporting(true);
    setPhase("loading");
    setProgress(0);

    try {
      const cards = await convex.query(api.cards.listForBatchExport, {
        eventId,
        fromNumber: from,
        toNumber: to,
        onlyPaid: exportFilter === "paid",
      });

      if (cards.length === 0) {
        toast.error("Nenhuma cartela encontrada com os filtros selecionados");
        setExporting(false);
        setPhase("idle");
        return;
      }

      setProgressTotal(cards.length);
      setPhase("generating");

      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      await generateCardsPDF(
        cards as CardData[],
        event,
        (done, total) => {
          setProgress(done);
          setProgressTotal(total);
        },
        bgImageUrl,
        includeRegulation && regulation ? { title: regulation.title, content: regulation.content } : null,
        qrCodeText || null,
        cardTemplate ? { ...cardTemplate, prizeNumberLayoutsJson: cardTemplate.prizeNumberLayouts } : null
      );

      setPhase("done");
      toast.success(`PDF gerado com ${cards.length} cartela(s)! (Lote: ${from}–${to})`);

      // Advance to next batch if in batch mode
      if (useBatchMode && currentBatchIndex < batches.length - 1) {
        setCurrentBatchIndex((i) => i + 1);
      }
    } catch {
      toast.error("Erro ao gerar PDF");
      setPhase("idle");
    } finally {
      setExporting(false);
      setPhase("idle");
    }
  };

  const pct = progressTotal > 0 ? Math.round((progress / progressTotal) * 100) : 0;

  const FILTER_OPTIONS: { value: ExportFilter; label: string; desc: string }[] = [
    { value: "all", label: "Todas", desc: "Exporta todas as cartelas na faixa" },
    { value: "paid", label: "Somente pagas", desc: "Exporta apenas cartelas marcadas como pagas" },
  ];

  return (
    <Dialog open onOpenChange={(v) => !v && !exporting && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Exportar PDF em Lote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Mode toggle */}
          <div className="space-y-2">
            <Label className="font-semibold">Modo de seleção</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setUseBatchMode(false)}
                disabled={exporting}
                className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer text-left ${
                  !useBatchMode
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <div>Faixa manual</div>
                <div className="text-xs font-normal opacity-70 mt-0.5">Defina o intervalo livremente</div>
              </button>
              <button
                onClick={() => setUseBatchMode(true)}
                disabled={exporting}
                className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer text-left ${
                  useBatchMode
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Lotes automáticos
                </div>
                <div className="text-xs font-normal opacity-70 mt-0.5">Divide o evento em blocos</div>
              </button>
            </div>
          </div>

          {/* Batch mode UI */}
          {useBatchMode ? (
            <div className="space-y-3">
              <Label className="font-semibold">Tamanho do lote</Label>
              <div className="flex flex-wrap gap-2">
                {BATCH_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setBatchSize(p);
                      setBatchSizeInput(String(p));
                      setCurrentBatchIndex(0);
                    }}
                    disabled={exporting}
                    className={`px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer ${
                      batchSize === p
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Ou digite um valor personalizado</Label>
                  <Input
                    type="number"
                    min={1}
                    max={totalCards}
                    value={batchSizeInput}
                    onChange={(e) => setBatchSizeInput(e.target.value)}
                    disabled={exporting}
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={applyBatchSize} disabled={exporting} className="shrink-0">
                  Aplicar
                </Button>
              </div>

              {/* Batch navigator */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Lote {currentBatchIndex + 1} de {batches.length}
                  </span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {currentBatch.from} – {currentBatch.to}
                    <span className="ml-1 text-xs">({currentBatch.to - currentBatch.from + 1} cartelas)</span>
                  </span>
                </div>
                <Progress value={((currentBatchIndex) / batches.length) * 100} className="h-1.5" />
                <div className="flex gap-2 justify-between items-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentBatchIndex((i) => Math.max(0, i - 1))}
                    disabled={exporting || currentBatchIndex === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {batches.filter((_, i) => i < currentBatchIndex).reduce((s, b) => s + (b.to - b.from + 1), 0)} / {totalCards} geradas
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentBatchIndex((i) => Math.min(batches.length - 1, i + 1))}
                    disabled={exporting || currentBatchIndex === batches.length - 1}
                    className="gap-1"
                  >
                    Próximo <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Manual range */
            <div className="space-y-2">
              <Label className="font-semibold">Faixa de cartelas</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="number"
                    min={1}
                    max={totalCards}
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    disabled={exporting}
                  />
                </div>
                <span className="text-muted-foreground font-bold mt-5">—</span>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input
                    type="number"
                    min={1}
                    max={totalCards}
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    disabled={exporting}
                  />
                </div>
              </div>
              {rangeValid ? (
                <p className="text-xs text-muted-foreground">
                  Até <strong>{to - from + 1}</strong> cartela(s) nesta faixa (nº {from} a {to})
                </p>
              ) : (
                <p className="text-xs text-destructive font-semibold">O número inicial deve ser menor ou igual ao final</p>
              )}
            </div>
          )}

          {/* Filter */}
          <div className="space-y-2">
            <Label className="font-semibold">Filtrar por</Label>
            <div className="flex gap-2">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => !exporting && setExportFilter(opt.value)}
                  className={`flex-1 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer text-left ${
                    exportFilter === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  <div>{opt.label}</div>
                  <div className="text-xs font-normal opacity-70 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Background image */}
          <div className="space-y-2">
            <Label className="font-semibold">Papel de fundo (opcional)</Label>
            {bgImageUrl ? (
              <div className="flex items-center gap-3 p-2 rounded-lg border bg-muted/40">
                <img src={bgImageUrl} alt="preview" className="w-12 h-16 object-cover rounded border" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bgFileName}</p>
                  <p className="text-xs text-muted-foreground">Será aplicado como fundo em cada página</p>
                </div>
                <button onClick={removeBg} disabled={exporting} className="text-muted-foreground hover:text-destructive cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => bgInputRef.current?.click()}
                disabled={exporting}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all cursor-pointer"
              >
                <ImagePlus className="w-4 h-4" />
                Clique para selecionar uma imagem
              </button>
            )}
            <input
              ref={bgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBgChange}
            />
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <Label className="font-semibold">QR Code (opcional)</Label>
            <Input
              value={qrCodeText}
              onChange={(e) => setQrCodeText(e.target.value)}
              placeholder="Cole um link ou texto para gerar o QR Code"
              disabled={exporting}
            />
            {qrCodeText.trim() && (
              <p className="text-xs text-muted-foreground">
                O QR Code será impresso no canto do rodapé de cada cartela.
              </p>
            )}
          </div>

          {/* Regulation toggle */}
          <div className="space-y-2">
            <Label className="font-semibold">Regulamento</Label>
            <button
              onClick={() => !exporting && regulation && setIncludeRegulation((v) => !v)}
              disabled={exporting || !regulation}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all cursor-pointer text-left ${
                includeRegulation && regulation
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              } ${!regulation ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <ScrollText className="w-4 h-4 shrink-0" />
              <div>
                <div>
                  {regulation === undefined
                    ? "Carregando..."
                    : regulation
                    ? includeRegulation
                      ? `Incluir regulamento após cada cartela ✓`
                      : `Incluir regulamento após cada cartela`
                    : "Nenhum regulamento cadastrado"}
                </div>
                {regulation && (
                  <div className="text-xs font-normal opacity-70 mt-0.5">
                    {includeRegulation
                      ? `Cada cartela terá uma página de regulamento após ela`
                      : "Clique para ativar"}
                  </div>
                )}
              </div>
            </button>
            {!regulation && regulation !== undefined && (
              <p className="text-xs text-muted-foreground">
                Crie um regulamento no editor antes de usar esta opção.
              </p>
            )}
          </div>

          {/* Progress bar */}
          {exporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>
                  {phase === "loading" && "Carregando cartelas..."}
                  {phase === "generating" && `Gerando PDF... ${progress} / ${progressTotal}`}
                  {phase === "done" && "Concluído!"}
                </span>
                {phase === "generating" && <span>{pct}%</span>}
              </div>
              <Progress value={phase === "loading" ? undefined : pct} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exporting || !rangeValid} className="gap-2">
            <FileDown className="w-4 h-4" />
            {exporting
              ? "Gerando..."
              : useBatchMode
              ? `Gerar Lote ${currentBatchIndex + 1}/${batches.length}`
              : "Gerar PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
