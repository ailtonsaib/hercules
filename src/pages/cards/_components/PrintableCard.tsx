import { extractGrid, SORTE_LETTERS } from "../_lib/bingo-utils.ts";
import type { CardData, EventData } from "../_lib/bingo-utils.ts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function SorteGrid({ numbers, chance }: { numbers: number[]; chance: number }) {
  const grid = extractGrid(numbers, chance as 0 | 1);

  return (
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          {SORTE_LETTERS.map((letter) => (
            <th
              key={letter}
              style={{
                border: "1px solid #000",
                background: "#000",
                color: "#fff",
                fontWeight: "900",
                fontSize: "13px",
                textAlign: "center",
                padding: "4px 2px",
                width: "20%",
              }}
            >
              {letter}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 4 }, (_, row) => (
          <tr key={row}>
            {Array.from({ length: 5 }, (_, col) => (
              <td
                key={col}
                style={{
                  border: "1px solid #000",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "13px",
                  padding: "5px 2px",
                  background: "#fff",
                  color: "#000",
                }}
              >
                {grid[col][row].toString().padStart(2, "0")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChanceSection({
  numbers,
  chance,
  prizes,
  label,
}: {
  numbers: number[];
  chance: number;
  prizes: { position: number; description: string }[];
  label: string;
}) {
  // Each prize gets its own grid. Prizes displayed in rows of 3 (smaller) or 2 (if ≤4 prizes)
  // For 5 prizes: row of 3 + row of 2; for 3: single row of 3; for 2: single row of 2
  const perRow = prizes.length <= 2 ? 2 : 3;
  const rows: { position: number; description: string }[][] = [];
  for (let i = 0; i < prizes.length; i += perRow) {
    rows.push(prizes.slice(i, i + perRow));
  }
  if (rows.length === 0) rows.push([]);

  return (
    <div style={{ marginBottom: "4px" }}>
      <div
        style={{
          fontWeight: "900",
          fontSize: "11px",
          letterSpacing: "3px",
          textAlign: "center",
          border: "1px solid #000",
          background: "#f0f0f0",
          padding: "3px 0",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      {rows.map((rowPrizes, rowIdx) => (
        <div
          key={rowIdx}
          style={{
            display: "flex",
            gap: "5px",
            marginBottom: rowIdx < rows.length - 1 ? "6px" : "0",
          }}
        >
          {rowPrizes.map((prize, i) => (
            <div key={i} style={{ flex: 1 }}>
              <SorteGrid numbers={numbers} chance={chance} />
              <div style={{ fontSize: "8px", marginTop: "2px", fontStyle: "italic", textAlign: "center" }}>
                {prize.position}º) {prize.description}
              </div>
            </div>
          ))}
          {/* Fill empty slots so flex layout stays consistent */}
          {Array.from({ length: perRow - rowPrizes.length }).map((_, i) => (
            <div key={`empty-${i}`} style={{ flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PrintableCard({
  card,
  event,
}: {
  card: CardData;
  event: EventData;
}) {
  const dateStr = event.date
    ? format(new Date(event.date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : "";
  const chanceTipo = event.chanceTipo ?? "dupla";
  const allPrizes = event.prizes ?? [];
  // Every chance section shows ALL prizes (one grid per prize)

  const cardNumStr = String(card.cardNumber).padStart(6, "0");

  return (
    <div
      style={{
        width: "190mm",
        fontFamily: "Arial, sans-serif",
        color: "#000",
        background: "#fff",
        padding: "8mm",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "5px", marginBottom: "5px" }}>
        <div style={{ fontWeight: "900", fontSize: "18px", textTransform: "uppercase" }}>{event.name}</div>
        {event.location && (
          <div style={{ fontSize: "10px" }}>Local: {event.location}</div>
        )}
        {event.address && (
          <div style={{ fontSize: "10px" }}>Endereço: {event.address}</div>
        )}
      </div>

      {/* Date / time / card number / price */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "10px", alignItems: "center" }}>
        <span>DATA: {dateStr}</span>
        {event.time && <span>HORAS: {event.time}</span>}
        <span style={{ fontWeight: "bold", fontSize: "15px" }}>{cardNumStr}</span>
        {event.cardPrice !== undefined && (
          <span style={{ fontWeight: "bold" }}>
            VALOR: R$ {event.cardPrice.toFixed(2).replace(".", ",")}
          </span>
        )}
      </div>

      {/* Primeira Chance */}
      <ChanceSection
        numbers={card.numbers}
        chance={0}
        prizes={allPrizes}
        label={chanceTipo === "unica" ? "S O R T E" : "P R I M E I R A   C H A N C E"}
      />

      {/* Segunda Chance */}
      {chanceTipo !== "unica" && (
        <>
          <div style={{ height: "12px" }} />
          <ChanceSection
            numbers={card.numbers}
            chance={1}
            prizes={allPrizes}
            label="S E G U N D A   C H A N C E"
          />
        </>
      )}

      {/* Terceira Chance */}
      {chanceTipo === "tripla" && (
        <>
          <div style={{ height: "12px" }} />
          <ChanceSection
            numbers={card.numbers}
            chance={2}
            prizes={allPrizes}
            label="T E R C E I R A   C H A N C E"
          />
        </>
      )}

      {/* Tear stub */}
      <div
        style={{
          borderTop: "1px dashed #888",
          marginTop: "12px",
          paddingTop: "6px",
          fontSize: "9px",
        }}
      >
        {/* Card number + value */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
          <span style={{ fontWeight: "bold", fontSize: "11px" }}>N° {cardNumStr}</span>
          {event.cardPrice !== undefined && (
            <span style={{ fontWeight: "bold", fontSize: "10px" }}>
              VALOR: R$ {event.cardPrice.toFixed(2).replace(".", ",")}
            </span>
          )}
        </div>

        {/* Colaborador + Telefone */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontWeight: "bold", fontSize: "9px", whiteSpace: "nowrap" }}>COLABORADOR:</span>
            <span
              style={{
                display: "inline-block",
                borderBottom: "1px solid #000",
                minWidth: "120px",
                marginLeft: "2px",
              }}
            />
          </div>
          <span style={{ fontWeight: "bold", fontSize: "9px" }}>
            Telefone: (____) _____________________
          </span>
        </div>

        {/* Endereco */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "9px", marginBottom: "2px" }}>
          <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Endereço:</span>
          <span
            style={{
              display: "inline-block",
              borderBottom: "1px solid #000",
              flex: 1,
              minWidth: "180px",
            }}
          />
        </div>

        {/* City / address */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "8px", color: "#333" }}>
          {event.city && <span>CIDADE: {event.city}</span>}
          {event.address && <span>END.: {event.address}</span>}
        </div>
      </div>
    </div>
  );
}
