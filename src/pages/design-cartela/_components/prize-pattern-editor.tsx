/**
 * PrizePatternEditor
 *
 * Allows the admin to define which cells on the 5×4 bingo grid must be marked
 * to win each prize. Cells can be toggled by clicking or drag-painting.
 *
 * Preset helpers: Line (row), Column, Diagonal, Full card, etc.
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import {
  Trash2,
  Plus,
  RotateCcw,
  ArrowRight,
  ArrowDown,
  MoveUpRight,
  MoveDownRight,
  LayoutGrid,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const LETTERS = ["S", "O", "R", "T", "E"];
const COLS = 5;
const ROWS = 4;

// A pattern is a flat array of 20 booleans (col-major: [col0row0, col0row1, ..., col4row3])
export type PatternCell = boolean;
export type Pattern = PatternCell[]; // length = COLS * ROWS = 20

export type PrizePattern = {
  id: string;
  name: string;
  color: string;
  cells: Pattern; // 20 booleans
};

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
];

function emptyPattern(): Pattern {
  return Array<boolean>(COLS * ROWS).fill(false);
}

function cellIndex(col: number, row: number): number {
  return col * ROWS + row;
}

// ── Preset generators ──────────────────────────────────────────────────────
const PRESETS: { label: string; icon: React.ReactNode; fn: () => Pattern }[] = [
  {
    label: "Linha 1",
    icon: <ArrowRight className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let c = 0; c < COLS; c++) p[cellIndex(c, 0)] = true;
      return p;
    },
  },
  {
    label: "Linha 2",
    icon: <ArrowRight className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let c = 0; c < COLS; c++) p[cellIndex(c, 1)] = true;
      return p;
    },
  },
  {
    label: "Linha 3",
    icon: <ArrowRight className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let c = 0; c < COLS; c++) p[cellIndex(c, 2)] = true;
      return p;
    },
  },
  {
    label: "Linha 4",
    icon: <ArrowRight className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let c = 0; c < COLS; c++) p[cellIndex(c, 3)] = true;
      return p;
    },
  },
  {
    label: "Col. S",
    icon: <ArrowDown className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let r = 0; r < ROWS; r++) p[cellIndex(0, r)] = true;
      return p;
    },
  },
  {
    label: "Col. O",
    icon: <ArrowDown className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let r = 0; r < ROWS; r++) p[cellIndex(1, r)] = true;
      return p;
    },
  },
  {
    label: "Col. R",
    icon: <ArrowDown className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let r = 0; r < ROWS; r++) p[cellIndex(2, r)] = true;
      return p;
    },
  },
  {
    label: "Col. T",
    icon: <ArrowDown className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let r = 0; r < ROWS; r++) p[cellIndex(3, r)] = true;
      return p;
    },
  },
  {
    label: "Col. E",
    icon: <ArrowDown className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      for (let r = 0; r < ROWS; r++) p[cellIndex(4, r)] = true;
      return p;
    },
  },
  {
    label: "Diag. ↘",
    icon: <MoveDownRight className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      // 5 cols, 4 rows – best diagonal hits cols 0-3 on rows 0-3 and col4 on row3
      [0, 1, 2, 3].forEach((i) => (p[cellIndex(i, i > 3 ? 3 : i)] = true));
      p[cellIndex(4, 3)] = true;
      return p;
    },
  },
  {
    label: "Diag. ↗",
    icon: <MoveUpRight className="w-3 h-3" />,
    fn: () => {
      const p = emptyPattern();
      [0, 1, 2, 3, 4].forEach((c) => {
        const r = Math.min(ROWS - 1, c);
        p[cellIndex(c, ROWS - 1 - r)] = true;
      });
      return p;
    },
  },
  {
    label: "Cartela cheia",
    icon: <LayoutGrid className="w-3 h-3" />,
    fn: () => Array<boolean>(COLS * ROWS).fill(true),
  },
];

// ── Single mini grid ────────────────────────────────────────────────────────
function MiniGrid({
  cells,
  color,
  interactive,
  onToggle,
  onDragPaint,
}: {
  cells: Pattern;
  color: string;
  interactive: boolean;
  onToggle?: (col: number, row: number) => void;
  onDragPaint?: (col: number, row: number) => void;
}) {
  const isPainting = useRef(false);
  const paintValueRef = useRef<boolean>(false);

  const handleMouseDown = (col: number, row: number) => {
    if (!interactive || !onToggle) return;
    isPainting.current = true;
    const idx = cellIndex(col, row);
    paintValueRef.current = !cells[idx];
    onToggle(col, row);
  };

  const handleMouseEnter = (col: number, row: number) => {
    if (!isPainting.current || !onDragPaint) return;
    onDragPaint(col, row);
  };

  const handleMouseUp = () => {
    isPainting.current = false;
  };

  return (
    <div
      className="inline-grid select-none border rounded overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        borderColor: color,
        borderWidth: 2,
        userSelect: "none",
      }}
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
    >
      {/* Header */}
      {LETTERS.map((l) => (
        <div
          key={l}
          className="flex items-center justify-center text-[10px] font-black h-5 text-white"
          style={{ background: color }}
        >
          {l}
        </div>
      ))}
      {/* Cells row by row */}
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => {
          const idx = cellIndex(col, row);
          const active = cells[idx];
          return (
            <div
              key={`${col}-${row}`}
              className={cn(
                "flex items-center justify-center text-[9px] font-bold h-5 border cursor-pointer transition-colors",
                interactive && "hover:opacity-80"
              )}
              style={{
                background: active ? color : "#f9fafb",
                color: active ? "#fff" : "#374151",
                borderColor: "#e5e7eb",
                minWidth: 22,
              }}
              onMouseDown={() => handleMouseDown(col, row)}
              onMouseEnter={() => handleMouseEnter(col, row)}
            >
              {active ? "●" : "○"}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main editor ─────────────────────────────────────────────────────────────
export default function PrizePatternEditor({
  patterns,
  onChange,
}: {
  patterns: PrizePattern[];
  onChange: (patterns: PrizePattern[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    patterns[0]?.id ?? null
  );

  const selected = patterns.find((p) => p.id === selectedId) ?? null;

  const addPrize = () => {
    const colorIdx = patterns.length % COLORS.length;
    const newPrize: PrizePattern = {
      id: crypto.randomUUID(),
      name: `Prêmio ${patterns.length + 1}`,
      color: COLORS[colorIdx],
      cells: emptyPattern(),
    };
    const next = [...patterns, newPrize];
    onChange(next);
    setSelectedId(newPrize.id);
  };

  const removePrize = (id: string) => {
    const next = patterns.filter((p) => p.id !== id);
    onChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  };

  const duplicatePrize = (id: string) => {
    const src = patterns.find((p) => p.id === id);
    if (!src) return;
    const colorIdx = patterns.length % COLORS.length;
    const dup: PrizePattern = {
      ...src,
      id: crypto.randomUUID(),
      name: src.name + " (cópia)",
      color: COLORS[colorIdx],
    };
    const idx = patterns.findIndex((p) => p.id === id);
    const next = [...patterns];
    next.splice(idx + 1, 0, dup);
    onChange(next);
    setSelectedId(dup.id);
  };

  const movePrize = (id: string, dir: -1 | 1) => {
    const idx = patterns.findIndex((p) => p.id === id);
    const next = [...patterns];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const updateSelected = useCallback(
    (patch: Partial<PrizePattern>) => {
      onChange(
        patterns.map((p) => (p.id === selectedId ? { ...p, ...patch } : p))
      );
    },
    [patterns, selectedId, onChange]
  );

  const toggleCell = useCallback(
    (col: number, row: number) => {
      if (!selected) return;
      const cells = [...selected.cells];
      const idx = cellIndex(col, row);
      cells[idx] = !cells[idx];
      updateSelected({ cells });
    },
    [selected, updateSelected]
  );

  const paintCell = useCallback(
    (col: number, row: number) => {
      if (!selected) return;
      const cells = [...selected.cells];
      const idx = cellIndex(col, row);
      // Always set to true when drag-painting (paint mode)
      cells[idx] = true;
      updateSelected({ cells });
    },
    [selected, updateSelected]
  );

  const applyPreset = (fn: () => Pattern) => {
    if (!selected) return;
    updateSelected({ cells: fn() });
  };

  const clearCells = () => {
    if (!selected) return;
    updateSelected({ cells: emptyPattern() });
  };

  return (
    <div className="space-y-4">
      {/* Prize list */}
      <div className="flex items-center justify-between">
        <Label className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
          Prêmios configurados
        </Label>
        <Button size="sm" onClick={addPrize} className="gap-1 h-7 text-xs">
          <Plus className="w-3 h-3" /> Adicionar prêmio
        </Button>
      </div>

      {patterns.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
          Nenhum prêmio. Clique em "Adicionar prêmio" para começar.
        </p>
      )}

      <div className="space-y-2">
        {patterns.map((p, idx) => (
          <div
            key={p.id}
            onClick={() => setSelectedId(p.id)}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors",
              selectedId === p.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
          >
            {/* Color dot */}
            <div
              className="w-4 h-4 rounded-full shrink-0 border-2 border-white shadow"
              style={{ background: p.color }}
            />
            {/* Name */}
            <span className="flex-1 font-medium text-sm truncate">{p.name}</span>
            {/* Mini preview */}
            <div className="shrink-0 scale-75 origin-right">
              <MiniGrid
                cells={p.cells}
                color={p.color}
                interactive={false}
              />
            </div>
            {/* Active count */}
            <Badge variant="outline" className="text-[10px] h-5 shrink-0">
              {p.cells.filter(Boolean).length} células
            </Badge>
            {/* Controls */}
            <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                className="p-1 hover:bg-muted rounded"
                onClick={() => movePrize(p.id, -1)}
                disabled={idx === 0}
                title="Mover para cima"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                className="p-1 hover:bg-muted rounded"
                onClick={() => movePrize(p.id, 1)}
                disabled={idx === patterns.length - 1}
                title="Mover para baixo"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                className="p-1 hover:bg-muted rounded"
                onClick={() => duplicatePrize(p.id)}
                title="Duplicar"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                className="p-1 hover:bg-red-100 text-red-500 rounded"
                onClick={() => removePrize(p.id)}
                title="Remover"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor for selected prize */}
      {selected && (
        <div className="border rounded-xl p-4 space-y-4 bg-card">
          <h4 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
            Editando: <span style={{ color: selected.color }}>{selected.name}</span>
          </h4>

          {/* Name + color */}
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nome do prêmio</Label>
              <Input
                value={selected.name}
                onChange={(e) => updateSelected({ name: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cor</Label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateSelected({ color: e.target.value })}
                  className="w-9 h-8 rounded border border-input cursor-pointer p-0.5 bg-background"
                />
                <div className="flex gap-1 flex-wrap w-32">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      className="w-4 h-4 rounded-full border-2 border-white shadow hover:scale-110 transition-transform"
                      style={{ background: c, outline: selected.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                      onClick={() => updateSelected({ color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preset buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Atalhos rápidos</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((pr) => (
                <button
                  key={pr.label}
                  onClick={() => applyPreset(pr.fn)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded border border-border hover:bg-muted transition-colors"
                >
                  {pr.icon}
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Grade — clique ou arraste para marcar/desmarcar
              </Label>
              <button
                onClick={clearCells}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3 h-3" /> Limpar
              </button>
            </div>

            {/* Big interactive grid */}
            <div
              className="inline-grid select-none border-2 rounded overflow-hidden shadow-sm"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                borderColor: selected.color,
              }}
              onMouseLeave={() => {/* handled inside MiniGrid */}}
            >
              {/* Header row */}
              {LETTERS.map((l) => (
                <div
                  key={l}
                  className="flex items-center justify-center text-sm font-black h-8 text-white"
                  style={{ background: selected.color, minWidth: 46 }}
                >
                  {l}
                </div>
              ))}
              {/* Data cells */}
              <InteractiveCells
                cells={selected.cells}
                color={selected.color}
                onToggle={toggleCell}
                onDragPaint={paintCell}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Separate component to avoid re-renders on every cell ────────────────────
function InteractiveCells({
  cells,
  color,
  onToggle,
  onDragPaint,
}: {
  cells: Pattern;
  color: string;
  onToggle: (col: number, row: number) => void;
  onDragPaint: (col: number, row: number) => void;
}) {
  const isPainting = useRef(false);
  const paintValue = useRef<boolean>(true);

  const handleMouseDown = (col: number, row: number) => {
    isPainting.current = true;
    const idx = cellIndex(col, row);
    paintValue.current = !cells[idx];
    onToggle(col, row);
  };

  const handleMouseEnter = (col: number, row: number) => {
    if (!isPainting.current) return;
    const idx = cellIndex(col, row);
    if (cells[idx] !== paintValue.current) {
      onDragPaint(col, row);
    }
  };

  const handleMouseUp = () => {
    isPainting.current = false;
  };

  return (
    <>
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => {
          const idx = cellIndex(col, row);
          const active = cells[idx];
          return (
            <div
              key={`${col}-${row}`}
              className="flex items-center justify-center font-bold h-10 border cursor-pointer transition-colors select-none"
              style={{
                background: active ? color : "#f9fafb",
                color: active ? "#fff" : "#6b7280",
                borderColor: "#e5e7eb",
                minWidth: 46,
                fontSize: 18,
              }}
              onMouseDown={() => handleMouseDown(col, row)}
              onMouseEnter={() => handleMouseEnter(col, row)}
              onMouseUp={handleMouseUp}
            >
              {active ? "●" : "○"}
            </div>
          );
        })
      )}
    </>
  );
}
