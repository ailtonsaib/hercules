import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { Save, Palette, Image as ImageIcon, QrCode, AlignLeft, LayoutGrid, Printer, Trophy, Move } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import QRCode from "qrcode";
import { SORTE_LETTERS } from "@/pages/cards/_lib/bingo-utils.ts";
import PrizePatternEditor, { type PrizePattern } from "./_components/prize-pattern-editor.tsx";
import PrizeNumberEditor, { type PrizeNumberLayout } from "./_components/prize-number-editor.tsx";

type ChanceTipo = "unica" | "dupla" | "tripla";

// ── Default template values ─────────────────────────────────────────────────
const DEFAULT = {
  headerTitle: "BINGO DA SORTE",
  headerSubtitle: "",
  headerSubtitle2: "",
  headerBgColor: "#1a1a2e",
  headerTextColor: "#ffffff",
  headerLogoUrl: "",
  headerHeight: 22,
  gridHeaderBgColor: "#000000",
  gridHeaderTextColor: "#ffffff",
  gridCellBgColor: "#ffffff",
  gridCellTextColor: "#000000",
  gridFontSize: 11,
  gridBorderColor: "#000000",
  gridBorderWidth: 0.3,
  gridCellHeight: 8,
  gridAltRowEnabled: false,
  gridAltRowColor: "#f3f4f6",
  showPrizesBelow: false,
  footerText: "COLABORADOR: ________________________  TEL: (____) _______________",
  footerBgColor: "#f3f4f6",
  footerTextColor: "#111827",
  footerHeight: 16,
  bgColor: "#ffffff",
  bgImageUrl: "",
  bgOpacity: 0.3,
  qrCodeEnabled: false,
  qrCodeUrl: "https://",
  qrCodeSlot: "none" as "none" | "inline-1" | "inline-2" | "inline-3",
  qrCodeX: undefined as unknown as number,
  qrCodeY: undefined as unknown as number,
  qrCodeSize: 28,
  grid1X: undefined as unknown as number,
  grid1Y: undefined as unknown as number,
  grid2X: undefined as unknown as number,
  grid2Y: undefined as unknown as number,
  grid3X: undefined as unknown as number,
  grid3Y: undefined as unknown as number,
};

// ── Fake card numbers for preview ─────────────────────────────────────────
function fakeCols(): number[][] {
  const ranges = [
    [1, 15], [16, 30], [31, 45], [46, 60], [61, 75],
  ] as const;
  return ranges.map(([min, max]) => {
    const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 4);
  });
}

// ── Mini grid preview component ─────────────────────────────────────────────
function GridPreview({
  tpl,
  cols,
  label,
}: {
  tpl: typeof DEFAULT;
  cols: number[][];
  label: string;
}) {
  const colW = 38; // px per column in preview
  const cellH = tpl.gridCellHeight ? tpl.gridCellHeight * 3.5 : 26;
  const headerH = 24;
  const borderColor = tpl.gridBorderColor ?? "#000000";
  const borderWidth = Math.max(1, (tpl.gridBorderWidth ?? 0.3) * 3);
  return (
    <div className="select-none">
      {/* Section label */}
      <div
        className="text-center text-[10px] font-bold py-0.5 mb-1 rounded"
        style={{ background: "#e5e7eb", color: "#374151" }}
      >
        {label}
      </div>
      <div
        className="flex rounded overflow-hidden"
        style={{
          width: colW * 5,
          border: `${borderWidth}px solid ${borderColor}`,
        }}
      >
        {SORTE_LETTERS.map((letter, ci) => (
          <div key={letter} style={{ width: colW }}>
            {/* Header cell */}
            <div
              className="flex items-center justify-center font-black text-sm"
              style={{
                height: headerH,
                background: tpl.gridHeaderBgColor,
                color: tpl.gridHeaderTextColor,
                borderRight: ci < 4 ? `${borderWidth}px solid ${borderColor}` : "none",
                fontSize: tpl.gridFontSize,
              }}
            >
              {letter}
            </div>
            {/* Data cells */}
            {cols[ci].map((num, ri) => {
              const isAlt = tpl.gridAltRowEnabled && ri % 2 === 1;
              return (
                <div
                  key={ri}
                  className="flex items-center justify-center font-bold"
                  style={{
                    height: cellH,
                    background: isAlt ? tpl.gridAltRowColor : tpl.gridCellBgColor,
                    color: tpl.gridCellTextColor,
                    borderRight: ci < 4 ? `${borderWidth}px solid ${borderColor}` : "none",
                    borderTop: `${borderWidth}px solid ${borderColor}`,
                    fontSize: tpl.gridFontSize,
                  }}
                >
                  {String(num).padStart(2, "0")}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Full card preview ────────────────────────────────────────────────────────
function CardPreview({ tpl, chanceTipo }: { tpl: typeof DEFAULT; chanceTipo: ChanceTipo }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [cols] = useState<number[][]>(() => fakeCols());
  const numChances = chanceTipo === "unica" ? 1 : chanceTipo === "tripla" ? 3 : 2;
  const chanceLabels = ["1ª CHANCE", "2ª CHANCE", "3ª CHANCE"];

  useEffect(() => {
    if (tpl.qrCodeEnabled && tpl.qrCodeUrl?.startsWith("http")) {
      QRCode.toDataURL(tpl.qrCodeUrl, { margin: 1, width: 120 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [tpl.qrCodeEnabled, tpl.qrCodeUrl]);

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-2xl border"
      style={{
        background: tpl.bgColor,
        width: "100%",
        maxWidth: 400,
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* BG image overlay */}
      {tpl.bgImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url(${tpl.bgImageUrl})`,
            opacity: tpl.bgOpacity,
          }}
        />
      )}

      {/* Header */}
      <div
        className="relative flex items-center gap-3 px-4"
        style={{
          background: tpl.headerBgColor,
          color: tpl.headerTextColor,
          minHeight: tpl.headerHeight * 2.8,
        }}
      >
        {tpl.headerLogoUrl && (
          <img
            src={tpl.headerLogoUrl}
            alt="Logo"
            className="h-10 w-10 rounded object-contain shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 overflow-hidden text-center">
          <div className="font-black text-base leading-tight" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>{tpl.headerTitle || "BINGO DA SORTE"}</div>
          {(tpl.headerSubtitle || tpl.headerSubtitle2) && (
            <div className="text-[10px] opacity-80 mt-0.5">
              {tpl.headerSubtitle && <div className="text-center break-words">{tpl.headerSubtitle}</div>}
              {tpl.headerSubtitle2 && <div className="truncate text-center">{tpl.headerSubtitle2}</div>}
            </div>
          )}
        </div>
        <div
          className="shrink-0 text-right font-mono ml-1"
        >
          <div className="font-black text-sm opacity-90">#000001</div>
          <div className="text-[9px] opacity-70">01/01/2025</div>
        </div>
      </div>

      {/* Grids */}
      <div className="relative px-3 py-3 space-y-3">
        {Array.from({ length: numChances }).map((_, i) => (
          <GridPreview
            key={i}
            tpl={tpl}
            cols={cols}
            label={numChances === 1 ? "S O R T E" : chanceLabels[i]}
          />
        ))}

        {/* QR code */}
        {tpl.qrCodeEnabled && qrDataUrl && (
          <div className="flex justify-center pt-1">
            <img src={qrDataUrl} alt="QR Code" className="w-16 h-16" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="relative px-3 py-2 text-[10px] font-medium"
        style={{
          background: tpl.footerBgColor,
          color: tpl.footerTextColor,
          minHeight: tpl.footerHeight * 2,
        }}
      >
        {tpl.footerText}
      </div>
    </div>
  );
}

// ── Color picker row ─────────────────────────────────────────────────────────
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm flex-1">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-input p-0.5 bg-background"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 font-mono text-xs h-8"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DesignCartelaPage() {
  const [chanceTipo, setChanceTipo] = useState<ChanceTipo>("dupla");
  const [saving, setSaving] = useState(false);
  const [tpl, setTpl] = useState({ ...DEFAULT });
  const [prizePatterns, setPrizePatterns] = useState<PrizePattern[]>([]);
  const [prizeNumberLayouts, setPrizeNumberLayouts] = useState<PrizeNumberLayout[]>([]);
  const saveTemplate = useMutation(api.cardTemplates.save);
  const savedTemplate = useQuery(api.cardTemplates.getByTipo, { chanceTipo });
  const loadedRef = useRef<string | null>(null);

  // Load saved template whenever chanceTipo changes
  useEffect(() => {
    const key = chanceTipo;
    if (savedTemplate !== undefined && loadedRef.current !== key) {
      loadedRef.current = key;
      if (savedTemplate) {
        setTpl({
          headerTitle: savedTemplate.headerTitle ?? DEFAULT.headerTitle,
          headerSubtitle: savedTemplate.headerSubtitle ?? DEFAULT.headerSubtitle,
          headerSubtitle2: savedTemplate.headerSubtitle2 ?? DEFAULT.headerSubtitle2,
          headerBgColor: savedTemplate.headerBgColor ?? DEFAULT.headerBgColor,
          headerTextColor: savedTemplate.headerTextColor ?? DEFAULT.headerTextColor,
          headerLogoUrl: savedTemplate.headerLogoUrl ?? DEFAULT.headerLogoUrl,
          headerHeight: savedTemplate.headerHeight ?? DEFAULT.headerHeight,
          gridHeaderBgColor: savedTemplate.gridHeaderBgColor ?? DEFAULT.gridHeaderBgColor,
          gridHeaderTextColor: savedTemplate.gridHeaderTextColor ?? DEFAULT.gridHeaderTextColor,
          gridCellBgColor: savedTemplate.gridCellBgColor ?? DEFAULT.gridCellBgColor,
          gridCellTextColor: savedTemplate.gridCellTextColor ?? DEFAULT.gridCellTextColor,
          gridFontSize: savedTemplate.gridFontSize ?? DEFAULT.gridFontSize,
          gridBorderColor: savedTemplate.gridBorderColor ?? DEFAULT.gridBorderColor,
          gridBorderWidth: savedTemplate.gridBorderWidth ?? DEFAULT.gridBorderWidth,
          gridCellHeight: savedTemplate.gridCellHeight ?? DEFAULT.gridCellHeight,
          gridAltRowEnabled: savedTemplate.gridAltRowEnabled ?? DEFAULT.gridAltRowEnabled,
          gridAltRowColor: savedTemplate.gridAltRowColor ?? DEFAULT.gridAltRowColor,
          showPrizesBelow: savedTemplate.showPrizesBelow ?? DEFAULT.showPrizesBelow,
          footerText: savedTemplate.footerText ?? DEFAULT.footerText,
          footerBgColor: savedTemplate.footerBgColor ?? DEFAULT.footerBgColor,
          footerTextColor: savedTemplate.footerTextColor ?? DEFAULT.footerTextColor,
          footerHeight: savedTemplate.footerHeight ?? DEFAULT.footerHeight,
          bgColor: savedTemplate.bgColor ?? DEFAULT.bgColor,
          bgImageUrl: savedTemplate.bgImageUrl ?? DEFAULT.bgImageUrl,
          bgOpacity: savedTemplate.bgOpacity ?? DEFAULT.bgOpacity,
          qrCodeEnabled: savedTemplate.qrCodeEnabled ?? DEFAULT.qrCodeEnabled,
          qrCodeUrl: savedTemplate.qrCodeUrl ?? DEFAULT.qrCodeUrl,
          qrCodeSlot: (savedTemplate.qrCodeSlot as typeof DEFAULT.qrCodeSlot) ?? DEFAULT.qrCodeSlot,
          qrCodeX: savedTemplate.qrCodeX ?? DEFAULT.qrCodeX,
          qrCodeY: savedTemplate.qrCodeY ?? DEFAULT.qrCodeY,
          qrCodeSize: savedTemplate.qrCodeSize ?? DEFAULT.qrCodeSize,
          grid1X: savedTemplate.grid1X ?? DEFAULT.grid1X,
          grid1Y: savedTemplate.grid1Y ?? DEFAULT.grid1Y,
          grid2X: savedTemplate.grid2X ?? DEFAULT.grid2X,
          grid2Y: savedTemplate.grid2Y ?? DEFAULT.grid2Y,
          grid3X: savedTemplate.grid3X ?? DEFAULT.grid3X,
          grid3Y: savedTemplate.grid3Y ?? DEFAULT.grid3Y,
        });
        // Load prize patterns if saved
        if (savedTemplate.prizePatterns) {
          try {
            const parsed = JSON.parse(savedTemplate.prizePatterns) as PrizePattern[];
            setPrizePatterns(parsed);
          } catch {
            setPrizePatterns([]);
          }
        } else {
          setPrizePatterns([]);
        }
        if (savedTemplate.prizeNumberLayouts) {
          try {
            const parsed = JSON.parse(savedTemplate.prizeNumberLayouts) as PrizeNumberLayout[];
            setPrizeNumberLayouts(parsed);
          } catch {
            setPrizeNumberLayouts([]);
          }
        } else {
          setPrizeNumberLayouts([]);
        }
      } else {
        setTpl({ ...DEFAULT });
        setPrizePatterns([]);
        setPrizeNumberLayouts([]);
      }
    }
  }, [savedTemplate, chanceTipo]);

  // Reset loadedRef when tipo changes so we reload
  const handleChangeTipo = (v: string) => {
    loadedRef.current = null;
    setChanceTipo(v as ChanceTipo);
  };

  const update = <K extends keyof typeof DEFAULT>(key: K, value: (typeof DEFAULT)[K]) => {
    setTpl((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTemplate({
        chanceTipo,
        ...tpl,
        // Only send position values if they are valid numbers
        qrCodeX: isFinite(tpl.qrCodeX) && !isNaN(tpl.qrCodeX) ? tpl.qrCodeX : undefined,
        qrCodeY: isFinite(tpl.qrCodeY) && !isNaN(tpl.qrCodeY) ? tpl.qrCodeY : undefined,
        qrCodeSize: isFinite(tpl.qrCodeSize) && !isNaN(tpl.qrCodeSize) ? tpl.qrCodeSize : undefined,
        qrCodeSlot: tpl.qrCodeSlot,
        grid1X: isFinite(tpl.grid1X) && !isNaN(tpl.grid1X) ? tpl.grid1X : undefined,
        grid1Y: isFinite(tpl.grid1Y) && !isNaN(tpl.grid1Y) ? tpl.grid1Y : undefined,
        grid2X: isFinite(tpl.grid2X) && !isNaN(tpl.grid2X) ? tpl.grid2X : undefined,
        grid2Y: isFinite(tpl.grid2Y) && !isNaN(tpl.grid2Y) ? tpl.grid2Y : undefined,
        grid3X: isFinite(tpl.grid3X) && !isNaN(tpl.grid3X) ? tpl.grid3X : undefined,
        grid3Y: isFinite(tpl.grid3Y) && !isNaN(tpl.grid3Y) ? tpl.grid3Y : undefined,
        prizePatterns: JSON.stringify(prizePatterns),
        prizeNumberLayouts: JSON.stringify(prizeNumberLayouts),
      });
      toast.success("Modelo salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar modelo");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadedRef.current = null;
    setTpl({ ...DEFAULT });
    setPrizePatterns([]);
    setPrizeNumberLayouts([]);
    toast.info("Modelo restaurado para o padrão");
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-foreground flex items-center gap-2">
            <Palette className="w-7 h-7 text-violet-500" />
            Design de Cartelas
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            Personalize o modelo visual das suas cartelas de bingo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Restaurar padrão
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Modelo"}
          </Button>
        </div>
      </div>

      {/* Tipo selector */}
      <div className="mb-6 flex items-center gap-3">
        <Label className="font-semibold shrink-0">Tipo de cartela:</Label>
        <Select value={chanceTipo} onValueChange={handleChangeTipo}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unica">Chance Única</SelectItem>
            <SelectItem value="dupla">Chance Dupla</SelectItem>
            <SelectItem value="tripla">Chance Tripla</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Cada tipo tem seu próprio modelo</span>
      </div>

      {/* Two-column layout: editor + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: Editor panels ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <Tabs defaultValue="header">
            <TabsList className="w-full grid grid-cols-7">
              <TabsTrigger value="header" className="text-xs gap-1"><AlignLeft className="w-3 h-3" />Cabeçalho</TabsTrigger>
              <TabsTrigger value="grid" className="text-xs gap-1"><LayoutGrid className="w-3 h-3" />Grade</TabsTrigger>
              <TabsTrigger value="pos" className="text-xs gap-1"><Move className="w-3 h-3" />Posição</TabsTrigger>
              <TabsTrigger value="prizes" className="text-xs gap-1"><Trophy className="w-3 h-3" />Prêmios</TabsTrigger>
              <TabsTrigger value="numbers" className="text-xs gap-1"><span className="font-bold text-[10px]">123</span>Números</TabsTrigger>
              <TabsTrigger value="footer" className="text-xs gap-1"><Printer className="w-3 h-3" />Rodapé</TabsTrigger>
              <TabsTrigger value="bg" className="text-xs gap-1"><ImageIcon className="w-3 h-3" />Fundo</TabsTrigger>
            </TabsList>

            {/* ── HEADER ── */}
            <TabsContent value="header" className="space-y-4 pt-4">
              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Texto</h3>
                <div className="space-y-1.5">
                  <Label>Título principal</Label>
                  <Input
                    value={tpl.headerTitle}
                    onChange={(e) => update("headerTitle", e.target.value)}
                    placeholder="BINGO DA SORTE"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtítulo — Linha 1 (Endereço)</Label>
                  <Input
                    value={tpl.headerSubtitle}
                    onChange={(e) => update("headerSubtitle", e.target.value)}
                    placeholder="Ex: Rua das Flores, 123 — Centro"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Subtítulo — Linha 2 (Data / Horário / Valor)</Label>
                  <Input
                    value={tpl.headerSubtitle2}
                    onChange={(e) => update("headerSubtitle2", e.target.value)}
                    placeholder="Ex: 10/08/2025 às 19h — R$ 10,00"
                  />
                </div>
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Cores</h3>
                <ColorRow label="Cor de fundo" value={tpl.headerBgColor} onChange={(v) => update("headerBgColor", v)} />
                <ColorRow label="Cor do texto" value={tpl.headerTextColor} onChange={(v) => update("headerTextColor", v)} />
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Logo / Imagem</h3>
                <div className="space-y-1.5">
                  <Label>URL da imagem (logo)</Label>
                  <Input
                    value={tpl.headerLogoUrl}
                    onChange={(e) => update("headerLogoUrl", e.target.value)}
                    placeholder="https://hercules-cdn.com/file_..."
                  />
                  <p className="text-xs text-muted-foreground">Cole a URL de um arquivo do seu painel Files & Media</p>
                </div>
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Altura do cabeçalho</h3>
                <div className="flex items-center gap-4">
                  <Slider
                    min={10}
                    max={50}
                    step={1}
                    value={[tpl.headerHeight]}
                    onValueChange={([v]) => update("headerHeight", v)}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold w-12 text-right">{tpl.headerHeight}mm</span>
                </div>
              </div>
            </TabsContent>

            {/* ── GRID ── */}
            <TabsContent value="grid" className="space-y-4 pt-4">
              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Cores do cabeçalho S-O-R-T-E</h3>
                <ColorRow label="Fundo do cabeçalho" value={tpl.gridHeaderBgColor} onChange={(v) => update("gridHeaderBgColor", v)} />
                <ColorRow label="Texto do cabeçalho" value={tpl.gridHeaderTextColor} onChange={(v) => update("gridHeaderTextColor", v)} />
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Cores das células</h3>
                <ColorRow label="Fundo das células" value={tpl.gridCellBgColor} onChange={(v) => update("gridCellBgColor", v)} />
                <ColorRow label="Texto das células" value={tpl.gridCellTextColor} onChange={(v) => update("gridCellTextColor", v)} />
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Bordas</h3>
                <ColorRow label="Cor das bordas" value={tpl.gridBorderColor} onChange={(v) => update("gridBorderColor", v)} />
                <div className="space-y-2">
                  <Label>Espessura das bordas</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      min={0}
                      max={3}
                      step={0.1}
                      value={[tpl.gridBorderWidth]}
                      onValueChange={([v]) => update("gridBorderWidth", v)}
                      className="flex-1"
                    />
                    <span className="text-sm font-bold w-16 text-right">{tpl.gridBorderWidth.toFixed(1)}pt</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Altura das células</h3>
                <div className="flex items-center gap-4">
                  <Slider
                    min={4}
                    max={20}
                    step={0.5}
                    value={[tpl.gridCellHeight]}
                    onValueChange={([v]) => update("gridCellHeight", v)}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold w-16 text-right">{tpl.gridCellHeight}mm</span>
                </div>
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Tamanho da fonte</h3>
                <div className="flex items-center gap-4">
                  <Slider
                    min={6}
                    max={18}
                    step={1}
                    value={[tpl.gridFontSize]}
                    onValueChange={([v]) => update("gridFontSize", v)}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold w-12 text-right">{tpl.gridFontSize}pt</span>
                </div>
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Linhas alternadas</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Alterna a cor das linhas para facilitar a leitura</p>
                  </div>
                  <Switch
                    checked={tpl.gridAltRowEnabled}
                    onCheckedChange={(v) => update("gridAltRowEnabled", v)}
                  />
                </div>
                {tpl.gridAltRowEnabled && (
                  <ColorRow label="Cor das linhas alternadas" value={tpl.gridAltRowColor} onChange={(v) => update("gridAltRowColor", v)} />
                )}

                {/* Show prize descriptions below grids */}
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <div>
                    <Label className="text-sm font-medium">Descrição do prêmio abaixo da grade</Label>
                    <p className="text-xs text-muted-foreground">Exibe o nome de cada prêmio em uma faixa abaixo da grade correspondente</p>
                  </div>
                  <Switch
                    checked={tpl.showPrizesBelow ?? false}
                    onCheckedChange={(v) => update("showPrizesBelow", v)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── PRIZES ── */}
            <TabsContent value="prizes" className="space-y-4 pt-4">
              <div className="p-4 bg-card border rounded-xl">
                <p className="text-xs text-muted-foreground mb-4">
                  Defina quais células da grade precisam ser marcadas para ganhar cada prêmio.
                  Clique nas células ou arraste para pintar/apagar em lote.
                </p>
                <PrizePatternEditor
                  patterns={prizePatterns}
                  onChange={setPrizePatterns}
                />
              </div>
            </TabsContent>

            {/* ── NUMBERS POSITION ── */}
            <TabsContent value="numbers" className="space-y-4 pt-4">
              <div className="p-4 bg-card border rounded-xl space-y-4">
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Posição dos Números por Prêmio</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para cada prêmio, defina onde cada coluna (B, I, N, G, O) e cada linha aparecem na cartela.
                    Isso permite posicionar os números livremente, fora do grid padrão.
                  </p>
                </div>
                <PrizeNumberEditor
                  layouts={prizeNumberLayouts}
                  prizeCount={Math.max(1, 5)}
                  onChange={setPrizeNumberLayouts}
                />
              </div>
            </TabsContent>

            {/* ── FOOTER ── */}
            <TabsContent value="footer" className="space-y-4 pt-4">
              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Texto do rodapé</h3>
                <div className="space-y-1.5">
                  <Label>Conteúdo</Label>
                  <Input
                    value={tpl.footerText}
                    onChange={(e) => update("footerText", e.target.value)}
                    placeholder="COLABORADOR: _______________"
                  />
                  <p className="text-xs text-muted-foreground">Este texto aparece no rodapé de cada cartela impressa</p>
                </div>
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Cores</h3>
                <ColorRow label="Fundo do rodapé" value={tpl.footerBgColor} onChange={(v) => update("footerBgColor", v)} />
                <ColorRow label="Texto do rodapé" value={tpl.footerTextColor} onChange={(v) => update("footerTextColor", v)} />
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Altura do rodapé</h3>
                <div className="flex items-center gap-4">
                  <Slider
                    min={8}
                    max={40}
                    step={1}
                    value={[tpl.footerHeight]}
                    onValueChange={([v]) => update("footerHeight", v)}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold w-12 text-right">{tpl.footerHeight}mm</span>
                </div>
              </div>
            </TabsContent>

            {/* ── BACKGROUND ── */}
            <TabsContent value="bg" className="space-y-4 pt-4">
              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Cor de fundo</h3>
                <ColorRow label="Cor sólida" value={tpl.bgColor} onChange={(v) => update("bgColor", v)} />
              </div>

              <div className="p-4 bg-card border rounded-xl space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Imagem de fundo</h3>
                <div className="space-y-1.5">
                  <Label>URL da imagem de fundo</Label>
                  <Input
                    value={tpl.bgImageUrl}
                    onChange={(e) => update("bgImageUrl", e.target.value)}
                    placeholder="https://hercules-cdn.com/file_..."
                  />
                  <p className="text-xs text-muted-foreground">Cole a URL de uma imagem do seu painel Files & Media</p>
                </div>
                {tpl.bgImageUrl && (
                  <div className="space-y-2">
                    <Label>Opacidade da imagem</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        value={[tpl.bgOpacity]}
                        onValueChange={([v]) => update("bgOpacity", v)}
                        className="flex-1"
                      />
                      <span className="text-sm font-bold w-12 text-right">{Math.round(tpl.bgOpacity * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── POSIÇÃO ── */}
            <TabsContent value="pos" className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground px-1">
                Define a posição de cada grade e do QR Code na cartela impressa (em mm, a partir da margem esquerda / topo da página).
                Deixe em branco para usar o posicionamento automático.
              </p>

              {/* Grid positions */}
              {Array.from({ length: chanceTipo === "unica" ? 1 : chanceTipo === "dupla" ? 2 : 3 }, (_, i) => {
                const labels = ["1ª Chance", "2ª Chance", "3ª Chance"];
                const xKey = (["grid1X", "grid2X", "grid3X"] as const)[i];
                const yKey = (["grid1Y", "grid2Y", "grid3Y"] as const)[i];
                return (
                  <div key={i} className="p-4 bg-card border rounded-xl space-y-3">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
                      Grade — {labels[i]}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Posição X (mm)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={190}
                          placeholder="automático"
                          value={tpl[xKey] !== undefined && !isNaN(tpl[xKey] as number) ? String(tpl[xKey]) : ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value);
                            update(xKey, v);
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Posição Y (mm)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={280}
                          placeholder="automático"
                          value={tpl[yKey] !== undefined && !isNaN(tpl[yKey] as number) ? String(tpl[yKey]) : ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value);
                            update(yKey, v);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* QR Code position + settings */}
              <div className="p-4 bg-card border rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">QR Code</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Aparece na cartela impressa</p>
                  </div>
                  <Switch
                    checked={tpl.qrCodeEnabled}
                    onCheckedChange={(v) => update("qrCodeEnabled", v)}
                  />
                </div>

                {tpl.qrCodeEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>URL ou texto do QR Code</Label>
                      <Input
                        value={tpl.qrCodeUrl}
                        onChange={(e) => update("qrCodeUrl", e.target.value)}
                        placeholder="https://seusite.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Ex: link para o app do comprador: <code className="text-[10px]">/minhas-cartelas</code>
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Posição do QR Code na cartela</Label>
                      <Select
                        value={tpl.qrCodeSlot}
                        onValueChange={(v) => update("qrCodeSlot", v as typeof DEFAULT.qrCodeSlot)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Abaixo das grades (padrão)</SelectItem>
                          <SelectItem value="inline-1">Entre grades — posição 1</SelectItem>
                          <SelectItem value="inline-2">Entre grades — posição 2 (centro)</SelectItem>
                          <SelectItem value="inline-3">Entre grades — posição 3</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        "Entre grades" coloca o QR no lugar de uma das 3 grades da 1ª chance (igual à imagem de referência)
                      </p>
                    </div>

                    {tpl.qrCodeSlot === "none" && (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label>Posição X (mm)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={190}
                            placeholder="centro"
                            value={tpl.qrCodeX !== undefined && !isNaN(tpl.qrCodeX) ? String(tpl.qrCodeX) : ""}
                            onChange={(e) => {
                              const v = e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value);
                              update("qrCodeX", v);
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Posição Y (mm)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={280}
                            placeholder="automático"
                            value={tpl.qrCodeY !== undefined && !isNaN(tpl.qrCodeY) ? String(tpl.qrCodeY) : ""}
                            onChange={(e) => {
                              const v = e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value);
                              update("qrCodeY", v);
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Tamanho (mm)</Label>
                          <Input
                            type="number"
                            min={10}
                            max={80}
                            value={String(tpl.qrCodeSize ?? 28)}
                            onChange={(e) => update("qrCodeSize", Number(e.target.value))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right: Preview ─────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 self-start space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
              Preview — {chanceTipo === "unica" ? "Chance Única" : chanceTipo === "dupla" ? "Chance Dupla" : "Chance Tripla"}
            </h3>
            <span className="text-xs text-muted-foreground">Visualização aproximada</span>
          </div>

          <div
            className={cn(
              "flex justify-center rounded-2xl p-4 border",
              "bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px]"
            )}
          >
            <CardPreview tpl={tpl} chanceTipo={chanceTipo} />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            O modelo salvo será aplicado automaticamente ao gerar o PDF das cartelas
          </p>
        </div>
      </div>
    </div>
  );
}
