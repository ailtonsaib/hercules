import type { Doc } from "@/convex/_generated/dataModel.d.ts";

// Column labels and ranges for S-O-R-T-E
export const SORTE_LETTERS = ["S", "O", "R", "T", "E"] as const;
export const SORTE_COLS = [
  { min: 1, max: 15 },
  { min: 16, max: 30 },
  { min: 31, max: 45 },
  { min: 46, max: 60 },
  { min: 61, max: 75 },
];

// Extract one 5×4 grid (col-major) from the flat numbers array
// chance: 0 = primeira, 1 = segunda, 2 = terceira
export function extractGrid(numbers: number[], chance: 0 | 1 | 2): number[][] {
  const offset = chance * 20;
  // Returns [col][row] 5 cols x 4 rows
  return Array.from({ length: 5 }, (_, col) =>
    Array.from({ length: 4 }, (_, row) => numbers[offset + col * 4 + row])
  );
}

export type EventData = Doc<"events">;
export type CardData = Doc<"cards">;
