import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SORTE_LETTERS } from "@/pages/cards/_lib/bingo-utils.ts";

type EventData = {
  name: string;
  date?: string;
  time?: string;
  location?: string;
  address?: string;
  city?: string;
  phone?: string;
  description?: string;
  totalCards: number;
  cardPrice?: number;
  prizes?: { position: number; description: string }[];
  status: string;
};

type SalesSummary = {
  total: number;
  assigned: number;
  unassigned: number;
  paid: number;
  unpaid: number;
};

type Award = {
  prizePosition: number;
  prizeDescription: string;
  winnerCardNumber: number;
  winnerName?: string;
  awardedAt: string;
};

type DrawData = {
  drawnNumbers: number[];
};

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Color constants ────────────────────────────────────────────────────────
const PURPLE = [100, 60, 180] as const;
const ORANGE = [230, 100, 20] as const;
const DARK = [30, 30, 30] as const;
const LIGHT_BG = [248, 246, 255] as const;
const YELLOW = [255, 200, 0] as const;

function setFill(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setDraw(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setTextC(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

export function generateEventReport(
  event: EventData,
  summary: SalesSummary,
  awards: Award[],
  drawData: DrawData | null | undefined
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  // ── Header banner ──────────────────────────────────────────────────────────
  setFill(doc, PURPLE);
  doc.rect(0, 0, PAGE_W, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setTextC(doc, [255, 255, 255]);
  doc.text("RELATÓRIO DO EVENTO", PAGE_W / 2, 13, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(event.name, PAGE_W / 2, 22, { align: "center" });

  if (event.date) {
    const dateStr = format(new Date(event.date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    doc.setFontSize(9);
    doc.text(dateStr + (event.time ? ` às ${event.time}` : ""), PAGE_W / 2, 29, { align: "center" });
  }

  y = 40;

  // ── Event info section ─────────────────────────────────────────────────────
  sectionTitle(doc, y, "INFORMAÇÕES DO EVENTO");
  y += 7;

  const infoRows: [string, string][] = [];
  if (event.location) infoRows.push(["Local", event.location]);
  if (event.address) infoRows.push(["Endereço", event.address]);
  if (event.city) infoRows.push(["Cidade", event.city]);
  if (event.phone) infoRows.push(["Telefone", event.phone]);
  if (event.description) infoRows.push(["Descrição", event.description]);
  const statusMap: Record<string, string> = { open: "Aberto", in_progress: "Em Andamento", finished: "Encerrado" };
  infoRows.push(["Status", statusMap[event.status] ?? event.status]);
  infoRows.push(["Total de Cartelas", event.totalCards.toLocaleString("pt-BR")]);
  if (event.cardPrice !== undefined) infoRows.push(["Preço da Cartela", `R$ ${event.cardPrice.toFixed(2).replace(".", ",")}`]);

  for (const [label, value] of infoRows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setTextC(doc, DARK);
    doc.text(label + ":", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, MARGIN + 40, y);
    y += 5.5;
  }

  y += 4;

  // ── Sales summary ──────────────────────────────────────────────────────────
  sectionTitle(doc, y, "RESUMO DE VENDAS");
  y += 7;

  const revenue = event.cardPrice !== undefined ? summary.paid * event.cardPrice : null;

  const cols = [
    { label: "Total", value: summary.total.toLocaleString("pt-BR") },
    { label: "Vendidas", value: summary.assigned.toLocaleString("pt-BR") },
    { label: "Disponíveis", value: summary.unassigned.toLocaleString("pt-BR") },
    { label: "Pagas", value: summary.paid.toLocaleString("pt-BR") },
    { label: "A Receber", value: summary.unpaid.toLocaleString("pt-BR") },
    ...(revenue !== null ? [{ label: "Receita Total", value: `R$ ${revenue.toFixed(2).replace(".", ",")}` }] : []),
  ];

  const colW = CONTENT_W / Math.min(cols.length, 4);
  const boxH = 16;
  let bx = MARGIN;
  let by = y;
  cols.forEach((c, i) => {
    if (i > 0 && i % 4 === 0) { bx = MARGIN; by += boxH + 3; }
    const x = bx + (i % 4) * colW;
    setFill(doc, LIGHT_BG);
    setDraw(doc, [210, 200, 240]);
    doc.roundedRect(x, by, colW - 2, boxH, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setTextC(doc, PURPLE);
    doc.text(c.value, x + (colW - 2) / 2, by + 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setTextC(doc, [100, 100, 120]);
    doc.text(c.label, x + (colW - 2) / 2, by + 14, { align: "center" });
  });

  const rowsUsed = Math.ceil(cols.length / 4);
  y = by + rowsUsed * (boxH + 3) + 4;

  // ── Prize winners ──────────────────────────────────────────────────────────
  if ((event.prizes?.length ?? 0) > 0) {
    y = checkPageBreak(doc, y, 12);
    sectionTitle(doc, y, "PRÊMIOS E VENCEDORES");
    y += 7;

    const prizes = event.prizes ?? [];
    for (const prize of prizes) {
      y = checkPageBreak(doc, y, 14);
      const awarded = awards.find((a) => a.prizePosition === prize.position);

      setFill(doc, awarded ? YELLOW : [240, 240, 240]);
      setDraw(doc, awarded ? [210, 170, 0] : [210, 210, 210]);
      doc.roundedRect(MARGIN, y, CONTENT_W, 11, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setTextC(doc, DARK);
      doc.text(`${prize.position}º — ${prize.description}`, MARGIN + 3, y + 7.2);

      if (awarded) {
        const winStr = `Cartela #${String(awarded.winnerCardNumber).padStart(6, "0")}${awarded.winnerName ? ` · ${awarded.winnerName}` : ""}`;
        doc.setFont("helvetica", "normal");
        setTextC(doc, [80, 50, 0]);
        doc.text(winStr, MARGIN + CONTENT_W - 3, y + 7.2, { align: "right" });
      } else {
        doc.setFont("helvetica", "italic");
        setTextC(doc, [140, 140, 140]);
        doc.text("Aguardando vencedor", MARGIN + CONTENT_W - 3, y + 7.2, { align: "right" });
      }

      y += 13;
    }

    y += 2;
  }

  // ── Draw order ─────────────────────────────────────────────────────────────
  if (drawData && drawData.drawnNumbers.length > 0) {
    y = checkPageBreak(doc, y, 16);
    sectionTitle(doc, y, `ORDEM DO SORTEIO (${drawData.drawnNumbers.length} números)`);
    y += 8;

    // Column headers (S O R T E)
    const numColW = CONTENT_W / 5;
    for (let col = 0; col < 5; col++) {
      const x = MARGIN + col * numColW;
      setFill(doc, DARK);
      doc.rect(x, y, numColW, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setTextC(doc, [255, 255, 255]);
      doc.text(SORTE_LETTERS[col], x + numColW / 2, y + 5.2, { align: "center" });
    }
    y += 7;

    // Group drawn numbers by column
    const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
    const byCol: number[][] = ranges.map(([lo, hi]) =>
      drawData.drawnNumbers.filter((n) => n >= lo && n <= hi)
    );
    const maxRows = Math.max(...byCol.map((c) => c.length));

    const cellH = 6;
    for (let row = 0; row < maxRows; row++) {
      y = checkPageBreak(doc, y, cellH + 2);
      const isOdd = row % 2 === 1;
      if (isOdd) {
        setFill(doc, [245, 242, 255]);
        doc.rect(MARGIN, y, CONTENT_W, cellH, "F");
      }
      for (let col = 0; col < 5; col++) {
        const x = MARGIN + col * numColW;
        const num = byCol[col][row];
        if (num !== undefined) {
          const order = drawData.drawnNumbers.indexOf(num) + 1;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          setTextC(doc, PURPLE);
          doc.text(String(num).padStart(2, "0"), x + numColW * 0.35, y + 4.3, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          setTextC(doc, [140, 140, 160]);
          doc.text(`#${order}`, x + numColW * 0.72, y + 4.3, { align: "center" });
        }
        setDraw(doc, [210, 205, 230]);
        doc.line(x + numColW, y, x + numColW, y + cellH);
      }
      setDraw(doc, [210, 205, 230]);
      doc.line(MARGIN, y + cellH, MARGIN + CONTENT_W, y + cellH);
      y += cellH;
    }

    y += 6;
  }

  // ── Draw sequence strip ────────────────────────────────────────────────────
  if (drawData && drawData.drawnNumbers.length > 0) {
    y = checkPageBreak(doc, y, 16);
    sectionTitle(doc, y, "SEQUÊNCIA COMPLETA DO SORTEIO");
    y += 8;

    const ballSize = 8;
    const ballsPerRow = Math.floor(CONTENT_W / (ballSize + 2));
    let bx2 = MARGIN;
    let by2 = y;

    drawData.drawnNumbers.forEach((num, idx) => {
      if (idx > 0 && idx % ballsPerRow === 0) { bx2 = MARGIN; by2 += ballSize + 3; by2 = checkPageBreak(doc, by2, ballSize + 3); }
      setFill(doc, ORANGE);
      doc.circle(bx2 + ballSize / 2, by2 + ballSize / 2, ballSize / 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      setTextC(doc, [255, 255, 255]);
      doc.text(String(num).padStart(2, "0"), bx2 + ballSize / 2, by2 + ballSize / 2 + 1.5, { align: "center" });
      bx2 += ballSize + 2;
    });

    y = by2 + ballSize + 6;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const totalPages = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = 297 - 8;
    setFill(doc, [245, 242, 255]);
    doc.rect(0, footerY - 3, PAGE_W, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setTextC(doc, [130, 120, 160]);
    const genDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    doc.text(`Gerado em ${genDate}`, MARGIN, footerY + 2);
    doc.text(`Página ${p} de ${totalPages}`, PAGE_W - MARGIN, footerY + 2, { align: "right" });
  }

  const safeName = event.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`relatorio_${safeName}.pdf`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function sectionTitle(doc: jsPDF, y: number, text: string) {
  setFill(doc, PURPLE);
  doc.rect(MARGIN, y - 0.5, 3, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextC(doc, PURPLE);
  doc.text(text, MARGIN + 5, y + 4.5);
  setDraw(doc, [200, 190, 240]);
  doc.line(MARGIN + 5 + doc.getTextWidth(text) + 3, y + 2, MARGIN + CONTENT_W, y + 2);
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 280) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}
