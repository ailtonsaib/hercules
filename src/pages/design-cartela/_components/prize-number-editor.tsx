import { useState } from "react";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";

const COLS = ["B", "I", "N", "G", "O"] as const;
const ROWS = ["Linha 1", "Linha 2", "Linha 3", "Linha 4"] as const;

export type PrizeNumberLayout = {
  prizeIndex: number; // 0-based
  colX: [number, number, number, number, number]; // X position (mm) for each column
  rowY: [number, number, number, number]; // Y position (mm) for each row
  fontSize: number; // pt
  color: string; // hex
};

type Props = {
  layouts: PrizeNumberLayout[];
  prizeCount: number;
  onChange: (layouts: PrizeNumberLayout[]) => void;
};

function defaultLayout(prizeIndex: number): PrizeNumberLayout {
  return {
    prizeIndex,
    colX: [15, 45, 75, 105, 135],
    rowY: [60, 75, 90, 105],
    fontSize: 14,
    color: "#000000",
  };
}

function NumInput({
  label,
  value,
  onChange,
  min = 0,
  max = 290,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 text-sm px-2"
      />
    </div>
  );
}

export default function PrizeNumberEditor({ layouts, prizeCount, onChange }: Props) {
  const [selectedPrize, setSelectedPrize] = useState(0);

  // Get or create layout for current prize
  const current: PrizeNumberLayout =
    layouts.find((l) => l.prizeIndex === selectedPrize) ?? defaultLayout(selectedPrize);

  const updateCurrent = (updated: PrizeNumberLayout) => {
    const next = layouts.filter((l) => l.prizeIndex !== selectedPrize);
    onChange([...next, updated]);
  };

  const updateColX = (colIdx: number, val: number) => {
    const newColX = [...current.colX] as PrizeNumberLayout["colX"];
    newColX[colIdx] = val;
    updateCurrent({ ...current, colX: newColX });
  };

  const updateRowY = (rowIdx: number, val: number) => {
    const newRowY = [...current.rowY] as PrizeNumberLayout["rowY"];
    newRowY[rowIdx] = val;
    updateCurrent({ ...current, rowY: newRowY });
  };

  const handleCopyFromPrev = () => {
    if (selectedPrize === 0) return;
    const prev = layouts.find((l) => l.prizeIndex === selectedPrize - 1) ?? defaultLayout(selectedPrize - 1);
    updateCurrent({ ...prev, prizeIndex: selectedPrize });
  };

  const handleReset = () => {
    updateCurrent(defaultLayout(selectedPrize));
  };

  const prizeOptions = Array.from({ length: prizeCount }, (_, i) => i);

  return (
    <div className="space-y-4">
      {/* Prize selector */}
      <div className="flex items-center gap-3">
        <Label className="shrink-0 font-semibold text-sm">Usar o Prêmio:</Label>
        <Select
          value={String(selectedPrize)}
          onValueChange={(v) => setSelectedPrize(Number(v))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {prizeOptions.map((i) => (
              <SelectItem key={i} value={String(i)}>
                {i + 1}º Prêmio
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPrize > 0 && (
          <Button size="sm" variant="secondary" onClick={handleCopyFromPrev} className="text-xs">
            Copiar do {selectedPrize}º
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handleReset} className="text-xs">
          Resetar
        </Button>
      </div>

      {/* Column X positions */}
      <div className="p-4 bg-card border rounded-xl space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Posição X das Colunas (mm)</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {COLS.map((col, i) => (
            <div key={col} className="space-y-1 text-center">
              <div
                className={cn(
                  "text-xs font-black py-1 rounded",
                  "bg-foreground text-background"
                )}
              >
                {col}
              </div>
              <Input
                type="number"
                min={0}
                max={200}
                step={1}
                value={current.colX[i]}
                onChange={(e) => updateColX(i, Number(e.target.value))}
                className="h-8 text-sm px-2 text-center"
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Distância em mm a partir da margem esquerda da página para cada coluna de números</p>
      </div>

      {/* Row Y positions */}
      <div className="p-4 bg-card border rounded-xl space-y-3">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Posição Y das Linhas (mm)</span>
        <div className="grid grid-cols-2 gap-3">
          {ROWS.map((row, i) => (
            <NumInput
              key={row}
              label={row}
              value={current.rowY[i]}
              onChange={(v) => updateRowY(i, v)}
              min={0}
              max={290}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Posição vertical em mm (do topo da página) de cada linha de números</p>
      </div>

      {/* Font size + color */}
      <div className="p-4 bg-card border rounded-xl space-y-3">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Aparência dos Números</span>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Tamanho da fonte (pt)</Label>
            <Input
              type="number"
              min={6}
              max={40}
              value={current.fontSize}
              onChange={(e) => updateCurrent({ ...current, fontSize: Number(e.target.value) })}
              className="h-8 text-sm px-2"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Cor dos números</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={current.color}
                onChange={(e) => updateCurrent({ ...current, color: e.target.value })}
                className="w-10 h-8 rounded cursor-pointer border border-input"
              />
              <Input
                value={current.color}
                onChange={(e) => updateCurrent({ ...current, color: e.target.value })}
                className="h-8 text-sm font-mono"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Visual reference guide */}
      <div className="p-3 bg-muted/50 rounded-xl border border-dashed">
        <p className="text-[11px] text-muted-foreground font-medium mb-2">Guia de referência (posição dos números no PDF):</p>
        <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
          {COLS.map((col, ci) => (
            <div key={col}>
              <div className="font-bold bg-foreground text-background rounded py-0.5 mb-1">{col} ({current.colX[ci]}mm)</div>
              {ROWS.map((_, ri) => (
                <div key={ri} className="bg-card border rounded py-0.5 mb-0.5 text-muted-foreground">
                  Y:{current.rowY[ri]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
