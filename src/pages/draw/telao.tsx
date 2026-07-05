import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { AnimatePresence, motion } from "motion/react";
import { Shuffle, AlertTriangle, Trophy, Heart, Volume2, VolumeX, Medal } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const SORTE_LETTERS = ["S", "O", "R", "T", "E"];
const COL_RANGES = [
  { min: 1, max: 15 },
  { min: 16, max: 30 },
  { min: 31, max: 45 },
  { min: 46, max: 60 },
  { min: 61, max: 75 },
];
const COL_COLORS_BG = [
  "bg-violet-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-rose-600",
];
const COL_COLORS_RING = [
  "ring-violet-400",
  "ring-blue-400",
  "ring-emerald-400",
  "ring-orange-400",
  "ring-rose-400",
];
const COL_GLOW = [
  "shadow-[0_0_80px_rgba(139,92,246,0.9)]",
  "shadow-[0_0_80px_rgba(37,99,235,0.9)]",
  "shadow-[0_0_80px_rgba(5,150,105,0.9)]",
  "shadow-[0_0_80px_rgba(249,115,22,0.9)]",
  "shadow-[0_0_80px_rgba(225,29,72,0.9)]",
];
const COL_HEX = ["#7c3aed", "#2563eb", "#059669", "#f97316", "#e11d48"];

function getColumn(n: number) {
  return COL_RANGES.findIndex((r) => n >= r.min && n <= r.max);
}

function maskPhone(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `****-${digits.slice(-4)}`;
}

function playChime(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = new AudioContext();
    const freqs = [880, 1100, 1320];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.5);
    });
    void ctx.close();
  } catch {
    // ignore
  }
}

function playAlarm(enabled: boolean) {
  if (!enabled) return;
  try {
    const ctx = new AudioContext();
    [0, 0.3].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(440, ctx.currentTime + t);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.25);
    });
    void ctx.close();
  } catch {
    // ignore
  }
}

export default function TelaoPage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("event") as Id<"events"> | null;
  const [soundEnabled, setSoundEnabled] = useState(true);

  const event = useQuery(api.events.get, eventId ? { eventId } : "skip");
  const draw = useQuery(api.draws.get, eventId ? { eventId } : "skip");
  const allCards = useQuery(api.cards.listForExport, eventId ? { eventId } : "skip");

  const drawnNumbers = draw?.drawnNumbers ?? [];
  const lastDrawn = draw?.lastDrawn;
  const colIdx = lastDrawn !== undefined ? getColumn(lastDrawn) : -1;
  // Last 5 drawn, most recent first
  const last5 = drawnNumbers.slice(-5).reverse();
  const prevLastRef = useRef<number | undefined>(undefined);
  const [alertVisible, setAlertVisible] = useState(false);
  // Track animation key to retrigger ball bounce
  const [ballKey, setBallKey] = useState(0);

  // Compute scores for eligible cards (paid + validated)
  const drawnSet = new Set(drawnNumbers);
  const eligibleCards = (allCards ?? []).filter((c) => c.paid === true && c.validated === true);

  const cardScores = eligibleCards.map((card) => {
    const c1 = card.numbers.slice(0, 20).filter((n) => drawnSet.has(n)).length;
    const c2 = card.numbers.slice(20, 40).filter((n) => drawnSet.has(n)).length;
    const c3 = card.numbers.slice(40, 60).filter((n) => drawnSet.has(n)).length;
    const score = Math.max(c1, c2, c3);
    return { card, score };
  });

  const maxScore = cardScores.reduce((m, c) => Math.max(m, c.score), 0);
  const has19 = maxScore >= 19 && maxScore < 20;
  const has17 = maxScore === 17 || maxScore === 18;
  const winners = cardScores.filter((c) => c.score >= 20);
  const hasWinner = winners.length > 0;

  // Top 3 for podium display
  const top3 = [...cardScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((c) => c.score > 0);

  // Top 10 for bar chart
  const top10 = [...cardScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .reverse();
  const showTop10 = top10.length > 0 && top10[top10.length - 1].score > 0;

  // Count cards at each threshold
  const count17 = cardScores.filter((c) => c.score === 17).length;
  const count18 = cardScores.filter((c) => c.score === 18).length;
  const count19 = cardScores.filter((c) => c.score === 19).length;
  const count20 = cardScores.filter((c) => c.score >= 20).length;
  const showScoreboard = (count17 + count18 + count19 + count20) > 0;

  // Play chime on new number + retrigger ball animation
  useEffect(() => {
    if (lastDrawn !== undefined && lastDrawn !== prevLastRef.current) {
      playChime(soundEnabled);
      setBallKey((k) => k + 1);
      prevLastRef.current = lastDrawn;
    }
  }, [lastDrawn, soundEnabled]);

  // Alarm + alert banner on 19 points
  const prev19Ref = useRef(false);
  useEffect(() => {
    if (has19 && !prev19Ref.current) {
      playAlarm(soundEnabled);
      setAlertVisible(true);
      prev19Ref.current = true;
    }
    if (!has19) {
      prev19Ref.current = false;
      setAlertVisible(false);
    }
  }, [has19, soundEnabled]);

  if (!eventId) {
    return (
      <div className="min-h-screen bg-[#1e2a4a] flex items-center justify-center">
        <p className="text-white/40 text-2xl font-bold">Nenhum evento selecionado.</p>
      </div>
    );
  }

  // Winner overlay
  if (hasWinner) {
    return (
      <div className="min-h-screen bg-[#1e2a4a] flex flex-col items-center justify-center overflow-hidden relative">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: `${60 + i * 35}px`,
              height: `${60 + i * 35}px`,
              background: ["#7c3aed","#2563eb","#059669","#f97316","#e11d48","#eab308"][i % 6],
              left: `${(i * 13) % 100}%`,
              top: `${(i * 17) % 100}%`,
            }}
            animate={{
              x: [0, 40 * (i % 2 === 0 ? 1 : -1), 0],
              y: [0, -40, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
          className="relative z-10 flex flex-col items-center gap-6 w-full max-w-2xl px-6"
        >
          <motion.div
            animate={{ rotate: [-5, 5, -5], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-28 h-28 rounded-full bg-yellow-400 flex items-center justify-center shadow-[0_0_100px_rgba(234,179,8,0.9)]"
          >
            <Trophy className="w-14 h-14 text-yellow-900" />
          </motion.div>

          <div className="text-center">
            <p className="text-yellow-400 font-black text-6xl tracking-tight drop-shadow-lg">BINGO!</p>
            <p className="text-white/60 text-xl mt-1">
              {winners.length === 1 ? "Temos um ganhador!" : `${winners.length} ganhadores!`}
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {winners.map(({ card }, idx) => (
              <motion.div
                key={card._id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                className="bg-white/10 border border-white/20 rounded-2xl px-8 py-5 text-center backdrop-blur w-full"
              >
                <p className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">Cartela</p>
                <p className="text-yellow-300 font-black text-5xl mb-3">#{card.cardNumber}</p>
                {card.buyerName && (
                  <p className="text-white font-black text-3xl">{card.buyerName}</p>
                )}
                {card.buyerPhone && (
                  <p className="text-white/60 text-xl mt-1 font-mono">{maskPhone(card.buyerPhone)}</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e2a4a] text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Shuffle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Sistema de Bingo</p>
            <p className="text-white font-black text-base leading-tight">{event?.name ?? "Carregando..."}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {soundEnabled
              ? <Volume2 className="w-4 h-4 text-green-400" />
              : <VolumeX className="w-4 h-4 text-white/30" />
            }
            <span className="text-xs text-white/50 font-semibold">
              {soundEnabled ? "Som ligado" : "Som desligado"}
            </span>
          </button>

          <div className="text-right">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Números Sorteados</p>
            <p className="text-white font-black text-2xl">
              {drawnNumbers.length} <span className="text-white/40 font-normal text-base">/ 75</span>
            </p>
          </div>
        </div>
      </header>

      {/* Top 3 podium */}
      {top3.length > 0 && (
        <div className="px-6 py-1.5 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Medal className="w-3 h-3 text-yellow-400" />
            <p className="text-white/50 text-xs font-black uppercase tracking-widest">Placar — Top 3 Cartelas</p>
          </div>
          <div className="flex items-stretch gap-2">
            {top3.map(({ card, score }, idx) => {
              const medals = ["🥇", "🥈", "🥉"];
              const pct = Math.round((score / 20) * 100);
              const barColor = idx === 0 ? "bg-yellow-400" : idx === 1 ? "bg-slate-300" : "bg-amber-600";
              const borderColor = idx === 0 ? "border-yellow-500/50" : idx === 1 ? "border-slate-400/30" : "border-amber-700/30";
              return (
                <div
                  key={card._id}
                  className={`flex-1 rounded-lg border px-3 py-1.5 flex items-center gap-2 bg-white/5 ${borderColor}`}
                >
                  <span className="text-lg shrink-0">{medals[idx]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white font-black text-xs">#{card.cardNumber}</span>
                      <span className={`font-black text-sm ${idx === 0 ? "text-yellow-400" : "text-white/70"}`}>{score}/20</span>
                    </div>
                    {card.buyerName && (
                      <p className="text-white/50 text-xs truncate">{card.buyerName}</p>
                    )}
                    <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${barColor}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 10 bar chart - removed */}

      {/* Score counters bar */}
      {showScoreboard && (
        <div className="flex items-center justify-center gap-2 px-6 py-1.5 bg-white/5 border-b border-white/10 flex-wrap">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mr-2">Cartelas próximas:</p>
          {[
            { pts: 17, count: count17, color: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300" },
            { pts: 18, count: count18, color: "bg-orange-500/20 border-orange-500/50 text-orange-300" },
            { pts: 19, count: count19, color: "bg-red-600/30 border-red-500/60 text-red-300" },
            { pts: 20, count: count20, color: "bg-emerald-500/30 border-emerald-400/60 text-emerald-300" },
          ].map(({ pts, count, color }) => count > 0 ? (
            <div key={pts} className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg border font-bold text-sm ${color}`}>
              <span className="text-base font-black">{count}</span>
              <span className="text-xs opacity-80">cartela{count !== 1 ? "s" : ""} com {pts} pts</span>
            </div>
          ) : null)}
        </div>
      )}

      {/* 19-point alert banner */}
      <AnimatePresence>
        {alertVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <motion.div
              animate={{ backgroundColor: ["#b45309", "#92400e", "#b45309"] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="flex items-center justify-center gap-3 py-3 px-6"
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Heart className="w-7 h-7 text-red-400 fill-red-400" />
              </motion.div>
              <p className="text-yellow-200 font-black text-xl tracking-wide uppercase">
                Agueeenta coração! Cartela(s) com 19 pontos — quase BINGO!
              </p>
              <motion.div
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.25 }}
              >
                <Heart className="w-7 h-7 text-red-400 fill-red-400" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 17/18-point alert banner */}
      <AnimatePresence>
        {has17 && !has19 && !alertVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-3 py-2.5 px-6 bg-yellow-600/80">
              <AlertTriangle className="w-5 h-5 text-yellow-200" />
              <p className="text-yellow-100 font-bold text-lg tracking-wide uppercase">
                Aviso: Cartela(s) com {maxScore} pontos — aproximando do BINGO!
              </p>
              <AlertTriangle className="w-5 h-5 text-yellow-200" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left: last drawn ball + last 5 history */}
        <div className="flex flex-col items-center justify-center gap-4 px-10 py-4 flex-shrink-0 w-[480px]">
          <p className="text-white/40 text-xs font-black uppercase tracking-[0.3em]">Último Número</p>

          {/* Ball with bounce-in animation */}
          <AnimatePresence mode="wait">
            {lastDrawn !== undefined ? (
              <motion.div
                key={ballKey}
                initial={{ y: -160, scale: 0.5, opacity: 0 }}
                animate={{ y: [null, 10, -6, 2, 0], scale: [null, 1.08, 0.96, 1.02, 1], opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center gap-4"
              >
                {/* Glow pulse ring */}
                <div className="relative flex items-center justify-center">
                  <motion.div
                    className={`absolute w-80 h-80 rounded-full ${COL_COLORS_BG[colIdx]} opacity-20`}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={`w-72 h-72 rounded-full ${COL_COLORS_BG[colIdx]} ${COL_GLOW[colIdx]} ring-4 ${COL_COLORS_RING[colIdx]} ring-offset-4 ring-offset-[#1e2a4a] flex flex-col items-center justify-center gap-1 shadow-2xl relative z-10`}
                  >
                    <span className="text-white/80 font-black text-5xl leading-none">{SORTE_LETTERS[colIdx]}</span>
                    <span className="text-white font-black text-9xl leading-none">{lastDrawn}</span>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-72 h-72 rounded-full border-4 border-dashed border-white/20 flex items-center justify-center"
              >
                <Shuffle className="w-24 h-24 text-white/20" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Last 5 history — highlighted strip */}
          {last5.length > 1 && (
            <div className="w-full">
              <p className="text-white/30 text-xs font-black uppercase tracking-widest text-center mb-3">Últimos Sorteados</p>
              <div className="flex items-end justify-center gap-2">
                {last5.slice(1).map((n, i) => {
                  const ci = getColumn(n);
                  const sizes = ["w-16 h-16 text-xl", "w-14 h-14 text-lg", "w-12 h-12 text-base", "w-10 h-10 text-sm"] as const;
                  const opacities = ["opacity-75", "opacity-55", "opacity-35", "opacity-20"] as const;
                  return (
                    <motion.div
                      key={`${n}-${i}`}
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`${sizes[i] ?? "w-10 h-10 text-sm"} ${opacities[i] ?? "opacity-20"} rounded-full flex flex-col items-center justify-center font-black shrink-0`}
                      style={{ backgroundColor: COL_HEX[ci] }}
                    >
                      <span className="text-[8px] leading-none text-white/70">{SORTE_LETTERS[ci]}</span>
                      <span className="leading-none text-white">{n}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: S-O-R-T-E full grid */}
        <div className="flex-1 py-2 pr-4 pl-1 overflow-auto">
          <div className="grid grid-cols-5 gap-1.5 h-full">
            {SORTE_LETTERS.map((letter, col) => {
              const { min, max } = COL_RANGES[col];
              const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
              return (
                <div key={letter} className="flex flex-col gap-1">
                  <div className={`${COL_COLORS_BG[col]} text-white text-center font-black text-lg py-1 rounded-lg`}>
                    {letter}
                  </div>
                  <div className="grid grid-cols-3 gap-0.5">
                    {nums.map((n) => {
                      const isDrawn = drawnNumbers.includes(n);
                      const isLast = n === lastDrawn;
                      return (
                        <motion.div
                          key={n}
                          animate={isLast ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                          className={`aspect-square flex items-center justify-center rounded text-lg font-bold transition-all duration-300 ${
                            isLast
                              ? `${COL_COLORS_BG[col]} text-white font-black ring-2 ${COL_COLORS_RING[col]} ring-offset-1 ring-offset-[#1e2a4a] shadow-lg`
                              : isDrawn
                              ? `${COL_COLORS_BG[col]} opacity-50 text-white font-black`
                              : "bg-white/5 text-white font-bold"
                          }`}
                        >
                          {n}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* All done banner */}
      <AnimatePresence>
        {drawnNumbers.length >= 75 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-violet-600 to-orange-500 py-5 text-center"
          >
            <p className="text-white font-black text-3xl tracking-wide">
              Todos os 75 números foram sorteados!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
