import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { motion, AnimatePresence } from "motion/react";
import { Shuffle, Trophy, RotateCcw, Users, CheckCircle2, Star } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type EligibleCard = {
  _id: Id<"cards">;
  cardNumber: number;
  buyerName?: string;
  buyerPhone?: string;
};

const SPIN_DURATION = 3000; // ms
const TICK_INTERVAL_START = 60;
const TICK_INTERVAL_END = 300;

function useTickingNumber(
  eligible: EligibleCard[],
  spinning: boolean,
  onDone: (card: EligibleCard) => void
) {
  const [display, setDisplay] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number>(0);
  const pickedRef = useRef<EligibleCard | null>(null);

  useEffect(() => {
    if (!spinning || eligible.length === 0) return;

    // Pick winner immediately but reveal at end
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    pickedRef.current = winner;
    startRef.current = Date.now();

    let tick = TICK_INTERVAL_START;

    const step = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = Math.min(elapsed / SPIN_DURATION, 1);

      // Show random number during spin
      const randomCard = eligible[Math.floor(Math.random() * eligible.length)];
      setDisplay(randomCard.cardNumber);

      if (progress < 1) {
        // Ease out — gradually slow ticking
        tick = TICK_INTERVAL_START + (TICK_INTERVAL_END - TICK_INTERVAL_START) * progress;
        timerRef.current = setTimeout(step, tick);
      } else {
        // Reveal winner
        setDisplay(winner.cardNumber);
        onDone(winner);
      }
    };

    timerRef.current = setTimeout(step, tick);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [spinning]);

  return display;
}

export default function GiroPage() {
  const events = useQuery(api.events.list, {});
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const eventId = selectedEvent as Id<"events">;

  const eligible = useQuery(
    api.cards.listEligibleForGiro,
    selectedEvent ? { eventId } : "skip"
  );

  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<EligibleCard | null>(null);
  const [history, setHistory] = useState<EligibleCard[]>([]);

  const handleDone = (card: EligibleCard) => {
    setSpinning(false);
    setWinner(card);
    setHistory((prev) => [card, ...prev]);
  };

  const displayNumber = useTickingNumber(eligible ?? [], spinning, handleDone);

  const handleSpin = () => {
    if (!eligible || eligible.length === 0) return;
    setWinner(null);
    setSpinning(true);
  };

  const handleReset = () => {
    setWinner(null);
    setHistory([]);
  };

  const currentDisplay = spinning ? displayNumber : winner?.cardNumber ?? null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-foreground flex items-center gap-3">
          <Shuffle className="w-8 h-8 text-primary" />
          Giro da Sorte
        </h2>
        <p className="text-muted-foreground font-medium mt-1">
          Sorteia uma cartela dentre as pagas e validadas
        </p>
      </div>

      {/* Event selector */}
      <div className="max-w-xs space-y-1.5">
        <label className="text-sm font-semibold text-foreground">Selecionar Evento</label>
        <Select value={selectedEvent} onValueChange={(v) => { setSelectedEvent(v); setWinner(null); setHistory([]); }}>
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
            <EmptyMedia variant="icon"><Shuffle /></EmptyMedia>
            <EmptyTitle>Selecione um evento</EmptyTitle>
            <EmptyDescription>Escolha um evento para iniciar o Giro da Sorte</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : eligible === undefined ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : eligible.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>Nenhuma cartela elegível</EmptyTitle>
            <EmptyDescription>Não há cartelas pagas e validadas neste evento para sortear</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Eligible count */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-semibold text-muted-foreground">
              {eligible.length} cartela{eligible.length !== 1 ? "s" : ""} elegível{eligible.length !== 1 ? "is" : ""} (pagas + validadas)
            </span>
          </div>

          {/* Main spin panel */}
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
            {/* Stars background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <Star
                  key={i}
                  className="absolute text-yellow-400/20"
                  style={{
                    width: `${8 + (i % 5) * 4}px`,
                    top: `${(i * 37) % 90}%`,
                    left: `${(i * 53) % 95}%`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center py-14 px-8 gap-8">
              {/* Number display */}
              <div className="relative">
                <motion.div
                  className={`w-56 h-56 rounded-full flex items-center justify-center border-4 shadow-2xl ${
                    winner && !spinning
                      ? "border-yellow-400 bg-yellow-950/60"
                      : spinning
                      ? "border-primary bg-primary/10"
                      : "border-slate-600 bg-slate-800/60"
                  }`}
                  animate={spinning ? { scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] } : {}}
                  transition={{ duration: 0.3, repeat: spinning ? Infinity : 0 }}
                >
                  <AnimatePresence mode="wait">
                    {currentDisplay !== null ? (
                      <motion.span
                        key={currentDisplay}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.4 }}
                        transition={{ duration: 0.1 }}
                        className={`text-6xl font-black tabular-nums ${
                          winner && !spinning ? "text-yellow-400" : "text-white"
                        }`}
                      >
                        {String(currentDisplay).padStart(6, "0")}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-5xl text-slate-500"
                      >
                        ?
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Winner crown */}
                <AnimatePresence>
                  {winner && !spinning && (
                    <motion.div
                      initial={{ scale: 0, y: -10 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2"
                    >
                      <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Winner info */}
              <AnimatePresence>
                {winner && !spinning && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center space-y-2"
                  >
                    {winner.buyerName ? (
                      <>
                        <p className="text-yellow-400 font-black text-2xl">🎉 {winner.buyerName}</p>
                        {winner.buyerPhone && (
                          <p className="text-slate-400 text-sm font-medium">{winner.buyerPhone}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-300 font-semibold text-lg">Cartela sem comprador</p>
                    )}
                    <Badge className="bg-yellow-500 text-black font-black text-sm px-4 py-1">
                      VENCEDOR!
                    </Badge>
                  </motion.div>
                )}
                {spinning && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-primary font-bold text-lg animate-pulse"
                  >
                    Sorteando...
                  </motion.p>
                )}
                {!spinning && !winner && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-slate-400 font-medium"
                  >
                    Clique em Girar para sortear
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  size="lg"
                  onClick={handleSpin}
                  disabled={spinning}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-lg px-10 rounded-2xl shadow-lg gap-2 disabled:opacity-50"
                >
                  <Shuffle className="w-5 h-5" />
                  {spinning ? "Girando..." : "Girar!"}
                </Button>
                {(winner || history.length > 0) && !spinning && (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handleReset}
                    className="rounded-2xl gap-2 text-white/70 bg-white/10 hover:bg-white/20 border-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* History */}
          {history.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wide">
                Histórico de sorteios
              </h3>
              <div className="space-y-2">
                {history.slice(1).map((card, i) => (
                  <div
                    key={`${card._id}-${i}`}
                    className="flex items-center justify-between bg-card border rounded-xl px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-bold w-4">{history.length - 1 - i}º</span>
                      <span className="font-black text-foreground tabular-nums">
                        #{String(card.cardNumber).padStart(6, "0")}
                      </span>
                      {card.buyerName && (
                        <span className="text-sm text-muted-foreground">{card.buyerName}</span>
                      )}
                    </div>
                    {card.buyerPhone && (
                      <span className="text-xs text-muted-foreground">{card.buyerPhone}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
