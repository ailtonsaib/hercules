import { extractGrid, SORTE_LETTERS } from "../_lib/bingo-utils.ts";
import type { CardData, EventData } from "../_lib/bingo-utils.ts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import QRCode from "qrcode";

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 10;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── PrizeNumberLayout: free-form coordinate positioning ─────────────────────
type PrizeNumberLayout = {
  prizeIndex: number;
  colX: [number, number, number, number, number];
  rowY: [number, number, number, number];
  fontSize: number;
  color: string;
};

function parsePrizeNumberLayouts(json: string | undefined): PrizeNumberLayout[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as PrizeNumberLayout[];
  } catch {
    return [];
  }
}

/**
 * Draw grid numbers at absolute X/Y coordinates defined in the layout.
 * No background cells — numbers are placed freely on the page.
 */
function drawFreeNumbers(
  doc: jsPDF,
  numbers: number[],
  chance: 0 | 1 | 2,
  layout: PrizeNumberLayout
): void {
  const grid = extractGrid(numbers, chance);
  const [r, g, b] = hexToRgb(layout.color ?? "#000000");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(layout.fontSize ?? 14);
  doc.setTextColor(r, g, b);

  for (let col = 0; col < 5; col++) {
    const px = layout.colX[col];
    // Column header letter
    doc.text(SORTE_LETTERS[col], px, layout.rowY[0] - (layout.fontSize ?? 14) * 0.5, { align: "center" });
    for (let row = 0; row < 4; row++) {
      const py = layout.rowY[row];
      const val = grid[col][row].toString().padStart(2, "0");
      doc.text(val, px, py, { align: "center" });
    }
  }
}

// ── Template settings (from design editor) ──────────────────────────────────
export type CardTemplate = {
  headerTitle?: string;
  headerSubtitle?: string;
  headerSubtitle2?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  headerLogoUrl?: string;
  headerHeight?: number;
  gridHeaderBgColor?: string;
  gridHeaderTextColor?: string;
  gridCellBgColor?: string;
  gridCellTextColor?: string;
  gridFontSize?: number;
  gridBorderColor?: string;
  gridBorderWidth?: number;
  gridCellHeight?: number;
  gridAltRowEnabled?: boolean;
  gridAltRowColor?: string;
  footerText?: string;
  footerBgColor?: string;
  footerTextColor?: string;
  footerHeight?: number;
  bgColor?: string;
  bgImageUrl?: string;
  bgOpacity?: number;
  qrCodeEnabled?: boolean;
  qrCodeUrl?: string;
  qrCodeX?: number;       // mm from left content edge
  qrCodeY?: number;       // mm from top of card
  qrCodeSize?: number;    // mm
  // "none" = default position below grids, "inline-N" = replaces grid slot N in chance section 1
  qrCodeSlot?: "none" | "inline-1" | "inline-2" | "inline-3";
  // Grid positions (mm from page content edge; undefined = auto flow)
  grid1X?: number;
  grid1Y?: number;
  grid2X?: number;
  grid2Y?: number;
  grid3X?: number;
  grid3Y?: number;
  // Show prize descriptions below each grid
  showPrizesBelow?: boolean;
  // Free-form number positioning per prize/chance (JSON-serialized PrizeNumberLayout[])
  prizeNumberLayoutsJson?: string;
};

// Convert hex "#rrggbb" to [r, g, b]
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
}

function drawGrid(
  doc: jsPDF,
  numbers: number[],
  chance: 0 | 1 | 2,
  startX: number,
  startY: number,
  gridW: number,
  tpl: CardTemplate
): number {
  const grid = extractGrid(numbers, chance);
  const colW = gridW / 5;
  // Larger default font for better readability
  const fontSize = tpl.gridFontSize ?? Math.max(7, Math.min(13, Math.round(gridW * 0.21)));
  const headerH = tpl.gridCellHeight ?? Math.max(6, fontSize * 0.85);
  const cellH = tpl.gridCellHeight ?? Math.max(6, fontSize * 0.85);
  const borderColor = tpl.gridBorderColor ?? "#cccccc";
  const borderWidth = tpl.gridBorderWidth ?? 0.25;
  const altEnabled = tpl.gridAltRowEnabled ?? true;
  const altColor = tpl.gridAltRowColor ?? "#f0f4ff";

  const [hbr, hbg, hbb] = hexToRgb(tpl.gridHeaderBgColor ?? "#1e1b4b");
  const [htr, htg, htb] = hexToRgb(tpl.gridHeaderTextColor ?? "#ffffff");
  const [cbr, cbg, cbb] = hexToRgb(tpl.gridCellBgColor ?? "#ffffff");
  const [ctr, ctg, ctb] = hexToRgb(tpl.gridCellTextColor ?? "#111111");
  const [bdr, bdg, bdb] = hexToRgb(borderColor);
  const [ar, ag, ab] = hexToRgb(altColor);

  const cellRadius = 1.2;

  // Rounded outer border
  doc.setDrawColor(180, 180, 200);
  doc.setLineWidth(0.6);
  doc.roundedRect(startX, startY, gridW, headerH + 4 * cellH, 2, 2);

  // Header row — gradient-like dark band
  for (let col = 0; col < 5; col++) {
    const x = startX + col * colW;
    doc.setFillColor(hbr, hbg, hbb);
    // Round top-left only for first col, top-right only for last col
    if (col === 0) {
      doc.roundedRect(x, startY, colW, headerH, 2, 2, "F");
      doc.rect(x + colW - 2, startY, 2, headerH, "F"); // fill right corner square
      doc.rect(x, startY + headerH - 2, colW, 2, "F"); // fill bottom
    } else if (col === 4) {
      doc.roundedRect(x, startY, colW, headerH, 2, 2, "F");
      doc.rect(x, startY, 2, headerH, "F"); // fill left corner square
      doc.rect(x, startY + headerH - 2, colW, 2, "F"); // fill bottom
    } else {
      doc.rect(x, startY, colW, headerH, "F");
    }
    doc.setTextColor(htr, htg, htb);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize + 1);
    doc.text(SORTE_LETTERS[col], x + colW / 2, startY + headerH - 1.8, { align: "center" });
  }

  // Data rows
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  for (let row = 0; row < 4; row++) {
    const isAlt = altEnabled && row % 2 === 1;
    const isLastRow = row === 3;
    for (let col = 0; col < 5; col++) {
      const x = startX + col * colW;
      const y = startY + headerH + row * cellH;
      doc.setFillColor(isAlt ? ar : cbr, isAlt ? ag : cbg, isAlt ? ab : cbb);
      // Apply rounded corners only to bottom-left and bottom-right cells
      if (isLastRow && col === 0) {
        doc.roundedRect(x, y, colW, cellH, 2, 2, "F");
        doc.rect(x + colW - 2, y, 2, cellH, "F");
        doc.rect(x, y, colW, 2, "F");
      } else if (isLastRow && col === 4) {
        doc.roundedRect(x, y, colW, cellH, 2, 2, "F");
        doc.rect(x, y, 2, cellH, "F");
        doc.rect(x, y, colW, 2, "F");
      } else {
        doc.rect(x, y, colW, cellH, "F");
      }
      doc.setDrawColor(bdr, bdg, bdb);
      doc.setLineWidth(borderWidth);
      // Draw individual cell border with slight radius
      doc.roundedRect(x, y, colW, cellH, cellRadius, cellRadius);
      doc.setTextColor(ctr, ctg, ctb);
      const val = grid[col][row].toString().padStart(2, "0");
      doc.text(val, x + colW / 2, y + cellH - 1.8, { align: "center" });
    }
  }

  return headerH + 4 * cellH;
}

function drawChanceSection(
  doc: jsPDF,
  numbers: number[],
  chance: 0 | 1 | 2,
  sectionLabel: string,
  prizes: { position: number; description: string }[],
  startX: number,
  startY: number,
  numChances: number,
  tpl: CardTemplate,
  inlineQrSlot?: number,
  inlineQrDataUrl?: string | null,
): number {
  let y = startY;
  const gridGap = 3;
  const perRow = numChances <= 2 ? 3 : 5;
  const count = Math.max(prizes.length, perRow);
  const gridW = (CONTENT_W - gridGap * (perRow - 1)) / perRow;

  // Section label bar — colored accent per chance
  const sectionColors: [number, number, number][] = [
    [30, 27, 75],   // chance 1: deep navy
    [109, 40, 217], // chance 2: violet
    [124, 58, 237], // chance 3: purple
  ];
  const [sbr, sbg, sbb] = sectionColors[chance] ?? sectionColors[0];
  doc.setFillColor(sbr, sbg, sbb);
  doc.rect(startX, y, CONTENT_W, 8, "F");
  // Accent strip on left
  doc.setFillColor(250, 204, 21); // yellow accent
  doc.rect(startX, y, 3, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(sectionLabel, startX + CONTENT_W / 2, y + 5.5, { align: "center" });
  y += 10;

  const prizeRows: { position: number; description: string }[][] = [];
  for (let i = 0; i < prizes.length; i += perRow) {
    prizeRows.push(prizes.slice(i, i + perRow));
  }
  if (prizeRows.length === 0) prizeRows.push([]);

  let totalGridHeight = 0;
  for (let rowIdx = 0; rowIdx < prizeRows.length; rowIdx++) {
    const rowPrizes = prizeRows[rowIdx];
    let gridHeight = 0;
    for (let i = 0; i < perRow; i++) {
      const gx = startX + (gridW + gridGap) * i;
      if (rowIdx === 0 && inlineQrSlot === i) {
        if (inlineQrDataUrl) {
          const measured = drawGrid(doc, numbers, chance, gx, y, gridW, tpl);
          gridHeight = Math.max(gridHeight, measured);
        }
        continue;
      }
      if (rowPrizes[i]) {
        const h = drawGrid(doc, numbers, chance, gx, y, gridW, tpl);
        gridHeight = Math.max(gridHeight, h);
      }
    }

    if (gridHeight === 0) {
      const fontSize = tpl.gridFontSize ?? Math.max(7, Math.min(13, Math.round(gridW * 0.21)));
      const cellH = tpl.gridCellHeight ?? Math.max(6, fontSize * 0.85);
      const headerH = tpl.gridCellHeight ?? Math.max(6, fontSize * 0.85);
      gridHeight = headerH + 4 * cellH;
    }

    // Draw inline QR after grids
    if (rowIdx === 0 && inlineQrSlot !== undefined && inlineQrDataUrl) {
      const qx = startX + (gridW + gridGap) * inlineQrSlot;
      const padding = 2;
      const qrSize = Math.min(gridW - padding * 2, gridHeight - padding * 2);
      doc.addImage(
        inlineQrDataUrl, "PNG",
        qx + (gridW - qrSize) / 2,
        y + (gridHeight - qrSize) / 2,
        qrSize, qrSize
      );
    }

    y += gridHeight;
    totalGridHeight += gridHeight;

    // Prize labels below grids
    const labelFontSize = numChances <= 2 ? 7 : 6.5;
    let labelMaxH = 6;

    if (tpl.showPrizesBelow) {
      // Prize badge per grid
      const medalColors: Record<number, [number, number, number]> = {
        1: [234, 179, 8],   // gold
        2: [156, 163, 175], // silver
        3: [180, 83, 9],    // bronze
      };
      for (let i = 0; i < perRow; i++) {
        if (rowIdx === 0 && inlineQrSlot === i) continue;
        const prize = rowPrizes[i];
        if (!prize) continue;
        const px = startX + (gridW + gridGap) * i;
        const prizeLine = `${prize.position}º) ${prize.description}`;
        const lines = doc.splitTextToSize(prizeLine, gridW - 4) as string[];
        const lineH = labelFontSize * 0.42 + 1;
        const bandH = lines.length * lineH + 3;
        labelMaxH = Math.max(labelMaxH, bandH + 1);

        // Colored band based on position
        const [mr, mg, mb] = medalColors[prize.position] ?? [109, 40, 217];
        doc.setFillColor(mr, mg, mb);
        doc.rect(px, y, gridW, 2, "F"); // top color strip
        doc.setFillColor(245, 243, 255);
        doc.rect(px, y + 2, gridW, bandH - 2, "F");
        doc.setDrawColor(mr, mg, mb);
        doc.setLineWidth(0.3);
        doc.rect(px, y, gridW, bandH);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(labelFontSize);
        doc.setTextColor(30, 20, 60);
        let ly = y + 2 + labelFontSize * 0.38 + 1;
        for (const line of lines) {
          doc.text(line, px + gridW / 2, ly, { align: "center" });
          ly += lineH;
        }
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(labelFontSize);
      doc.setTextColor(30, 20, 60);
      for (let i = 0; i < rowPrizes.length; i++) {
        if (rowIdx === 0 && inlineQrSlot === i) continue;
        const prize = rowPrizes[i];
        if (!prize) continue;
        const px = startX + (gridW + gridGap) * i;
        const label = doc.splitTextToSize(`${prize.position}º) ${prize.description}`, gridW);
        doc.text(label[0] as string, px, y + 4.5);
      }
    }

    const labelH = tpl.showPrizesBelow ? labelMaxH + 1 : 6;
    y += labelH + (rowIdx < prizeRows.length - 1 ? 3 : 0);
    totalGridHeight += labelH + (rowIdx < prizeRows.length - 1 ? 3 : 0);
  }

  void count;
  return 10 + totalGridHeight;
}

function measureChanceSection(
  prizes: { position: number; description: string }[],
  numChances: number,
  tpl: CardTemplate
): number {
  const gridGap = 3;
  const perRow = numChances <= 2 ? 3 : 5;
  const gridW = (CONTENT_W - gridGap * (perRow - 1)) / perRow;
  const fontSize = tpl.gridFontSize ?? Math.max(7, Math.min(13, Math.round(gridW * 0.21)));
  const cellH = tpl.gridCellHeight ?? Math.max(6, fontSize * 0.85);
  const headerH = tpl.gridCellHeight ?? Math.max(6, fontSize * 0.85);
  const gridHeight = headerH + 4 * cellH;
  const labelFontSize = numChances <= 2 ? 7 : 6.5;
  const labelH = tpl.showPrizesBelow ? (labelFontSize * 0.42 + 1) * 2 + 4 : 6;

  const prizeRows: { position: number; description: string }[][] = [];
  for (let i = 0; i < prizes.length; i += perRow) {
    prizeRows.push(prizes.slice(i, i + perRow));
  }
  if (prizeRows.length === 0) prizeRows.push([]);

  let total = 10; // section header
  for (let rowIdx = 0; rowIdx < prizeRows.length; rowIdx++) {
    total += gridHeight;
    total += labelH;
    if (rowIdx < prizeRows.length - 1) total += 3;
  }
  return total;
}

export async function generateCardsPDF(
  cards: CardData[],
  event: EventData,
  onProgress?: (done: number, total: number) => void,
  backgroundImage?: string | null,
  regulation?: { title: string; content: string } | null,
  qrCodeText?: string | null,
  template?: CardTemplate | null
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const tpl: CardTemplate = template ?? {};

  // Background image: prefer template, then param
  const bgImageUrl = tpl.bgImageUrl || backgroundImage || null;
  let bgDataUrl: string | null = null;
  if (bgImageUrl) {
    bgDataUrl = await loadImageAsDataUrl(bgImageUrl).catch(() => null);
  }

  // Logo in header
  let logoDataUrl: string | null = null;
  if (tpl.headerLogoUrl) {
    logoDataUrl = await loadImageAsDataUrl(tpl.headerLogoUrl).catch(() => null);
  }

  // QR code: prefer template setting, then param
  const qrEnabled = tpl.qrCodeEnabled ?? false;
  const qrText = qrEnabled ? (tpl.qrCodeUrl ?? qrCodeText) : qrCodeText;
  let qrDataUrl: string | null = null;
  if (qrText?.trim()) {
    qrDataUrl = await QRCode.toDataURL(qrText.trim(), { margin: 1, width: 200 }).catch(() => null);
  }

  const dateStr = event.date
    ? format(new Date(event.date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : "";

  const tipo = event.chanceTipo ?? "dupla";
  const numChances = tipo === "unica" ? 1 : tipo === "tripla" ? 3 : 2;
  const chanceLabels = [
    tipo === "unica" ? "S O R T E" : "P R I M E I R A   C H A N C E",
    "S E G U N D A   C H A N C E",
    "T E R C E I R A   C H A N C E",
  ];

  const allPrizes = event.prizes ?? [];

  // Header color from template
  const headerBg = hexToRgb(tpl.headerBgColor ?? "#1a1a2e");
  const headerTxt = hexToRgb(tpl.headerTextColor ?? "#ffffff");
  const headerH = tpl.headerHeight ?? 22;
  const footerH = tpl.footerHeight ?? 16;
  const bgOpacity = tpl.bgOpacity ?? 0.3;

  cards.forEach((card, idx) => {
    if (idx > 0) doc.addPage();
    onProgress?.(idx + 1, cards.length);

    // ── Background ────────────────────────────────────────
    const [bgr, bgg, bgb] = hexToRgb(tpl.bgColor ?? "#f8f7ff");
    doc.setFillColor(bgr, bgg, bgb);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");

    if (bgDataUrl) {
      doc.addImage(bgDataUrl, "JPEG", 0, 0, PAGE_W, PAGE_H);
      doc.setGState(doc.GState({ opacity: 1 - bgOpacity }));
      doc.setFillColor(bgr, bgg, bgb);
      doc.rect(0, 0, PAGE_W, PAGE_H, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
    }

    const x = MARGIN;
    const cardNumStr = String(card.cardNumber).padStart(6, "0");

    // ── Header ────────────────────────────────────────────
    // Main header band
    doc.setFillColor(...headerBg);
    doc.rect(0, 0, PAGE_W, headerH, "F");
    // Bottom accent line
    doc.setFillColor(250, 204, 21);
    doc.rect(0, headerH, PAGE_W, 1.5, "F");

    // Logo
    if (logoDataUrl) {
      const logoSize = headerH * 0.65;
      doc.addImage(logoDataUrl, "PNG", x, (headerH - logoSize) / 2, logoSize, logoSize);
    }

    const titleX = logoDataUrl ? x + headerH * 0.7 : PAGE_W / 2;
    const titleAlign = logoDataUrl ? ("left" as const) : ("center" as const);
    // Auto-fit title font: max width = page - margins - badge - gap
    const titleMaxW = PAGE_W - MARGIN * 2 - 20 - 4 - (logoDataUrl ? headerH * 0.7 : 0);
    const titleText = (tpl.headerTitle ?? event.name).toUpperCase();
    doc.setTextColor(...headerTxt);
    doc.setFont("helvetica", "bold");
    // Start at desired size and shrink until it fits
    let titleFontSize = numChances >= 2 ? 14 : 17;
    doc.setFontSize(titleFontSize);
    while (doc.getTextWidth(titleText) > titleMaxW && titleFontSize > 7) {
      titleFontSize -= 0.5;
      doc.setFontSize(titleFontSize);
    }
    doc.text(
      titleText,
      titleX, headerH * 0.50,
      { align: titleAlign }
    );
    if (tpl.headerSubtitle || tpl.headerSubtitle2) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 215, 255);
      if (tpl.headerSubtitle && tpl.headerSubtitle2) {
        // Two lines: shift both up/down from center
        doc.text(tpl.headerSubtitle, titleX, headerH * 0.70, { align: titleAlign });
        doc.text(tpl.headerSubtitle2, titleX, headerH * 0.84, { align: titleAlign });
      } else {
        const sub = tpl.headerSubtitle ?? tpl.headerSubtitle2 ?? "";
        doc.text(sub, titleX, headerH * 0.76, { align: titleAlign });
      }
    }

    // Card number badge (right side) — reduced to leave more room for title
    const badgeW = 18;
    const badgeH = headerH * 0.55;
    const badgeX = PAGE_W - MARGIN - badgeW;
    const badgeY = (headerH - badgeH) / 2;
    doc.setFillColor(250, 204, 21);
    doc.rect(badgeX, badgeY, badgeW, badgeH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 20, 60);
    doc.text(`Nº ${cardNumStr}`, badgeX + badgeW / 2, badgeY + badgeH * 0.68, { align: "center" });

    let y = headerH + 4;

    // ── Chance sections ────────────────────────────────────
    const stubY = PAGE_H - footerH - 4;
    const availableH = stubY - y - (qrDataUrl ? 36 : 4);

    const sectionHeights = Array.from({ length: numChances }, () =>
      measureChanceSection(allPrizes, numChances, tpl)
    );
    const totalSectionsH = sectionHeights.reduce((a, b) => a + b, 0);
    const totalGap = availableH - totalSectionsH;
    const gapBetween = numChances > 1 ? Math.max(2, totalGap / (numChances - 1)) : 0;

    doc.setTextColor(0, 0, 0);

    // Helper: a position value is only "custom" if it's a valid finite number
    const isValidPos = (v: number | undefined): v is number =>
      typeof v === "number" && isFinite(v) && !isNaN(v);

    // Determine inline QR slot (0-based) for first chance section
    const qrSlotStr = tpl.qrCodeSlot ?? "none";
    const inlineQrSlot: number | undefined =
      qrSlotStr === "inline-1" ? 0
      : qrSlotStr === "inline-2" ? 1
      : qrSlotStr === "inline-3" ? 2
      : undefined;
    const useInlineQr = inlineQrSlot !== undefined && qrDataUrl !== null;

    // Check if any grid has custom positions defined
    const gridPositions = [
      { x: tpl.grid1X, y: tpl.grid1Y },
      { x: tpl.grid2X, y: tpl.grid2Y },
      { x: tpl.grid3X, y: tpl.grid3Y },
    ];
    const hasCustomGridPos = gridPositions.slice(0, numChances).some(
      p => isValidPos(p.x) || isValidPos(p.y)
    );

    if (hasCustomGridPos) {
      // Manual positioning mode
      let autoY = y;
      for (let ci = 0; ci < numChances; ci++) {
        const pos = gridPositions[ci];
        const gx = isValidPos(pos.x) ? MARGIN + pos.x : x;
        const gy = isValidPos(pos.y) ? pos.y : autoY;
        const sectionH = drawChanceSection(
          doc, card.numbers, ci as 0 | 1 | 2, chanceLabels[ci],
          allPrizes, gx, gy, numChances, tpl,
          ci === 0 && useInlineQr ? inlineQrSlot : undefined,
          ci === 0 && useInlineQr ? qrDataUrl : undefined,
        );
        autoY = gy + sectionH + 4;
      }
    } else {
      // Auto-flow mode
      for (let ci = 0; ci < numChances; ci++) {
        drawChanceSection(
          doc, card.numbers, ci as 0 | 1 | 2, chanceLabels[ci],
          allPrizes, x, y, numChances, tpl,
          ci === 0 && useInlineQr ? inlineQrSlot : undefined,
          ci === 0 && useInlineQr ? qrDataUrl : undefined,
        );
        y += sectionHeights[ci] + (ci < numChances - 1 ? gapBetween : 0);
      }
    }

    // ── QR Code (non-inline mode) ──────────────────────────
    if (qrDataUrl && !useInlineQr) {
      const qrSize = (isValidPos(tpl.qrCodeSize) ? tpl.qrCodeSize : null) ?? 28;
      const qrX = isValidPos(tpl.qrCodeX) ? MARGIN + tpl.qrCodeX : PAGE_W / 2 - qrSize / 2;
      const qrY = isValidPos(tpl.qrCodeY) ? tpl.qrCodeY : y + 2;
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    }

    // ── Free-form number positioning (overlaid on top of grids) ───────────────
    if (tpl.prizeNumberLayoutsJson) {
      const layouts = parsePrizeNumberLayouts(tpl.prizeNumberLayoutsJson);
      if (layouts.length > 0) {
        for (let ci = 0; ci < numChances; ci++) {
          // Find layout for this chance index (prize index = chance index)
          const layout = layouts.find((l) => l.prizeIndex === ci);
          if (layout) {
            drawFreeNumbers(doc, card.numbers, ci as 0 | 1 | 2, layout);
          }
        }
      }
    }

    // ── Footer ─────────────────────────────────────────────
    const [fbr, fbg, fbb] = hexToRgb(tpl.footerBgColor ?? "#1e1b4b");
    const [ftr, ftg, ftb] = hexToRgb(tpl.footerTextColor ?? "#ffffff");
    // Top accent line on footer
    doc.setFillColor(250, 204, 21);
    doc.rect(0, PAGE_H - footerH - 1.5, PAGE_W, 1.5, "F");
    doc.setFillColor(fbr, fbg, fbb);
    doc.rect(0, PAGE_H - footerH, PAGE_W, footerH, "F");

    const footerTextY = PAGE_H - footerH + footerH * 0.55;
    const footerText = tpl.footerText ?? "COLABORADOR: ________________________  TEL: (____) _______________";

    doc.setTextColor(ftr, ftg, ftb);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(footerText, MARGIN, footerTextY);

    // Small card number repeated bottom-right for easy identification
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Nº ${cardNumStr}`, PAGE_W - MARGIN, PAGE_H - footerH + footerH * 0.75, { align: "right" });

    // ── Regulation page (after each card) ─────────────────
    if (regulation) {
      doc.addPage();
      drawRegulationPage(doc, regulation.title, regulation.content, bgDataUrl);
    }
  });

  doc.save(`cartelas-${event.name.replace(/\s+/g, "-")}.pdf`);
}

// ── Helper: draw regulation page ────────────────────────────────────────────
function drawRegulationPage(
  doc: jsPDF,
  title: string,
  content: string,
  bgDataUrl: string | null
) {
  if (bgDataUrl) {
    doc.addImage(bgDataUrl, "JPEG", 0, 0, PAGE_W, PAGE_H);
    doc.setGState(doc.GState({ opacity: 0.55 }));
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, PAGE_W, PAGE_H, "F");
    doc.setGState(doc.GState({ opacity: 1 }));
  }

  const REG_MARGIN = 18; // wider margin for regulation page
  const REG_CONTENT_W = PAGE_W - REG_MARGIN * 2;

  const footerY = PAGE_H - REG_MARGIN - 28;
  const contentBottomLimit = footerY - 8;

  let y = REG_MARGIN + 12;

  // Title — bold, centered, wrapped if needed
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(title.toUpperCase(), REG_CONTENT_W) as string[];
  for (const tl of titleLines) {
    doc.text(tl, PAGE_W / 2, y, { align: "center" });
    y += 8;
  }

  // Divider line
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(REG_MARGIN, y, PAGE_W - REG_MARGIN, y);
  y += 10;

  // Body — larger font, justified
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  const lineHeight = 7;

  const lines = content.split("\n");
  for (const rawLine of lines) {
    if (y > contentBottomLimit) break;
    const wrapped = doc.splitTextToSize(rawLine.trim(), REG_CONTENT_W) as string[];
    for (let i = 0; i < wrapped.length; i++) {
      if (y > contentBottomLimit) break;
      doc.text(wrapped[i], REG_MARGIN, y);
      y += lineHeight;
    }
  }

  // Footer
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(REG_MARGIN, footerY - 2, PAGE_W - REG_MARGIN, footerY - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("VENDEDOR:", REG_MARGIN, footerY + 5);
  doc.setFont("helvetica", "normal");
  doc.line(REG_MARGIN + 24, footerY + 5.5, PAGE_W - REG_MARGIN, footerY + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TELEFONE:", REG_MARGIN, footerY + 14);
  doc.setFont("helvetica", "normal");
  doc.text("(____)", REG_MARGIN + 24, footerY + 14);
  doc.line(REG_MARGIN + 38, footerY + 14.5, PAGE_W - REG_MARGIN, footerY + 14.5);
}

// ── Helper: load image as base64 ─────────────────────────────────────────────
function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas context unavailable")); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}
