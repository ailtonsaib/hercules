import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { BarChart3, Trophy, Package, Users, Phone, Download, TrendingUp, CheckCircle2, Clock, DollarSign } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import Papa from "papaparse";

type Tab = "ranking" | "distribution" | "vendas";

export default function ReportsPage() {
  const events = useQuery(api.events.list, {});
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [tab, setTab] = useState<Tab>("vendas");

  const eventId = selectedEvent as Id<"events">;
  const selectedEventData = events?.find((e) => e._id === selectedEvent);

  const ranking = useQuery(
    api.vendors.rankingByEvent,
    selectedEvent ? { eventId } : "skip"
  );
  const distribution = useQuery(
    api.vendors.distributionByEvent,
    selectedEvent ? { eventId } : "skip"
  );
  const salesCards = useQuery(
    api.cards.listForExport,
    selectedEvent ? { eventId } : "skip"
  );

  // Financial summary computations
  const soldCards = salesCards?.filter((c) => c.buyerName) ?? [];
  const paidCards = salesCards?.filter((c) => c.paid) ?? [];
  const pendingCards = soldCards.filter((c) => !c.paid);
  const cardPrice = selectedEventData?.cardPrice ?? 0;
  const totalArrecadado = paidCards.length * cardPrice;
  const totalPendente = pendingCards.length * cardPrice;

  function handleExportCSV() {
    if (!salesCards || !selectedEventData) return;
    const rows = salesCards
      .filter((c) => c.buyerName)
      .map((c) => ({
        "Nº Cartela": c.cardNumber,
        "Comprador": c.buyerName ?? "",
        "Telefone": c.buyerPhone ?? "",
        "Email": c.buyerEmail ?? "",
        "Pago": c.paid ? "Sim" : "Não",
        "Validado": c.validated ? "Sim" : "Não",
        "Valor (R$)": cardPrice > 0 ? cardPrice.toFixed(2) : "",
      }));

    const csv = Papa.unparse(rows, { quotes: true, header: true, delimiter: ";" });
    const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendas-${selectedEventData.name}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-foreground">Relatórios</h2>
        <p className="text-muted-foreground font-medium mt-1">Vendas, ranking de vendedores e distribuição de cartelas</p>
      </div>

      {/* Event selector */}
      <div className="p-4 bg-card rounded-xl border mb-6 space-y-1.5">
        <label className="text-sm font-semibold">Selecionar Evento</label>
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha um evento..." />
          </SelectTrigger>
          <SelectContent>
            {events?.map((e) => (
              <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedEvent ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><BarChart3 /></EmptyMedia>
            <EmptyTitle>Selecione um evento</EmptyTitle>
            <EmptyDescription>Escolha um evento para visualizar os relatórios</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b overflow-x-auto">
            {(
              [
                { id: "vendas", label: "Relatório de Vendas", icon: <TrendingUp className="w-4 h-4" /> },
                { id: "ranking", label: "Ranking de Vendedores", icon: <Trophy className="w-4 h-4" /> },
                { id: "distribution", label: "Distribuição de Cartelas", icon: <Package className="w-4 h-4" /> },
              ] satisfies { id: Tab; label: string; icon: React.ReactNode }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">{t.icon}{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── VENDAS TAB ── */}
          {tab === "vendas" && (
            salesCards === undefined ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : (
              <div className="space-y-5">
                {/* Financial summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Cartelas vendidas",
                      value: soldCards.length,
                      sub: `de ${salesCards.length} geradas`,
                      color: "text-foreground",
                      icon: <Users className="w-5 h-5 text-primary" />,
                    },
                    {
                      label: "Total arrecadado",
                      value: cardPrice > 0 ? `R$ ${totalArrecadado.toFixed(2)}` : `${paidCards.length} pagas`,
                      sub: "confirmadas",
                      color: "text-emerald-600",
                      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
                    },
                    {
                      label: "Valor pendente",
                      value: cardPrice > 0 ? `R$ ${totalPendente.toFixed(2)}` : `${pendingCards.length} pendentes`,
                      sub: "aguardando pagamento",
                      color: "text-amber-500",
                      icon: <Clock className="w-5 h-5 text-amber-400" />,
                    },
                    {
                      label: "Ticket médio",
                      value: cardPrice > 0 ? `R$ ${cardPrice.toFixed(2)}` : "—",
                      sub: "por cartela",
                      color: "text-primary",
                      icon: <DollarSign className="w-5 h-5 text-primary" />,
                    },
                  ].map((s) => (
                    <div key={s.label} className="bg-card border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">{s.icon}<span className="text-xs text-muted-foreground font-medium">{s.label}</span></div>
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Export button */}
                <div className="flex justify-end">
                  <Button onClick={handleExportCSV} disabled={soldCards.length === 0} size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>

                {/* Buyers table */}
                {soldCards.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><Users /></EmptyMedia>
                      <EmptyTitle>Nenhuma venda registrada</EmptyTitle>
                      <EmptyDescription>Associe compradores às cartelas para ver o relatório de vendas</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="bg-card border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Nº</th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Comprador</th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Telefone</th>
                            <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Email</th>
                            {cardPrice > 0 && (
                              <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Valor</th>
                            )}
                            <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {soldCards
                            .sort((a, b) => a.cardNumber - b.cardNumber)
                            .map((card) => (
                              <tr key={card._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-foreground">
                                  #{String(card.cardNumber).padStart(3, "0")}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-foreground">{card.buyerName}</p>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3 shrink-0" />
                                    {card.buyerPhone ?? "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                                  {card.buyerEmail ?? "—"}
                                </td>
                                {cardPrice > 0 && (
                                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                                    R$ {cardPrice.toFixed(2)}
                                  </td>
                                )}
                                <td className="px-4 py-3 text-center">
                                  {card.paid ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-full">
                                      <CheckCircle2 className="w-3 h-3" /> Pago
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-full">
                                      <Clock className="w-3 h-3" /> Pendente
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* ── RANKING TAB ── */}
          {tab === "ranking" && (
            ranking === undefined ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : ranking.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Users /></EmptyMedia>
                  <EmptyTitle>Nenhum lote gerado</EmptyTitle>
                  <EmptyDescription>Gere lotes para vendedores para ver o ranking</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Vendedores", value: new Set(ranking.map(r => r.vendorName)).size, color: "text-primary" },
                    { label: "Total distribuídas", value: ranking.reduce((s, r) => s + r.totalCards, 0), color: "text-foreground" },
                    { label: "Vendidas (pagas)", value: ranking.reduce((s, r) => s + r.paid, 0), color: "text-emerald-600" },
                    { label: "Não vendidas", value: ranking.reduce((s, r) => s + r.unsold, 0), color: "text-rose-500" },
                  ].map((s) => (
                    <div key={s.label} className="bg-card border rounded-xl p-4 text-center">
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {ranking.map((row, idx) => {
                  const pct = row.totalCards > 0 ? Math.round((row.paid / row.totalCards) * 100) : 0;
                  return (
                    <div key={row.batchCode} className="bg-card border rounded-xl px-5 py-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                          idx === 0 ? "bg-yellow-400 text-yellow-900" :
                          idx === 1 ? "bg-slate-300 text-slate-700" :
                          idx === 2 ? "bg-amber-600 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}º
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div>
                              <p className="font-bold text-foreground">{row.vendorName}</p>
                              {row.phone && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" />{row.phone}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">Código do lote: <span className="font-mono font-semibold">{row.batchCode}</span></p>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-right">
                              <div className="text-center">
                                <p className="font-black text-foreground">{row.totalCards}</p>
                                <p className="text-xs text-muted-foreground">distribuídas</p>
                              </div>
                              <div className="text-center">
                                <p className="font-black text-emerald-600">{row.paid}</p>
                                <p className="text-xs text-muted-foreground">pagas</p>
                              </div>
                              <div className="text-center">
                                <p className="font-black text-rose-500">{row.unsold}</p>
                                <p className="text-xs text-muted-foreground">não vendidas</p>
                              </div>
                              <div className="text-center">
                                <p className="font-black text-primary">{pct}%</p>
                                <p className="text-xs text-muted-foreground">convertido</p>
                              </div>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── DISTRIBUTION TAB ── */}
          {tab === "distribution" && (
            distribution === undefined ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
            ) : distribution.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Package /></EmptyMedia>
                  <EmptyTitle>Nenhum lote gerado</EmptyTitle>
                  <EmptyDescription>Gere lotes para vendedores para ver a distribuição</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Total distribuídas", value: distribution.reduce((s, r) => s + r.total, 0), color: "text-foreground" },
                    { label: "Vendidas (pagas)", value: distribution.reduce((s, r) => s + r.paid, 0), color: "text-emerald-600" },
                    { label: "Não vendidas", value: distribution.reduce((s, r) => s + r.unsold, 0), color: "text-rose-500" },
                  ].map((s) => (
                    <div key={s.label} className="bg-card border rounded-xl p-4 text-center">
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-card border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vendedor</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">Código</th>
                        <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Intervalo</th>
                        <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Total</th>
                        <th className="text-center px-4 py-3 font-semibold text-emerald-600">Pagas</th>
                        <th className="text-center px-4 py-3 font-semibold text-rose-500">Faltam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distribution.map((row) => (
                        <tr key={row.batchCode} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{row.vendorName}</p>
                            {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden sm:table-cell">{row.batchCode}</td>
                          <td className="px-4 py-3 text-center font-mono text-xs">
                            #{String(row.minCard).padStart(3, "0")} – #{String(row.maxCard).padStart(3, "0")}
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{row.total}</td>
                          <td className="px-4 py-3 text-center font-bold text-emerald-600">{row.paid}</td>
                          <td className="px-4 py-3 text-center font-bold text-rose-500">{row.unsold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
