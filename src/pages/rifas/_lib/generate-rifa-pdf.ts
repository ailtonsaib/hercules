import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Prize = { position: number; description: string };

type RifaData = {
  name: string;
  date: string;
  time?: string;
  location?: string;
  address?: string;
  phone?: string;
  ticketPrice?: number;
  prizes?: Prize[];
  totalNumbers: number;
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;

// Dashed perforated line (vertical)
function drawPerforation(doc: jsPDF, x: number, yTop: number, yBot: number) {
  const dash = 1.5;
  const gap = 1.5;
  let cy = yTop;
  doc.setDrawColor(140, 140, 140);
  doc.setLineWidth(0.25);
  while (cy < yBot) {
    doc.line(x, cy, x, Math.min(cy + dash, yBot));
    cy += dash + gap;
  }
}

function drawTicket(
  doc: jsPDF,
  rifa: RifaData,
  number: number,
  x: number,
  y: number,
  w: number,
  h: number,
  dateStr: string
) {
  // ── Dimensions ──────────────────────────────────────────
  const stubW = 68;
  const perf = 2;
  const bodyW = w - stubW - perf;
  const r = 1.5;
  const navy = [15, 23, 42] as const;
  const orange = [230, 100, 20] as const;
  const hdrH = 10;

  // ════════════════════════════════════════════════════════
  //  BODY — informações da rifa (fica com o comprador)
  // ════════════════════════════════════════════════════════
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, bodyW, h, r, r, "FD");

  // Header
  doc.setFillColor(...navy);
  doc.roundedRect(x, y, bodyW, hdrH, r, r, "F");
  doc.rect(x, y + hdrH - r, bodyW, r, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(rifa.name.toUpperCase(), x + bodyW / 2, y + 7, {
    align: "center",
    maxWidth: bodyW - 4,
  });

  // Number badge — left column
  const bdgX = x + 2;
  const bdgY = y + hdrH + 2;
  const bdgW = 20;
  const bdgH = h - hdrH - 4;
  doc.setFillColor(...orange);
  doc.roundedRect(bdgX, bdgY, bdgW, bdgH, 1.5, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("No", bdgX + bdgW / 2, bdgY + 5.5, { align: "center" });

  const numStr = String(number).padStart(3, "0");
  doc.setFontSize(14);
  doc.text(numStr, bdgX + bdgW / 2, bdgY + bdgH / 2 + 5, { align: "center" });

  // Info column — right of badge
  const infoX = bdgX + bdgW + 4;
  const infoMaxW = bodyW - bdgW - 9;
  let iy = y + hdrH + 6;

  // Evento / acao
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(rifa.name.toUpperCase(), infoX, iy, { maxWidth: infoMaxW });
  iy += 5;

  // Date + time
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(40, 40, 40);
  doc.text(
    `Data: ${dateStr}${rifa.time ? "   Hora: " + rifa.time : ""}`,
    infoX,
    iy,
    { maxWidth: infoMaxW }
  );
  iy += 4.5;

  // Local
  if (rifa.location) {
    doc.text(`Local: ${rifa.location}`, infoX, iy, { maxWidth: infoMaxW });
    iy += 4.5;
  }
  if (rifa.address) {
    doc.text(`End.: ${rifa.address}`, infoX, iy, { maxWidth: infoMaxW });
    iy += 4.5;
  }

  // Valor
  if (rifa.ticketPrice !== undefined) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Valor: R$ ${rifa.ticketPrice.toFixed(2).replace(".", ",")}`,
      infoX,
      iy
    );
    iy += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
  }

  // Divider before prizes
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(infoX, iy, x + bodyW - 3, iy);
  iy += 3;

  // Prizes
  const prizes = rifa.prizes ?? [];
  if (prizes.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(15, 23, 42);
    doc.text("PREMIOS:", infoX, iy);
    iy += 4;
    prizes.slice(0, 5).forEach((p) => {
      if (p.position === 1) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...orange);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
      }
      doc.setFontSize(5.8);
      doc.text(`${p.position}o) ${p.description}`, infoX, iy, {
        maxWidth: infoMaxW,
      });
      iy += 4;
    });
  }

  // ════════════════════════════════════════════════════════
  //  PERFORATION
  // ════════════════════════════════════════════════════════
  const perfX = x + bodyW + perf / 2;
  drawPerforation(doc, perfX, y + 2, y + h - 2);

  // ════════════════════════════════════════════════════════
  //  CANHOTO — dados do comprador (fica com o vendedor)
  // ════════════════════════════════════════════════════════
  const sx = x + bodyW + perf;

  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.35);
  doc.roundedRect(sx, y, stubW, h, r, r, "FD");

  // Canhoto header
  doc.setFillColor(...navy);
  doc.roundedRect(sx, y, stubW, hdrH, r, r, "F");
  doc.rect(sx, y + hdrH - r, stubW, r, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CANHOTO", sx + stubW / 2, y + 4.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.text("Fica com o vendedor", sx + stubW / 2, y + 8.5, {
    align: "center",
  });

  // Available height inside stub after header
  const stubInnerH = h - hdrH;

  // Scale circle based on available space
  const circR = Math.min(7, stubInnerH * 0.18);
  const circX = sx + stubW / 2;
  const circY = y + hdrH + circR + 3;
  doc.setFillColor(...orange);
  doc.circle(circX, circY, circR + 1.2, "F");
  doc.setFillColor(...navy);
  doc.circle(circX, circY, circR, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.min(11, circR * 1.4));
  doc.text(numStr, circX, circY + circR * 0.45, { align: "center" });

  // Rifa name below circle
  let sy = circY + circR + 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(15, 23, 42);
  doc.text(rifa.name, sx + stubW / 2, sy, {
    align: "center",
    maxWidth: stubW - 6,
  });
  sy += 3.5;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.25);
  doc.line(sx + 4, sy, sx + stubW - 4, sy);
  sy += 4;

  // ── Campo: Nome ──────────────────────────────────────────
  const lx = sx + 3;
  const lineX2 = sx + stubW - 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(20, 20, 20);
  doc.text("Nome:", lx, sy);
  sy += 2.5;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.35);
  doc.line(lx, sy, lineX2, sy);
  sy += 7;

  // ── Campo: Telefone ──────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(20, 20, 20);
  doc.text("Telefone:", lx, sy);
  sy += 2.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text("(      )", lx, sy);
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.35);
  doc.line(lx, sy + 1, lineX2, sy + 1);
}

export function gerarBilhetesPDF(
  rifa: RifaData,
  ticketsPerPage: 4 | 6 | 10,
  options?: { startNumber?: number; endNumber?: number }
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const dateStr = rifa.date
    ? format(new Date(rifa.date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : "";

  const contentW = PAGE_W - MARGIN * 2;
  const contentH = PAGE_H - MARGIN * 2;

  const rows = ticketsPerPage;
  const gapY = 4;
  const ticketH = (contentH - gapY * (rows - 1)) / rows;
  const ticketW = contentW;

  const start = options?.startNumber ?? 1;
  const end = options?.endNumber ?? rifa.totalNumbers;

  let posInPage = 0;
  let firstTicket = true;
  for (let n = start; n <= end; n++) {
    if (!firstTicket && posInPage === 0) doc.addPage();
    firstTicket = false;

    const row = posInPage;
    const tx = MARGIN;
    const ty = MARGIN + row * (ticketH + gapY);

    drawTicket(doc, rifa, n, tx, ty, ticketW, ticketH, dateStr);

    posInPage++;
    if (posInPage >= ticketsPerPage) posInPage = 0;
  }

  const ts = Date.now();
  doc.save(`rifa-${rifa.name.replace(/\s+/g, "-")}-${ts}.pdf`);
}
