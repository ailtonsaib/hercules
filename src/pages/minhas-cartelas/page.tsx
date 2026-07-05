import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Search, Ticket, CheckCircle2, XCircle, Clock, Star, Zap, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

const SORTE = ["S", "O", "R", "T", "E"];

type CardResult = {
  cardNumber: number;
  numbers: number[];
  buyerName: string;
  paid: boolean;
  validated: boolean;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventStatus: string;
  chanceTipo: string;
  prizes: { position: number; description: string }[];
  prizeWinners: Record<number, number>;
};

// Track which numbers were newly drawn to trigger animation
function useNewlyDrawn(drawnNumbers: number[]) {
  const prev = useRef<Set<number>>(new Set());
  const [newlyDrawn, setNewlyDrawn] = useState<Set<number>>(new Set());

  useEffect(() => {
    const prevSet = prev.current;
    const currentSet = new Set(drawnNumbers);

    // Detect reset: drawn list shrank (new prize round started)
    if (drawnNumbers.length < prevSet.size) {
      prev.current = currentSet;
      setNewlyDrawn(new Set());
      return;
    }

    const newOnes = drawnNumbers.filter((n) => !prevSet.has(n));
    if (newOnes.length > 0) {
      prev.current = currentSet;
      setNewlyDrawn(new Set(newOnes));
      const t = setTimeout(() => setNewlyDrawn(new Set()), 1200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnNumbers.join(",")]);

  return newlyDrawn;
}

// Individual card viewer with live draw tracking
function CardTracker({ card, drawnNumbers, phone }: { card: CardResult; drawnNumbers: number[]; phone: string }) {
  const drawn = new Set(drawnNumbers);
  const numChances = card.chanceTipo === "tripla" ? 3 : card.chanceTipo === "unica" ? 1 : 2;
  const grids: number[][] = [];
  for (let i = 0; i < numChances; i++) {
    grids.push(card.numbers.slice(i * 20, i * 20 + 20));
  }

  // Score per grid
  const gridScores = grids.map((g) => g.filter((n) => drawn.has(n)).length);
  const totalScore = gridScores.reduce((a, b) => a + b, 0);
  const maxScore = numChances * 20;
  const missing = maxScore - totalScore;

  const chanceLabel = ["Primeira", "Segunda", "Terceira"];
  const newlyDrawn = useNewlyDrawn(drawnNumbers);

  const handleShare = () => {
    const url = `${window.location.origin}/minhas-cartelas`;
    const text = `Acompanhe minha cartela #${card.cardNumber} do *${card.eventName}* em tempo real!\n${url}?tel=${phone}`;
    if (navigator.share) {
      void navigator.share({ title: `Cartela #${card.cardNumber}`, text, url });
    } else {
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank");
    }
  };

  const hasPrizes = card.prizes.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-md"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-xs uppercase tracking-wider">Cartela</p>
          <p className="text-white font-bold text-2xl">#{card.cardNumber}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="text-white/70 text-xs">{card.eventName}</p>
          <div className="flex gap-1 justify-end">
            {card.validated ? (
              <Badge className="bg-green-500 text-white text-[10px]">Validada</Badge>
            ) : card.paid ? (
              <Badge className="bg-blue-500 text-white text-[10px]">Paga</Badge>
            ) : (
              <Badge className="bg-yellow-500 text-white text-[10px]">Pendente</Badge>
            )}
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-white/70 hover:text-white text-[10px] cursor-pointer transition-colors mt-0.5"
          >
            <Share2 size={10} /> Compartilhar
          </button>
        </div>
      </div>

      {/* Score bar per chance (only during draw) */}
      {card.eventStatus === "in_progress" && (
        <div className="px-4 py-2 bg-muted/30 border-b border-border space-y-2">
          {gridScores.map((score, gi) => {
            const missing20 = 20 - score;
            const label = numChances === 1 ? "Progresso" : `${chanceLabel[gi]} Chance`;
            return (
              <div key={gi}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    {missing20 > 0 && (
                      <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                        faltam {missing20}
                      </span>
                    )}
                    <span className={cn(
                      "text-sm font-bold",
                      score >= 19 ? "text-red-500" : score >= 17 ? "text-orange-500" : "text-foreground"
                    )}>
                      {score}/20
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full rounded-full transition-all",
                      score >= 19 ? "bg-red-500" : score >= 17 ? "bg-orange-500" : "bg-violet-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / 20) * 100}%` }}
                  />
                </div>
                {score >= 17 && (
                  <p className={cn(
                    "text-xs font-semibold mt-0.5 text-center",
                    score >= 19 ? "text-red-500 animate-pulse" : "text-orange-500"
                  )}>
                    {score >= 20 ? "Agueeenta coração! 20 pontos!" : score >= 19 ? "Agueeenta coração!" : "Quase lá!"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Prizes section */}
      {hasPrizes && (
        <div className="px-4 py-2 border-b border-border bg-yellow-50/50 dark:bg-yellow-950/10">
          <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Trophy size={10} /> Prêmios
          </p>
          <div className="flex flex-col gap-1">
            {card.prizes.sort((a, b) => a.position - b.position).map((prize) => {
              const winnerId = card.prizeWinners[prize.position];
              const won = winnerId === card.cardNumber;
              const awarded = winnerId !== undefined;
              return (
                <div key={prize.position} className={cn(
                  "flex items-center justify-between text-[11px] rounded-md px-2 py-1",
                  won ? "bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 font-bold" :
                  awarded ? "text-muted-foreground line-through" :
                  "text-foreground"
                )}>
                  <span>
                    {prize.position === 1 ? "🥇" : prize.position === 2 ? "🥈" : prize.position === 3 ? "🥉" : `${prize.position}º`}{" "}
                    {prize.description}
                  </span>
                  {won && <span className="text-yellow-600 font-bold text-[10px]">VOCÊ GANHOU!</span>}
                  {awarded && !won && <span className="text-muted-foreground text-[10px]">Concedido</span>}
                  {!awarded && <span className="text-violet-500 text-[10px]">Em disputa</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grids */}
      <div className="p-3 space-y-3">
        {grids.map((grid, gi) => (
          <div key={gi}>
            {numChances > 1 && (
              <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">
                {chanceLabel[gi]} Chance — {gridScores[gi]}/20
              </p>
            )}
            {/* Column headers */}
            <div className="grid grid-cols-5 gap-[3px] mb-[3px]">
              {SORTE.map((l) => (
                <div key={l} className="text-center text-sm font-extrabold text-violet-400 py-1">{l}</div>
              ))}
            </div>
            {/* 4 rows × 5 cols */}
            {Array.from({ length: 4 }, (_, row) => (
              <div key={row} className="grid grid-cols-5 gap-[3px] mb-[3px]">
                {Array.from({ length: 5 }, (_, col) => {
                  const num = grid[col * 4 + row];
                  const hit = drawn.has(num);
                  const isNew = newlyDrawn.has(num);
                  return (
                    <motion.div
                      key={col}
                      animate={isNew ? { scale: [1, 1.3, 1], backgroundColor: ["#7c3aed", "#f59e0b", "#7c3aed"] } : {}}
                      transition={isNew ? { duration: 0.5, ease: "easeInOut" } : {}}
                      className={cn(
                        "aspect-square rounded-lg flex items-center justify-center text-base font-extrabold transition-all duration-300",
                        hit
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-500/40 scale-105"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {String(num).padStart(2, "0")}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Wrapper that loads drawn numbers reactively for a single event
function EventCardGroup({ eventId, cards, phone }: { eventId: string; cards: CardResult[]; phone: string }) {
  const drawnNumbers = useQuery(api.cards.getDrawnNumbersPublic, { eventId: eventId as Id<"events"> }) ?? [];
  const eventName = cards[0].eventName;
  const eventStatus = cards[0].eventStatus;

  const statusLabel = eventStatus === "in_progress" ? "Sorteio em andamento" : eventStatus === "finished" ? "Finalizado" : "Aguardando";
  const statusColor = eventStatus === "in_progress" ? "text-green-500" : eventStatus === "finished" ? "text-muted-foreground" : "text-yellow-500";

  // Sort cards: most hits first
  const drawn = new Set(drawnNumbers);
  const sortedCards = [...cards].sort((a, b) => {
    const hitsA = a.numbers.filter((n) => drawn.has(n)).length;
    const hitsB = b.numbers.filter((n) => drawn.has(n)).length;
    return hitsB - hitsA;
  });

  // Check if any card won a prize (only relevant when finished)
  const wonPrizes = eventStatus === "finished"
    ? cards.flatMap((card) =>
        card.prizes.filter((p) => card.prizeWinners[p.position] === card.cardNumber)
          .map((p) => ({ ...p, cardNumber: card.cardNumber }))
      ).sort((a, b) => a.position - b.position)
    : [];
  const didWin = wonPrizes.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-foreground">{eventName}</h2>
          <p className={cn("text-xs font-medium flex items-center gap-1", statusColor)}>
            {eventStatus === "in_progress" && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />}
            {statusLabel}
            {eventStatus === "in_progress" && <span className="text-muted-foreground">— {drawnNumbers.length} números sorteados</span>}
          </p>
        </div>
        <Badge variant="outline">{cards.length} cartela{cards.length !== 1 ? "s" : ""}</Badge>
      </div>

      {/* Current prize in progress */}
      {eventStatus === "in_progress" && cards[0].prizes.length > 0 && (() => {
        const awardedPositions = new Set(Object.keys(cards[0].prizeWinners).map(Number));
        const sortedPrizes = [...cards[0].prizes].sort((a, b) => a.position - b.position);
        const currentPrize = sortedPrizes.find((p) => !awardedPositions.has(p.position));
        const nextPrize = currentPrize
          ? sortedPrizes.find((p) => p.position > currentPrize.position && !awardedPositions.has(p.position))
          : undefined;
        if (!currentPrize) return null;
        return (
          <motion.div
            key={currentPrize.position}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/40 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center shrink-0">
              <span className="text-xl">🏆</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-yellow-400/70 text-[10px] uppercase font-semibold tracking-wider">Prêmio em disputa</p>
              <p className="text-yellow-300 font-bold text-base truncate">
                {currentPrize.position === 1 ? "🥇" : currentPrize.position === 2 ? "🥈" : currentPrize.position === 3 ? "🥉" : `${currentPrize.position}º`}{" "}
                {currentPrize.description}
              </p>
              {nextPrize && (
                <p className="text-white/40 text-[10px] mt-0.5 truncate">
                  Próximo: {nextPrize.position}º {nextPrize.description}
                </p>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* Drawn numbers history */}
      {drawnNumbers.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-[10px] text-white/50 uppercase font-semibold mb-2 tracking-wider">
            Números sorteados ({drawnNumbers.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {drawnNumbers.map((n, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-violet-600/80 text-white text-[11px] font-bold"
              >
                {String(n).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedCards.map((card) => (
          <CardTracker key={card.cardNumber + card.eventId} card={card} drawnNumbers={drawnNumbers} phone={phone} />
        ))}
      </div>

      {/* Final result overlay card — shown only when event is finished */}
      {eventStatus === "finished" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "rounded-2xl p-6 text-center space-y-4 border",
            didWin
              ? "bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border-yellow-500/40"
              : "bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-white/10"
          )}
        >
          {didWin ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-6xl"
              >
                🏆
              </motion.div>
              <div className="space-y-1">
                <p className="text-yellow-400 font-extrabold text-xl">Meus parabéns!</p>
                <p className="text-white font-semibold text-base">Você ganhou!</p>
              </div>
              <div className="space-y-2">
                {wonPrizes.map((prize) => (
                  <div key={prize.position} className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                    <p className="text-yellow-300 font-bold text-lg">
                      {prize.position === 1 ? "🥇" : prize.position === 2 ? "🥈" : prize.position === 3 ? "🥉" : `${prize.position}º`} {prize.description}
                    </p>
                    <p className="text-white/60 text-xs mt-1">Cartela #{prize.cardNumber}</p>
                  </div>
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Favor comparecer no local do evento ou entrar em contato com seu vendedor para retirar o prêmio.
              </p>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-6xl"
              >
                😔
              </motion.div>
              <div className="space-y-1">
                <p className="text-white font-bold text-lg">Evento finalizado</p>
                <p className="text-white/60 text-sm leading-relaxed">
                  Infelizmente você não ganhou desta vez. Fica para a próxima!
                </p>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

import { Lock } from "lucide-react";

const PLAN_DISPLAY: Record<string, string> = {
  free: "Gratuito",
  basic: "BASIC",
  pro: "PRO",
  max: "MAX",
  ultra: "ULTRA",
  enterprise: "ENTERPRISE",
  mega: "MEGA",
};

export default function MinhasCartelasPage() {
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState("");

  const trackingStatus = useQuery(api.appSettings.getBuyerTrackingStatus);

  const rawCards = useQuery(
    api.cards.getCardsByPhone,
    submitted.length >= 8 ? { phone: submitted } : "skip"
  );

  const groupedByEvent = useMemo(() => {
    if (!rawCards) return null;
    // Only show validated cards
    const validatedCards = rawCards.filter((c) => c.validated);
    const map = new Map<string, CardResult[]>();
    for (const c of validatedCards) {
      const existing = map.get(c.eventId) ?? [];
      existing.push(c);
      map.set(c.eventId, existing);
    }
    // Sort: in_progress first, then open, then finished
    const order = { in_progress: 0, open: 1, finished: 2 };
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      return (order[a[0].eventStatus as keyof typeof order] ?? 9) - (order[b[0].eventStatus as keyof typeof order] ?? 9);
    });
  }, [rawCards]);

  // Show loading while status is unknown
  if (trackingStatus === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Blocked — show locked screen
  if (!trackingStatus.enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Lock className="text-violet-400" size={36} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Recurso indisponível</h1>
          <p className="text-violet-300 text-sm max-w-sm">
            O acompanhamento de cartelas pelo comprador não está disponível neste momento.
            Entre em contato com o organizador do evento para mais informações.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white/50">
          Plano necessário: <span className="text-violet-300 font-semibold">{PLAN_DISPLAY[trackingStatus.minPlan] ?? trackingStatus.minPlan}</span>
        </div>
      </div>
    );
  }

  const handleSearch = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 8) setSubmitted(digits);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-violet-950/80 backdrop-blur border-b border-violet-800/40 px-4 py-3 flex items-center gap-3">
        <Ticket className="text-violet-400 shrink-0" size={22} />
        <span className="font-bold text-white text-lg">Minhas Cartelas</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 mb-2">
            <Phone className="text-violet-400" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">Encontre suas cartelas</h1>
          <p className="text-violet-300 text-sm">Digite seu número de celular para ver todas as cartelas compradas no seu nome</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3"
        >
          <div className="flex gap-2">
            <Input
              type="tel"
              placeholder="(XX) XXXXX-XXXX "
              value={phone}
              onChange={(e) => {
                const raw = e.target.value;
                const digits = raw.replace(/\D/g, "").slice(0, 11);
                let masked = "";
                if (digits.length === 0) {
                  masked = "";
                } else if (digits.length <= 2) {
                  masked = "(" + digits;
                } else if (digits.length <= 7) {
                  masked = "(" + digits.slice(0, 2) + ") " + digits.slice(2);
                } else {
                  masked = "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
                }
                setPhone(masked);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-violet-500"
            />
            <Button onClick={handleSearch} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">
              <Search size={16} />
            </Button>
          </div>
          <p className="text-white/40 text-xs text-center">Basta informar o número usado no momento da compra</p>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {submitted && rawCards !== undefined && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {groupedByEvent === null || (groupedByEvent.length === 0 && rawCards.filter((c) => !c.validated).length === 0) ? (
                <div className="text-center py-12 space-y-3">
                  <XCircle className="mx-auto text-white/30" size={48} />
                  <p className="text-white/60 font-medium">Nenhuma cartela encontrada</p>
                  <p className="text-white/40 text-sm">Verifique se o número digitado é o mesmo que foi informado na compra</p>
                </div>
              ) : (
                <>
                  {/* Summary strip */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: Ticket, label: "Cartelas", value: rawCards.filter((c) => c.validated).length, color: "text-violet-400" },
                      { icon: CheckCircle2, label: "Validadas", value: rawCards.filter((c) => c.validated).length, color: "text-green-400" },
                      { icon: Zap, label: "Em sorteio", value: rawCards.filter((c) => c.eventStatus === "in_progress" && c.validated).length, color: "text-yellow-400" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                        <Icon className={cn("mx-auto mb-1", color)} size={18} />
                        <p className="text-white font-bold text-lg">{value}</p>
                        <p className="text-white/50 text-[10px]">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Warning: unvalidated cards */}
                  {(() => {
                    const unvalidated = rawCards.filter((c) => !c.validated);
                    if (unvalidated.length === 0) return null;
                    const hasValidated = rawCards.some((c) => c.validated);
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 bg-orange-500/15 border border-orange-500/40 rounded-xl px-4 py-4"
                      >
                        <span className="text-2xl shrink-0">⚠️</span>
                        <div className="space-y-1">
                          <p className="text-orange-300 font-bold text-sm">
                            {!hasValidated
                              ? "Suas cartelas ainda não foram validadas"
                              : unvalidated.length === 1
                              ? "1 cartela aguardando validação"
                              : `${unvalidated.length} cartelas aguardando validação`}
                          </p>
                          <p className="text-orange-200/70 text-xs leading-relaxed">
                            {!hasValidated
                              ? "Você possui cartelas compradas, porém nenhuma foi validada ainda. Cartelas não validadas não poderão participar do sorteio. Entre em contato com seu vendedor para regularizar o pagamento."
                              : "Algumas cartelas ainda não foram validadas e ficam ocultas até o vendedor confirmar o pagamento. Entre em contato para regularizar."}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* Per-event groups */}
                  {groupedByEvent.map(([eventId, cards]) => (
                    <EventCardGroup key={eventId} eventId={eventId} cards={cards} phone={submitted} />
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        {!submitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {[
              { icon: Ticket, text: "Veja todas suas cartelas em um só lugar" },
              { icon: Star, text: "Acompanhe o sorteio em tempo real com números marcados" },
              { icon: Clock, text: "Histórico de todos os eventos em que participou" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-white/50 text-sm">
                <Icon size={16} className="text-violet-400 shrink-0" />
                {text}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
