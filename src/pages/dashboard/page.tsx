import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  LayoutDashboard, Trophy, Trash2, PlusCircle, FileDown,
  Ticket, CheckCircle2, ShieldCheck, Users, TrendingUp, CircleDollarSign,
  Shuffle, ClipboardCheck, BarChart2, UserCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { generateEventReport } from "./_lib/generate-report.ts";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";

type PrizeAward = Doc<"prizeAwards">;

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}
function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Award Prize Dialog ─────────────────────────────────────────────────────
function AwardPrizeDialog({
  eventId,
  prize,
  onClose,
}: {
  eventId: Id<"events">;
  prize: { position: number; description: string };
  onClose: () => void;
}) {
  const award = useMutation(api.prizeAwards.award);
  const [cardNumber, setCardNumber] = useState("");
  const [winnerName, setWinnerName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const num = parseInt(cardNumber);
    if (isNaN(num) || num < 1) { toast.error("Informe um número de cartela válido"); return; }
    setSaving(true);
    try {
      await award({ eventId, prizePosition: prize.position, prizeDescription: prize.description, winnerCardNumber: num, winnerName: winnerName.trim() || undefined });
      toast.success(`${prize.description} concedido!`);
      onClose();
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Erro ao registrar prêmio");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Registrar Vencedor
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Prêmio</p>
            <p className="font-bold">{prize.position}º — {prize.description}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Número da Cartela *</Label>
            <Input type="number" min={1} value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="000001" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Nome do Vencedor</Label>
            <Input value={winnerName} onChange={(e) => setWinnerName(e.target.value)} placeholder="Maria Silva (opcional)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Trophy className="w-4 h-4" />
            {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="bg-card border rounded-2xl p-5 flex items-start gap-4"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-none mb-1">{label}</p>
        <p className="text-2xl font-black leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Funnel Bar ─────────────────────────────────────────────────────────────
function FunnelBar({ label, value, total, color, icon: Icon }: {
  label: string; value: number; total: number; color: string; icon: React.ElementType;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className="font-black">{fmt(value)} <span className="text-muted-foreground font-normal text-xs">({Math.round(pct)}%)</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  // Persist selected event in sessionStorage
  const [selectedEvent, setSelectedEvent] = useState<string>(() => {
    return sessionStorage.getItem("dashboard_selectedEvent") ?? "";
  });

  const handleSelectEvent = (v: string) => {
    setSelectedEvent(v);
    sessionStorage.setItem("dashboard_selectedEvent", v);
  };

  const events = useQuery(api.events.list, {});
  const eventId = selectedEvent as Id<"events">;

  const event = useQuery(api.events.get, selectedEvent ? { eventId } : "skip");
  const summary = useQuery(api.cards.getSalesSummary, selectedEvent ? { eventId } : "skip");
  const detailed = useQuery(api.cards.getDetailedSummary, selectedEvent ? { eventId } : "skip");
  const draw = useQuery(api.draws.get, selectedEvent ? { eventId } : "skip");
  const awards = useQuery(api.prizeAwards.listByEvent, selectedEvent ? { eventId } : "skip");
  const vendorRanking = useQuery(api.vendors.rankingByEvent, selectedEvent ? { eventId } : "skip");
  const salesByDay = useQuery(api.cards.getSalesByDay, selectedEvent ? { eventId } : "skip");
  const removeAward = useMutation(api.prizeAwards.remove);

  const [awardingPrize, setAwardingPrize] = useState<{ position: number; description: string } | null>(null);

  const prizes = event?.prizes ?? [];
  const drawnCount = draw?.drawnNumbers.length ?? 0;
  const revenue = summary && event?.cardPrice ? summary.paid * event.cardPrice : null;
  const revenueExpected = summary && event?.cardPrice ? summary.assigned * event.cardPrice : null;

  const handleRemoveAward = async (award: PrizeAward) => {
    try {
      await removeAward({ awardId: award._id });
      toast.success("Prêmio removido");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const [generatingReport, setGeneratingReport] = useState(false);
  const handleGenerateReport = () => {
    if (!event || !summary) return;
    setGeneratingReport(true);
    try {
      generateEventReport(event, summary, awards ?? [], draw ?? undefined);
      toast.success("Relatório gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar relatório");
    } finally {
      setGeneratingReport(false);
    }
  };

  const isLoading = !!selectedEvent && (event === undefined || summary === undefined || detailed === undefined);

  // Pie chart data for card status distribution
  const pieData = detailed ? [
    { name: "Validadas", value: detailed.validated, fill: "#10b981" },
    { name: "Pagas", value: detailed.paid - detailed.validated, fill: "#3b82f6" },
    { name: "Com Vendedor", value: detailed.atVendorPending, fill: "#f97316" },
    { name: "Disponíveis", value: detailed.unassigned - detailed.atVendorPending, fill: "#e2e8f0" },
  ].filter((d) => d.value > 0) : [];

  // Top 6 vendors for bar chart
  const topVendors = (vendorRanking ?? []).slice(0, 6);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-black text-foreground">Dashboard</h2>
          <p className="text-muted-foreground font-medium mt-0.5">Resumo em tempo real do evento</p>
        </div>
        {selectedEvent && event && summary && (
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={handleGenerateReport} disabled={generatingReport}>
            <FileDown className="w-4 h-4" />
            {generatingReport ? "Gerando..." : "Gerar Relatório"}
          </Button>
        )}
      </div>

      {/* Event selector */}
      <div className="p-4 bg-card border rounded-2xl">
        <div className="max-w-sm space-y-1.5">
          <label className="text-sm font-semibold">Selecionar Evento</label>
          <Select value={selectedEvent} onValueChange={handleSelectEvent}>
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
      </div>

      {/* Empty state */}
      {!selectedEvent && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><LayoutDashboard /></EmptyMedia>
            <EmptyTitle>Selecione um evento</EmptyTitle>
            <EmptyDescription>Escolha um evento para visualizar o dashboard</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      )}

      {/* Content */}
      {selectedEvent && !isLoading && event && summary && detailed && (
        <div className="space-y-6">
          {/* Event banner */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-card border rounded-2xl">
            <div>
              <h3 className="text-xl font-black">{event.name}</h3>
              <p className="text-sm text-muted-foreground">
                {event.date ? format(new Date(event.date + "T00:00:00"), "dd 'de' MMMM yyyy", { locale: ptBR }) : ""}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={`font-bold text-sm px-3 py-1.5 ${
                event.status === "in_progress"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : event.status === "finished"
                  ? "bg-muted text-muted-foreground"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              {event.status === "open" ? "Aberto" : event.status === "in_progress" ? "Em Andamento" : "Encerrado"}
            </Badge>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Ticket} label="Total de Cartelas" value={fmt(detailed.total)} sub="geradas" accent="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" delay={0} />
            <KpiCard icon={TrendingUp} label="Vendidas" value={fmt(detailed.assigned)} sub={`${Math.round(detailed.assigned / (detailed.total || 1) * 100)}% do total`} accent="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" delay={0.05} />
            <KpiCard icon={CheckCircle2} label="Pagas" value={fmt(detailed.paid)} sub={detailed.unpaid > 0 ? `${fmt(detailed.unpaid)} a receber` : "todas pagas"} accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" delay={0.1} />
            <KpiCard
              icon={CircleDollarSign}
              label={revenue !== null ? "Receita" : "Preço Unitário"}
              value={revenue !== null ? fmtBRL(revenue) : event.cardPrice ? fmtBRL(event.cardPrice) : "—"}
              sub={revenueExpected !== null && revenue !== null && revenueExpected > revenue ? `Potencial: ${fmtBRL(revenueExpected)}` : undefined}
              accent="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400"
              delay={0.15}
            />
          </div>

          {/* Quick shortcuts */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18, ease: "easeOut" }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              { icon: Ticket, label: "Cartelas", route: "/cartelas", color: "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
              { icon: ClipboardCheck, label: "Validar", route: "/validar", color: "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
              { icon: Shuffle, label: "Sorteio", route: "/sorteio", color: "bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800" },
              { icon: UserCheck, label: "Vendedores", route: "/vendedores", color: "bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
            ].map(({ icon: Icon, label, route, color }) => (
              <button
                key={route}
                onClick={() => navigate(route)}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${color}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-bold">{label}</span>
              </button>
            ))}
          </motion.div>

          {/* Second row: Validated + Vendor */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={ShieldCheck} label="Validadas" value={fmt(detailed.validated)} sub={`${Math.round(detailed.validated / (detailed.total || 1) * 100)}% do total`} accent="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400" delay={0.2} />
            <KpiCard icon={Users} label="Com Vendedor" value={fmt(detailed.atVendorPending)} sub="aguardando pagamento" accent="bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" delay={0.25} />
          </div>

          {/* Sales funnel + pie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Funnel */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              className="bg-card border rounded-2xl p-5 space-y-4"
            >
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Funil de Vendas</h3>
              <div className="space-y-4">
                <FunnelBar label="Vendidas" value={detailed.assigned} total={detailed.total} color="bg-blue-500" icon={TrendingUp} />
                <FunnelBar label="Pagas" value={detailed.paid} total={detailed.total} color="bg-emerald-500" icon={CheckCircle2} />
                <FunnelBar label="Validadas" value={detailed.validated} total={detailed.total} color="bg-violet-500" icon={ShieldCheck} />
              </div>
              {/* Completion summary */}
              <div className="pt-2 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Disponíveis</span>
                <span className="font-bold">{fmt(detailed.unassigned)} cartelas</span>
              </div>
            </motion.div>

            {/* Pie chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
              className="bg-card border rounded-2xl p-5 space-y-2"
            >
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Distribuição</h3>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [fmt(value), name]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  Sem dados
                </div>
              )}
            </motion.div>
          </div>

          {/* Sales by day chart */}
          {salesByDay && salesByDay.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.38, ease: "easeOut" }}
              className="bg-card border rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Vendas por Dia</h3>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={salesByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(d: string) => format(new Date(d + "T12:00:00"), "dd/MM", { locale: ptBR })}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(d: string) => format(new Date(d + "T12:00:00"), "dd 'de' MMMM", { locale: ptBR })}
                    formatter={(value: number, name: string) => [
                      fmt(value),
                      name === "sold" ? "Vendidas" : name === "paid" ? "Pagas" : "Validadas",
                    ]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="sold" name="sold" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="paid" name="paid" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="validated" name="validated" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center flex-wrap">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-blue-500 inline-block" /> Vendidas</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-emerald-500 inline-block" /> Pagas</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-violet-500 inline-block" /> Validadas</span>
              </div>
            </motion.div>
          )}

          {/* Vendor ranking bar chart */}
          {topVendors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
              className="bg-card border rounded-2xl p-5 space-y-4"
            >
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Ranking de Vendedores (Top 6)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topVendors} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="vendorName" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmt(value), name === "paid" ? "Pagas" : name === "sold" ? "Vendidas" : name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="sold" name="sold" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name="paid" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Vendor table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold text-muted-foreground text-xs uppercase">Vendedor</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground text-xs uppercase">Total</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground text-xs uppercase">Vendidas</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground text-xs uppercase">Pagas</th>
                      <th className="text-right py-2 font-semibold text-muted-foreground text-xs uppercase">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(vendorRanking ?? []).map((v, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 font-medium">{v.vendorName}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{fmt(v.totalCards)}</td>
                        <td className="py-2.5 text-right text-blue-600 dark:text-blue-400 font-semibold">{fmt(v.sold)}</td>
                        <td className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(v.paid)}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={v.totalCards > 0 ? (v.paid / v.totalCards) * 100 : 0} className="w-12 h-1.5" />
                            <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(v.totalCards > 0 ? (v.paid / v.totalCards) * 100 : 0)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Draw progress */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
            className="bg-card border rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Progresso do Sorteio</h3>
              <span className="font-black text-lg">{drawnCount} <span className="text-muted-foreground font-normal text-sm">/ 75</span></span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(drawnCount / 75) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-orange-500"
              />
            </div>
            <p className="text-xs text-muted-foreground text-right font-semibold">{Math.round((drawnCount / 75) * 100)}% concluído</p>
          </motion.div>

          {/* Prize tracking */}
          {prizes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
              className="bg-card border rounded-2xl p-5 space-y-4"
            >
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Prêmios</h3>
              <div className="space-y-3">
                {prizes.map((prize) => {
                  const awarded = awards?.find((a) => a.prizePosition === prize.position);
                  return (
                    <div
                      key={prize.position}
                      className={`flex items-center justify-between gap-4 p-3 rounded-xl border-2 transition-all ${
                        awarded
                          ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                          awarded ? "bg-yellow-400 text-black" : "bg-muted text-muted-foreground"
                        }`}>
                          {prize.position}º
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate">{prize.description}</p>
                          {awarded ? (
                            <p className="text-xs text-muted-foreground">
                              Cartela #{String(awarded.winnerCardNumber).padStart(6, "0")}
                              {awarded.winnerName ? ` — ${awarded.winnerName}` : ""}
                              {" · "}{format(new Date(awarded.awardedAt), "HH:mm", { locale: ptBR })}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Aguardando vencedor</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {awarded ? (
                          <>
                            <Badge className="bg-yellow-400 text-black font-bold gap-1">
                              <Trophy className="w-3 h-3" />
                              Concedido
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive w-8 h-8"
                              onClick={() => handleRemoveAward(awarded)}
                              title="Remover registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1.5"
                            onClick={() => setAwardingPrize({ position: prize.position, description: prize.description })}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Registrar Vencedor
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {prizes.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4 border rounded-2xl">
              Nenhum prêmio cadastrado. Edite o evento para adicionar prêmios.
            </div>
          )}
        </div>
      )}

      {/* Award prize dialog */}
      {awardingPrize && selectedEvent && (
        <AwardPrizeDialog
          eventId={eventId}
          prize={awardingPrize}
          onClose={() => setAwardingPrize(null)}
        />
      )}
    </div>
  );
}
