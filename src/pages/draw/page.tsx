import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Shuffle, RotateCcw, Undo2, Play, Pause, Tv, Trophy, AlertTriangle, CheckCircle2, RefreshCw, LockOpen, Lock, ArrowRight, Printer, Mail } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { motion, AnimatePresence } from "motion/react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const SORTE_LETTERS = ["S", "O", "R", "T", "E"];
const COL_RANGES = [
  { min: 1, max: 15 },
  { min: 16, max: 30 },
  { min: 31, max: 45 },
  { min: 46, max: 60 },
  { min: 61, max: 75 },
];
const COL_COLORS = [
  "bg-violet-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-rose-600",
];
const COL_RING = [
  "ring-violet-400",
  "ring-blue-400",
  "ring-emerald-400",
  "ring-orange-400",
  "ring-rose-400",
];

function getColumn(n: number) {
  return COL_RANGES.findIndex((r) => n >= r.min && n <= r.max);
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    void ctx.close();
  } catch {
    // ignore
  }
}

function playAlert(frequency = 660, count = 3) {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + i * 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.15);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.15);
    }
    void ctx.close();
  } catch {
    // ignore
  }
}

function playFanfare() {
  try {
    const ctx = new AudioContext();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.4);
    });
    void ctx.close();
  } catch {
    // ignore
  }
}

export default function DrawPage() {
  const events = useQuery(api.events.list, {});
  const [selectedEvent, setSelectedEvent] = useState<string>(() =>
    sessionStorage.getItem("draw_selectedEvent") ?? ""
  );
  const eventId = selectedEvent as Id<"events">;

  const event = useQuery(api.events.get, selectedEvent ? { eventId } : "skip");
  const draw = useQuery(api.draws.get, selectedEvent ? { eventId } : "skip");
  const awards = useQuery(api.prizeAwards.listByEvent, selectedEvent ? { eventId } : "skip");

  const initDraw = useMutation(api.draws.init);
  const drawNumber = useMutation(api.draws.drawNumber);
  const resetDraw = useMutation(api.draws.reset);
  const undoLast = useMutation(api.draws.undoLast);
  const drawSpecific = useMutation(api.draws.drawSpecific);
  const awardPrize = useMutation(api.prizeAwards.award);
  const awardTieMutation = useMutation(api.prizeAwards.awardTie);
  const removeAwardByPosition = useMutation(api.prizeAwards.removeByPosition);
  const removeAllAwards = useMutation(api.prizeAwards.removeAllByEvent);
  const updateStatus = useMutation(api.events.updateStatus);
  const toggleSalesBlock = useMutation(api.draws.toggleSalesBlock);
  const sendTrackingEmails = useAction(api.emails.sendTrackingEmails);

  const buyerTrackingStatus = useQuery(api.appSettings.getBuyerTrackingStatus);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSender, setEmailSender] = useState("");
  const [sendingEmails, setSendingEmails] = useState(false);

  const [manualInput, setManualInput] = useState("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  const [selectedPrizePosition, setSelectedPrizePosition] = useState<string>("");

  const [showRegisterWinner, setShowRegisterWinner] = useState(false);
  const [registerWinnerCard, setRegisterWinnerCard] = useState("");
  const [registerWinnerName, setRegisterWinnerName] = useState("");
  const [registerWinnerSaving, setRegisterWinnerSaving] = useState(false);

  // Dialogs for reset
  const [showResetAll, setShowResetAll] = useState(false);
  const [showResetPrize, setShowResetPrize] = useState(false);
  const [resetPrizePosition, setResetPrizePosition] = useState<string>("");
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  const drawnNumbers = draw?.drawnNumbers ?? [];

  const scores = useQuery(
    api.cards.getTopScores,
    selectedEvent && drawnNumbers.length > 0
      ? { eventId, drawnNumbers }
      : "skip"
  );

  const [drawing, setDrawing] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(5);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevMaxScore = useRef<number>(0);

  // Track if we already fired the finalization for this session (avoid repeated toasts)
  const finalizedToastFired = useRef(false);

  useEffect(() => {
    if (selectedEvent) {
      initDraw({ eventId }).catch(() => null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  // Alert logic
  useEffect(() => {
    if (!scores) return;
    const max = scores.maxScore;
    const prev = prevMaxScore.current;
    if (max !== prev) {
      prevMaxScore.current = max;
      if (max >= 20) {
        setAutoPlay(false);
        playAlert(880, 5);
      } else if (max === 19 && prev < 19) {
        playAlert(660, 3);
        toast.warning("🔥 Cartela(s) na boia! Falta 1 para o bingo!", { duration: 6000 });
      } else if (max === 18 && prev < 18) {
        playAlert(440, 2);
        toast.info("⚠️ Atenção! Cartela(s) com 18 pontos!", { duration: 5000 });
      }
    }
  }, [scores]);

  const prizes = event?.prizes ?? [];
  const awardedPositions = new Set((awards ?? []).map((a) => a.prizePosition));
  const availablePrizes = prizes.filter((p) => !awardedPositions.has(p.position));
  const allPrizesAwarded = prizes.length > 0 && availablePrizes.length === 0;
  const isFinished = event?.status === "finished";

  // Auto-finalize when all prizes awarded
  useEffect(() => {
    if (allPrizesAwarded && !isFinished && selectedEvent && !finalizedToastFired.current) {
      finalizedToastFired.current = true;
      setAutoPlay(false);
      playFanfare();
      updateStatus({ eventId, status: "finished" })
        .then(() => toast.success("🏆 Todos os prêmios concedidos! Evento finalizado automaticamente.", { duration: 8000 }))
        .catch(() => null);
    }
    // Reset the flag if event is reopened
    if (!allPrizesAwarded) {
      finalizedToastFired.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPrizesAwarded, isFinished, selectedEvent]);

  const handleDraw = useCallback(async (silent = false) => {
    if (!selectedEvent) return;
    setDrawing(true);
    try {
      const num = await drawNumber({ eventId });
      setAnimKey((k) => k + 1);
      playBeep();
      if (!silent) toast.success(`Número sorteado: ${num}!`);
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      }
      setAutoPlay(false);
    } finally {
      setDrawing(false);
    }
  }, [selectedEvent, drawNumber, eventId]);

  // Auto-draw timer
  useEffect(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    if (autoPlay && !drawing) {
      autoTimerRef.current = setTimeout(() => {
        void handleDraw(true);
      }, autoSpeed * 1000);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [autoPlay, drawing, autoSpeed, handleDraw]);

  useEffect(() => {
    if (draw && draw.drawnNumbers.length >= 75) setAutoPlay(false);
  }, [draw]);
  useEffect(() => {
    if (scores && scores.winners.length > 0) setAutoPlay(false);
  }, [scores]);

  const handleUndo = async () => {
    if (!selectedEvent) return;
    try {
      const num = await undoLast({ eventId });
      toast.info(`Número ${num} removido do sorteio`);
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      }
    }
  };

  const handleManualDraw = async () => {
    const num = parseInt(manualInput.trim());
    if (isNaN(num)) {
      toast.error("Digite um número válido");
      manualInputRef.current?.focus();
      return;
    }
    setManualInput("");
    try {
      await drawSpecific({ eventId, number: num });
      setAnimKey((k) => k + 1);
      playBeep();
      toast.success(`Número ${num} adicionado!`);
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      }
    } finally {
      manualInputRef.current?.focus();
    }
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void handleManualDraw();
  };

  const handleReset = async () => {
    setAutoPlay(false);
    prevMaxScore.current = 0;
    await resetDraw({ eventId });
    await removeAllAwards({ eventId });
    toast.success("Sorteio reiniciado");
    setShowResetAll(false);
  };

  const handleResetAll = async () => {
    setAutoPlay(false);
    prevMaxScore.current = 0;
    await resetDraw({ eventId });
    await removeAllAwards({ eventId });
    toast.success("Todos os sorteios foram reiniciados");
    setShowResetAll(false);
  };

  const handleResetPrize = async () => {
    const pos = parseInt(resetPrizePosition);
    if (isNaN(pos)) return;
    await removeAwardByPosition({ eventId, prizePosition: pos });
    await resetDraw({ eventId });
    prevMaxScore.current = 0;
    toast.success(`Sorteio do ${pos}º prêmio reiniciado`);
    setShowResetPrize(false);
    setResetPrizePosition("");
  };

  const handleReopen = async () => {
    await updateStatus({ eventId, status: "in_progress" });
    finalizedToastFired.current = false;
    toast.success("Evento reaberto! Você pode reiniciar sorteios.");
    setShowReopenConfirm(false);
  };

  const handleRegisterWinner = async () => {
    const cardNum = parseInt(registerWinnerCard.trim());
    if (isNaN(cardNum) || cardNum < 1) { toast.error("Informe um número de cartela válido"); return; }
    const prizePos = parseInt(selectedPrizePosition);
    if (isNaN(prizePos)) { toast.error("Selecione um prêmio antes de registrar"); return; }
    const prize = prizes.find((p) => p.position === prizePos);
    if (!prize) { toast.error("Prêmio não encontrado"); return; }
    setRegisterWinnerSaving(true);
    try {
      await awardPrize({
        eventId,
        prizePosition: prize.position,
        prizeDescription: prize.description,
        winnerCardNumber: cardNum,
        winnerName: registerWinnerName.trim() || undefined,
      });
      toast.success(`${prize.description} — Cartela #${String(cardNum).padStart(6, "0")} registrada!`);
      setShowRegisterWinner(false);
      setRegisterWinnerCard("");
      setRegisterWinnerName("");
      // If there are more prizes, prompt to start next draw
      const remaining = availablePrizes.filter((p) => p.position !== prize.position);
      if (remaining.length > 0) {
        setShowNextPrize(true);
      }
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Erro ao registrar ganhador");
      }
    } finally {
      setRegisterWinnerSaving(false);
    }
  };

  // State to show "next prize" prompt after registering a winner
  const [showNextPrize, setShowNextPrize] = useState(false);

  // ── Tie-breaker state ─────────────────────────────────────────────────────
  const [showTieBreaker, setShowTieBreaker] = useState(false);
  const [tieRockResult, setTieRockResult] = useState<{ cardNumber: number; rock: number }[] | null>(null);
  const [tieSaving, setTieSaving] = useState(false);
  const [tieMode, setTieMode] = useState<"auto" | "manual">("auto");
  const [tieManualCard, setTieManualCard] = useState<number | null>(null);
  const [tieManualNumber, setTieManualNumber] = useState("");
  // Sequential spin state
  const [tieSpinCurrentCard, setTieSpinCurrentCard] = useState(0); // index of card being spun
  const [tieSpinning, setTieSpinning] = useState(false); // spinning animation active
  const [tieSpinDisplay, setTieSpinDisplay] = useState<number | null>(null); // number shown during spin
  const [tiePrecomputedResults, setTiePrecomputedResults] = useState<{ cardNumber: number; rock: number }[] | null>(null);

  // Auto-open tie-breaker when multiple winners appear
  const prevWinnersCount = useRef(0);
  useEffect(() => {
    if (!scores) return;
    const n = scores.winners.length;
    if (n > 1 && prevWinnersCount.current <= 1) {
      setShowTieBreaker(true);
      setTieRockResult(null);
    }
    if (n <= 1) setShowTieBreaker(false);
    prevWinnersCount.current = n;
  }, [scores]);

  const handleTieRockDraw = () => {
    if (!scores) return;
    const numCards = scores.winners.length;
    // Build a pool large enough (1–75) excluding numbers already drawn in the main game
    const drawnSet = new Set(drawnNumbers);
    const available = Array.from({ length: 75 }, (_, i) => i + 1).filter((n) => !drawnSet.has(n));
    // Shuffle available numbers (Fisher-Yates) then take one unique number per card
    const shuffled = [...available];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // If not enough numbers (very unlikely), wrap around with fresh pool
    const pool = shuffled.length >= numCards ? shuffled : [...shuffled, ...Array.from({ length: 75 }, (_, i) => i + 1)];
    const results = scores.winners.map((w, idx) => ({
      cardNumber: w.cardNumber,
      rock: pool[idx], // each card gets a different number guaranteed
    }));
    // Reset sequential spin
    setTiePrecomputedResults(results);
    setTieRockResult(null);
    setTieSpinCurrentCard(0);
    setTieSpinning(false);
    setTieSpinDisplay(null);
  };

  const tieSpinRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTieSpinCard = () => {
    if (!tiePrecomputedResults || tieSpinning) return;
    const target = tiePrecomputedResults[tieSpinCurrentCard];
    setTieSpinning(true);
    // Rapid number cycling animation
    let ticks = 0;
    const totalTicks = 20 + Math.floor(Math.random() * 10); // ~20-30 ticks
    tieSpinRef.current = setInterval(() => {
      // Show random numbers during spin
      setTieSpinDisplay(Math.floor(Math.random() * 75) + 1);
      ticks++;
      if (ticks >= totalTicks) {
        if (tieSpinRef.current) clearInterval(tieSpinRef.current);
        // Land on the final number
        setTieSpinDisplay(target.rock);
        setTieSpinning(false);
        // Reveal this card's result
        setTieRockResult((prev) => {
          const existing = prev ?? [];
          return [...existing, target];
        });
        setTieSpinCurrentCard((prev) => prev + 1);
      }
    }, 80);
  };

  const handleTieManualConfirm = async () => {
    if (!selectedPrize || tieManualCard === null) return;
    const num = parseInt(tieManualNumber);
    if (isNaN(num) || num < 1 || num > 75) { toast.error("Informe um número válido entre 1 e 75"); return; }
    if (drawnNumbers.includes(num)) { toast.error(`O número ${num} já foi sorteado anteriormente`); return; }
    const winnerCard = scores?.winners.find((w) => w.cardNumber === tieManualCard);
    setTieSaving(true);
    try {
      await awardPrize({
        eventId,
        prizePosition: selectedPrize.position,
        prizeDescription: selectedPrize.description,
        winnerCardNumber: tieManualCard,
        winnerName: winnerCard?.buyerName,
      });
      toast.success(`Cartela #${tieManualCard} venceu com pedra ${num}!`);
      setShowTieBreaker(false);
      setTieRockResult(null);
      setTieManualCard(null);
      setTieManualNumber("");
      const remaining = availablePrizes.filter((p) => p.position !== selectedPrize.position);
      if (remaining.length > 0) setShowNextPrize(true);
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Erro ao registrar ganhador");
      }
    } finally {
      setTieSaving(false);
    }
  };
  const handleTieConfirmRock = async () => {
    if (!tieRockResult || !selectedPrize) return;
    const maxRock = Math.max(...tieRockResult.map((r) => r.rock));
    const topRockers = tieRockResult.filter((r) => r.rock === maxRock);
    // If still tied in the rock draw, require re-roll
    if (topRockers.length > 1) {
      toast.warning("Empate na pedra! Sorteie novamente para desempatar.");
      return;
    }
    const winner = topRockers[0];
    setTieSaving(true);
    try {
      const winnerCard = scores!.winners.find((w) => w.cardNumber === winner.cardNumber);
      await awardPrize({
        eventId,
        prizePosition: selectedPrize.position,
        prizeDescription: selectedPrize.description,
        winnerCardNumber: winner.cardNumber,
        winnerName: winnerCard?.buyerName,
      });
      toast.success(`Pedra maior: Cartela #${winner.cardNumber} ganhou com ${winner.rock}!`);
      setShowTieBreaker(false);
      setTieRockResult(null);
      setTiePrecomputedResults(null);
      setTieSpinCurrentCard(0);
      setTieSpinDisplay(null);
      const remaining = availablePrizes.filter((p) => p.position !== selectedPrize.position);
      if (remaining.length > 0) setShowNextPrize(true);
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Erro ao registrar ganhador");
      }
    } finally {
      setTieSaving(false);
    }
  };

  const handleTieDivide = async () => {
    if (!scores || !selectedPrize) return;
    setTieSaving(true);
    try {
      await awardTieMutation({
        eventId,
        prizePosition: selectedPrize.position,
        prizeDescription: selectedPrize.description,
        winners: scores.winners.map((w) => ({
          winnerCardNumber: w.cardNumber,
          winnerName: w.buyerName,
        })),
      });
      toast.success(`Prêmio dividido entre ${scores.winners.length} cartelas!`);
      setShowTieBreaker(false);
      setTieRockResult(null);
      const remaining = availablePrizes.filter((p) => p.position !== selectedPrize.position);
      if (remaining.length > 0) setShowNextPrize(true);
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Erro ao dividir prêmio");
      }
    } finally {
      setTieSaving(false);
    }
  };


  // ── Print awarded report ──────────────────────────────────────────────────
  const handlePrintReport = () => {
    if (!event || !awards || awards.length === 0) return;
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) { toast.error("Popup bloqueado. Permita popups e tente novamente."); return; }
    win.document.write(`
      <html><head><title>Relatório de Prêmios</title>
      <style>
        body { font-family: monospace; font-size: 14px; padding: 32px; color: #111; }
        h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .sub { color: #555; font-size: 13px; margin-bottom: 16px; }
        .sep { border-top: 2px solid #333; margin: 12px 0; }
        .row { margin-bottom: 14px; padding: 10px 14px; border: 1px solid #ccc; border-radius: 6px; }
        .prize { font-size: 13px; color: #555; }
        .card { font-size: 20px; font-weight: bold; margin: 2px 0; }
        .name { font-size: 13px; color: #333; }
        .footer { margin-top: 20px; font-size: 12px; color: #777; }
        @media print { button { display: none; } }
      </style></head><body>
      <h1>🏆 Relatório de Prêmios</h1>
      <div class="sub">${event.name} — ${new Date().toLocaleDateString("pt-BR")}</div>
      <div class="sep"></div>
      ${awards.sort((a, b) => a.prizePosition - b.prizePosition).map((a) => `
        <div class="row">
          <div class="prize">${a.prizePosition}º Prêmio — ${a.prizeDescription}</div>
          <div class="card">#${String(a.winnerCardNumber).padStart(6, "0")}</div>
          ${a.winnerName ? `<div class="name">${a.winnerName}</div>` : ""}
        </div>
      `).join("")}
      <div class="sep"></div>
      <div class="footer">Total de prêmios concedidos: ${awards.length}</div>
      <br/><button onclick="window.print()">🖨️ Imprimir</button>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  // ── Next prize: reset numbers, keep awards, advance prize selector ────────
  const handleNextPrize = async () => {
    setAutoPlay(false);
    prevMaxScore.current = 0;
    await resetDraw({ eventId });
    // Advance to next available prize
    const nextPrize = availablePrizes.find((p) => p.position !== parseInt(selectedPrizePosition));
    if (nextPrize) setSelectedPrizePosition(String(nextPrize.position));
    else setSelectedPrizePosition("");
    setShowNextPrize(false);
    toast.success("Números zerados! Inicie o próximo sorteio.");
  };
  const handleSendEmails = async () => {
    if (!emailSender.trim() || !selectedEvent) return;
    setSendingEmails(true);
    try {
      const appUrl = window.location.origin;
      const result = await sendTrackingEmails({ eventId, senderEmail: emailSender.trim(), appUrl });
      if (result.sent === 0) {
        toast.info("Nenhum comprador com e-mail cadastrado encontrado para este evento.");
      } else {
        toast.success(`E-mails enviados: ${result.sent}${result.failed > 0 ? ` (${result.failed} falharam)` : ""}`);
      }
      setShowEmailModal(false);
    } catch {
      toast.error("Erro ao enviar e-mails. Verifique se o e-mail remetente está verificado no Hercules.");
    } finally {
      setSendingEmails(false);
    }
  };

  const lastDrawn = draw?.lastDrawn;
  const selectedPrize = prizes.find((p) => p.position === parseInt(selectedPrizePosition));
  const colIdx = lastDrawn !== undefined ? getColumn(lastDrawn) : -1;
  const last5 = drawnNumbers.slice(-5).reverse();
  const allDone = drawnNumbers.length >= 75;
  const hasWinners = (scores?.winners.length ?? 0) > 0;
  const maxScore = scores?.maxScore ?? 0;
  const drawBlocked = isFinished || allPrizesAwarded;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-foreground">Sorteio</h2>
        <p className="text-muted-foreground font-medium mt-1">Painel eletrônico de sorteio</p>
      </div>

      {/* SALES BLOCKED BANNER */}
      <AnimatePresence>
        {draw?.salesBlocked && selectedEvent && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 flex items-center gap-4 p-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-400 rounded-2xl shadow"
          >
            <Lock className="w-8 h-8 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-base font-black text-red-800 dark:text-red-300">Vendas Bloqueadas</p>
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                Nenhum vendedor pode registrar novas vendas neste evento enquanto o bloqueio estiver ativo.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FINISHED BANNER */}
      <AnimatePresence>
        {isFinished && selectedEvent && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 flex flex-col sm:flex-row items-center gap-4 p-5 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-400 rounded-2xl shadow"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500 shrink-0" />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-lg font-black text-emerald-800 dark:text-emerald-300">Evento Finalizado!</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Todos os {prizes.length} prêmio(s) foram concedidos. O evento está encerrado.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={handlePrintReport}
              >
                <Printer className="w-4 h-4" />
                Imprimir Relatório
              </Button>
              {buyerTrackingStatus?.enabled && (
                <Button
                  variant="secondary"
                  className="gap-2"
                  onClick={() => setShowEmailModal(true)}
                >
                  <Mail className="w-4 h-4" />
                  Enviar Link por E-mail
                </Button>
              )}
              <Button
                variant="secondary"
                className="gap-2 border border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100"
                onClick={() => setShowReopenConfirm(true)}
              >
                <LockOpen className="w-4 h-4" />
                Reabrir Evento
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => setShowResetAll(true)}
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar Tudo
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                onClick={() => setShowResetPrize(true)}
              >
                <RefreshCw className="w-4 h-4" />
                Reiniciar Prêmio
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event selector */}
      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-card rounded-xl border">
        <div className="flex-1 min-w-48 space-y-1.5">
          <label className="text-sm font-semibold text-foreground">Selecionar Evento</label>
          <Select value={selectedEvent} onValueChange={(v) => {
            setSelectedEvent(v);
            sessionStorage.setItem("draw_selectedEvent", v);
            setAutoPlay(false);
            prevMaxScore.current = 0;
            setSelectedPrizePosition("");
            finalizedToastFired.current = false;
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um evento..." />
            </SelectTrigger>
            <SelectContent>
              {events?.map((e) => (
                <SelectItem key={e._id} value={e._id}>
                  {e.name}
                  {e.status === "finished" && " ✓"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prize selector */}
        {selectedEvent && prizes.length > 0 && !isFinished && (
          <div className="flex-1 min-w-48 space-y-1.5">
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" />
              Prêmio deste sorteio
            </label>
            <Select value={selectedPrizePosition} onValueChange={setSelectedPrizePosition}>
              <SelectTrigger className={selectedPrize ? "border-yellow-400 ring-1 ring-yellow-400" : ""}>
                <SelectValue placeholder="Selecione o prêmio..." />
              </SelectTrigger>
              <SelectContent>
                {availablePrizes.map((p) => (
                  <SelectItem key={p.position} value={String(p.position)}>
                    {p.position}º — {p.description}
                  </SelectItem>
                ))}
                {availablePrizes.length === 0 && (
                  <SelectItem value="none" disabled>Todos os prêmios já foram concedidos</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedEvent && !isFinished && (
          <>
            <Button
              size="lg"
              onClick={() => handleDraw(false)}
              disabled={drawing || allDone || autoPlay || hasWinners || drawBlocked}
              className="gap-2 font-bold text-base px-6"
            >
              <Shuffle className="w-5 h-5" />
              {drawing ? "Sorteando..." : "Sortear"}
            </Button>

            <Button
              size="lg"
              variant={autoPlay ? "destructive" : "secondary"}
              onClick={() => setAutoPlay(!autoPlay)}
              disabled={allDone || hasWinners || drawBlocked}
              className="gap-2 font-bold"
            >
              {autoPlay ? <><Pause className="w-4 h-4" />Pausar</> : <><Play className="w-4 h-4" />Auto</>}
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={handleUndo}
              disabled={drawnNumbers.length === 0 || autoPlay}
              className="gap-2"
            >
              <Undo2 className="w-4 h-4" />
              Desfazer
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={() => setShowResetAll(true)}
              disabled={autoPlay}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={() => window.open(`/telao?event=${selectedEvent}`, "_blank")}
              className="gap-2 ml-auto"
            >
              <Tv className="w-4 h-4" />
              Telão
            </Button>

            <Button
              size="lg"
              variant={draw?.salesBlocked ? "destructive" : "secondary"}
              onClick={async () => {
                try {
                  const blocked = await toggleSalesBlock({ eventId });
                  toast[blocked ? "warning" : "success"](
                    blocked ? "Vendas bloqueadas! Vendedores não podem mais registrar vendas." : "Vendas desbloqueadas! Vendedores podem voltar a vender."
                  );
                } catch {
                  toast.error("Erro ao alterar bloqueio de vendas");
                }
              }}
              className="gap-2"
              title={draw?.salesBlocked ? "Desbloquear vendas" : "Bloquear vendas"}
            >
              {draw?.salesBlocked ? <><LockOpen className="w-4 h-4" />Desbloquear Vendas</> : <><Lock className="w-4 h-4" />Bloquear Vendas</>}
            </Button>

            {buyerTrackingStatus?.enabled && (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setShowEmailModal(true)}
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                Enviar Link por E-mail
              </Button>
            )}

            {/* Manual number input */}
            <div className="flex items-center gap-2 w-full mt-2 border-t pt-3">
              <label className="text-sm font-semibold text-foreground shrink-0">Digitar número:</label>
              <input
                ref={manualInputRef}
                type="number"
                min={1}
                max={75}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={handleManualKeyDown}
                disabled={allDone || hasWinners || autoPlay || drawBlocked}
                placeholder="1–75 e Enter"
                className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <Button
                size="sm"
                onClick={() => void handleManualDraw()}
                disabled={!manualInput || allDone || hasWinners || autoPlay || drawBlocked}
                className="gap-1"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Confirmar
              </Button>
              <span className="text-xs text-muted-foreground">Pressione Enter para sortear</span>
            </div>
          </>
        )}

        {/* When finished: show only Telão button */}
        {selectedEvent && isFinished && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => window.open(`/telao?event=${selectedEvent}`, "_blank")}
            className="gap-2 ml-auto"
          >
            <Tv className="w-4 h-4" />
            Telão
          </Button>
        )}
      </div>

      {/* Prize badge */}
      {selectedEvent && selectedPrize && !isFinished && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-700 rounded-xl">
          <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
          <span className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
            Sorteando para: {selectedPrize.position}º Prêmio — {selectedPrize.description}
          </span>
        </div>
      )}

      {/* Awarded prizes summary */}
      {selectedEvent && (awards ?? []).length > 0 && (
        <div className="mb-4 p-4 bg-card border rounded-xl">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-3">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Prêmios Concedidos
          </h3>
          <div className="space-y-2">
            {(awards ?? []).sort((a, b) => a.prizePosition - b.prizePosition).map((a) => (
              <div key={a._id} className="flex items-center gap-3 text-sm">
                <span className="font-black text-yellow-600 w-6 shrink-0">{a.prizePosition}º</span>
                <span className="font-semibold flex-1">{a.prizeDescription}</span>
                <span className="text-muted-foreground font-mono">#{String(a.winnerCardNumber).padStart(6, "0")}</span>
                {a.winnerName && <span className="text-muted-foreground hidden sm:block">{a.winnerName}</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    setResetPrizePosition(String(a.prizePosition));
                    setShowResetPrize(true);
                  }}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reiniciar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedEvent ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Shuffle /></EmptyMedia>
            <EmptyTitle>Selecione um evento</EmptyTitle>
            <EmptyDescription>Escolha um evento para iniciar o sorteio</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-6">

          {/* WINNER BANNER */}
          <AnimatePresence>
            {hasWinners && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" as const }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-yellow-300 to-amber-400 p-8 text-center shadow-2xl border-4 border-yellow-500"
              >
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
                />
                <motion.div
                  animate={{ rotate: [0, -3, 3, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-6xl mb-3"
                >
                  🎉
                </motion.div>
                <h2 className="text-4xl font-black text-black mb-1 drop-shadow">TEMOS GANHADOR!</h2>
                {selectedPrize && (
                  <p className="text-black/80 font-black text-xl mb-1">
                    {selectedPrize.position}º Prêmio — {selectedPrize.description}
                  </p>
                )}
                <p className="text-black/70 font-semibold text-lg mb-6">
                  {scores!.winners.length === 1 ? "Cartela vencedora:" : `${scores!.winners.length} cartelas vencedoras:`}
                </p>
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {scores!.winners.map((w) => (
                    <div key={w.cardNumber} className="bg-black/10 rounded-xl px-6 py-4 border-2 border-black/20">
                      <p className="text-4xl font-black text-black">#{String(w.cardNumber).padStart(6, "0")}</p>
                      {w.buyerName && (
                        <p className="text-black/70 font-semibold text-sm mt-1">{w.buyerName}</p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mb-4 text-black/60 font-medium text-sm">
                  {drawnNumbers.length} números sorteados
                </p>
                {selectedPrize && !awardedPositions.has(selectedPrize.position) && (
                  <Button
                    size="lg"
                    className="bg-black/20 hover:bg-black/30 text-black font-bold border border-black/20 gap-2"
                    onClick={() => {
                      if (scores!.winners.length === 1) {
                        setRegisterWinnerCard(String(scores!.winners[0].cardNumber));
                        setRegisterWinnerName(scores!.winners[0].buyerName ?? "");
                      }
                      setShowRegisterWinner(true);
                    }}
                  >
                    <Trophy className="w-5 h-5" />
                    Registrar Ganhador
                  </Button>
                )}
                {selectedPrize && awardedPositions.has(selectedPrize.position) && (
                  <div className="inline-flex items-center gap-2 bg-black/15 rounded-lg px-4 py-2 text-black/70 font-semibold text-sm">
                    <Trophy className="w-4 h-4" />
                    Prêmio já registrado
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* TIE-BREAKER INLINE PANEL */}
          <AnimatePresence>
            {scores && scores.winners.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-5 bg-violet-50 dark:bg-violet-950/30 border-2 border-violet-400 rounded-2xl shadow space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">🤝</span>
                  <h3 className="font-black text-violet-800 dark:text-violet-200 text-lg">Empate — Pedra Maior</h3>
                  <span className="ml-auto text-xs text-violet-600 dark:text-violet-400 font-semibold">{scores.winners.length} cartelas empatadas</span>
                </div>
                {!selectedPrize && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    ⚠️ Selecione um prêmio acima antes de confirmar o vencedor do empate.
                  </p>
                )}

                {/* Mode toggle */}
                <div className="flex rounded-lg border border-violet-300 dark:border-violet-700 overflow-hidden">
                  <button
                    className={`flex-1 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${tieMode === "auto" ? "bg-violet-500 text-white" : "bg-violet-100 dark:bg-violet-900/30 text-violet-600"}`}
                    onClick={() => setTieMode("auto")}
                  >
                    🤖 Automático
                  </button>
                  <button
                    className={`flex-1 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${tieMode === "manual" ? "bg-violet-500 text-white" : "bg-violet-100 dark:bg-violet-900/30 text-violet-600"}`}
                    onClick={() => setTieMode("manual")}
                  >
                    🔮 Globo Manual
                  </button>
                </div>

                {tieMode === "auto" ? (
                  <div className="space-y-4">
                    {/* Spin ball display */}
                    {tiePrecomputedResults && (
                      <div className="flex flex-col items-center gap-3 py-2">
                        {/* Current card being spun */}
                        {tieSpinCurrentCard < tiePrecomputedResults.length && (
                          <div className="text-center">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                              Girando para cartela{" "}
                              <span className="font-black text-violet-700 dark:text-violet-300">
                                #{String(tiePrecomputedResults[tieSpinCurrentCard].cardNumber).padStart(3, "0")}
                              </span>
                            </p>
                            {/* Ball */}
                            <div className={`mx-auto w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-xl border-4 transition-all duration-100 ${
                              tieSpinning
                                ? "bg-gradient-to-br from-violet-500 to-purple-700 border-violet-300 scale-105"
                                : tieSpinDisplay !== null
                                  ? "bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-300"
                                  : "bg-gradient-to-br from-violet-400 to-purple-600 border-violet-300 opacity-60"
                            }`}>
                              {tieSpinDisplay !== null ? (
                                <span className={`font-black text-white text-4xl leading-none ${tieSpinning ? "opacity-80" : ""}`}>
                                  {tieSpinDisplay}
                                </span>
                              ) : (
                                <span className="text-white/60 text-3xl font-black">?</span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="mt-3 gap-1 bg-violet-600 hover:bg-violet-700 text-white"
                              disabled={tieSpinning}
                              onClick={handleTieSpinCard}
                            >
                              🪨 {tieSpinDisplay !== null && !tieSpinning ? "Girar Próxima" : "Girar Pedra"}
                            </Button>
                          </div>
                        )}

                        {/* Results revealed so far */}
                        {(tieRockResult ?? []).length > 0 && (
                          <div className="w-full">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">Resultados</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {(tieRockResult ?? []).map((r) => {
                                const maxRock = Math.max(...(tieRockResult ?? []).map((x) => x.rock));
                                const isWinner = r.rock === maxRock;
                                const card = scores.winners.find((w) => w.cardNumber === r.cardNumber);
                                return (
                                  <div key={r.cardNumber} className={`rounded-xl px-4 py-2 border-2 text-center min-w-[80px] ${
                                    isWinner ? "border-yellow-500 bg-yellow-500/10" : "border-muted bg-muted/30"
                                  }`}>
                                    <p className="font-black text-sm">#{String(r.cardNumber).padStart(3, "0")}</p>
                                    {card?.buyerName && <p className="text-xs text-muted-foreground">{card.buyerName}</p>}
                                    <p className={`text-2xl font-black mt-1 ${isWinner ? "text-yellow-500" : "text-muted-foreground"}`}>
                                      {r.rock}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Not yet started */}
                    {!tiePrecomputedResults && (
                      <Button size="sm" className="gap-1" onClick={handleTieRockDraw}>
                        🪨 Iniciar Pedra Maior
                      </Button>
                    )}

                    {/* All cards spun — show confirm / redo */}
                    {tiePrecomputedResults && tieSpinCurrentCard >= tiePrecomputedResults.length && (tieRockResult ?? []).length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold gap-1 disabled:opacity-50"
                          disabled={tieSaving || !selectedPrize}
                          title={!selectedPrize ? "Selecione um prêmio primeiro" : ""}
                          onClick={() => void handleTieConfirmRock()}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {tieSaving ? "Registrando..." : !selectedPrize ? "Selecione um prêmio" : "Confirmar Vencedor"}
                        </Button>
                        <button className="text-xs text-muted-foreground underline cursor-pointer" onClick={handleTieRockDraw}>
                          Sortear novamente
                        </button>
                        <Button size="sm" variant="secondary" disabled={tieSaving} onClick={() => void handleTieDivide()}>
                          ✂️ {tieSaving ? "Registrando..." : "Dividir Prêmio"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Cartela vencedora</p>
                      <div className="flex flex-wrap gap-2">
                        {scores.winners.map((w) => (
                          <button
                            key={w.cardNumber}
                            onClick={() => setTieManualCard(w.cardNumber)}
                            className={`px-3 py-1.5 rounded-lg border-2 font-black text-sm cursor-pointer transition-all ${
                              tieManualCard === w.cardNumber
                                ? "border-violet-500 bg-violet-500/10 text-violet-700"
                                : "border-muted text-muted-foreground hover:border-violet-400"
                            }`}
                          >
                            #{String(w.cardNumber).padStart(3, "0")}
                            {w.buyerName && <span className="font-normal ml-1 text-xs">({w.buyerName})</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Número sorteado no globo (não sorteados anteriormente)</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={75}
                          placeholder="Ex: 42"
                          value={tieManualNumber}
                          onChange={(e) => setTieManualNumber(e.target.value)}
                          className="w-28"
                        />
                        {tieManualNumber && drawnNumbers.includes(parseInt(tieManualNumber)) && (
                          <span className="text-xs text-red-500 font-semibold">Número já sorteado!</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold gap-1"
                      disabled={tieSaving || tieManualCard === null || !tieManualNumber}
                      onClick={() => void handleTieManualConfirm()}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      {tieSaving ? "Registrando..." : "Confirmar Ganhador"}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* NEXT PRIZE PROMPT */}
          <AnimatePresence>
            {showNextPrize && availablePrizes.length > 0 && !isFinished && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-400 rounded-2xl shadow"
              >
                <ArrowRight className="w-8 h-8 text-blue-500 shrink-0" />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-base font-black text-blue-800 dark:text-blue-300">Prêmio registrado!</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                    Próximo: <strong>{availablePrizes[0]?.position}º — {availablePrizes[0]?.description}</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowNextPrize(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={() => void handleNextPrize()}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Iniciar próximo sorteio
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ALERT BANNERS */}
          <AnimatePresence>
            {!hasWinners && maxScore === 19 && (
              <motion.div
                key="alert-19"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-red-500 text-white rounded-xl px-5 py-4 font-bold text-lg shadow-lg"
              >
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}>🔥</motion.div>
                <span>CARTELA(S) NA BOIA! — {scores?.top.filter(t => t.score === 19).length} cartela(s) com 19 pontos — Falta 1!</span>
              </motion.div>
            )}
            {!hasWinners && maxScore === 18 && (
              <motion.div
                key="alert-18"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-orange-500 text-white rounded-xl px-5 py-4 font-bold shadow-lg"
              >
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>ATENÇÃO! — {scores?.top.filter(t => t.score === 18).length} cartela(s) com 18 pontos</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto-speed control */}
          {!isFinished && (
            <div className="flex items-center gap-4 bg-card border rounded-xl px-5 py-3">
              <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                Velocidade automática:
              </span>
              <div className="flex-1">
                <Slider
                  min={2}
                  max={30}
                  step={1}
                  value={[autoSpeed]}
                  onValueChange={([v]) => setAutoSpeed(v)}
                  className="w-full"
                />
              </div>
              <span className="text-sm font-bold w-16 text-right">{autoSpeed}s / número</span>
              {autoPlay && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: autoSpeed, ease: "linear" as const }}
                  className="w-3 h-3 rounded-full bg-green-500 shrink-0"
                />
              )}
            </div>
          )}

          {/* Last drawn number + history strip */}
          <div className="flex flex-col items-center py-6 gap-6">
            <p className="text-muted-foreground font-semibold text-xs uppercase tracking-widest">Último Número</p>
            <AnimatePresence mode="wait">
              {lastDrawn !== undefined ? (
                <motion.div
                  key={animKey}
                  initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" as const }}
                >
                  <div className={`w-40 h-40 rounded-full ${COL_COLORS[colIdx]} shadow-2xl ring-4 ${COL_RING[colIdx]} ring-offset-2 flex flex-col items-center justify-center gap-1`}>
                    <span className="text-white/80 font-black text-3xl leading-none">{SORTE_LETTERS[colIdx]}</span>
                    <span className="text-white font-black text-6xl leading-none">{lastDrawn}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="w-40 h-40 rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center"
                >
                  <Shuffle className="w-12 h-12 text-muted-foreground/30" />
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-muted-foreground text-sm font-medium">{drawnNumbers.length} de 75 números sorteados</p>

            {last5.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mr-1">Anteriores:</span>
                {last5.slice(1).map((n, i) => {
                  const ci = getColumn(n);
                  const opacity = i === 0 ? "opacity-80" : i === 1 ? "opacity-60" : "opacity-40";
                  const size = i === 0 ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
                  return (
                    <div
                      key={`${n}-${i}`}
                      className={`${size} rounded-full ${COL_COLORS[ci]} ${opacity} flex flex-col items-center justify-center text-white font-black transition-all`}
                    >
                      <span className="text-[9px] leading-none opacity-80">{SORTE_LETTERS[ci]}</span>
                      <span className="leading-none">{n}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* S-O-R-T-E grid */}
          <div className="grid grid-cols-5 gap-3">
            {SORTE_LETTERS.map((letter, col) => {
              const { min, max } = COL_RANGES[col];
              const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
              return (
                <div key={letter} className="space-y-2">
                  <div className={`${COL_COLORS[col]} text-white text-center font-black text-lg py-2 rounded-lg`}>
                    {letter}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {nums.map((n) => {
                      const drawn = drawnNumbers.includes(n);
                      const isLast = n === lastDrawn;
                      return (
                        <div
                          key={n}
                          className={`text-center text-xs font-bold py-1.5 rounded-md transition-all ${
                            isLast
                              ? `${COL_COLORS[col]} text-white scale-110 shadow-md ring-2 ${COL_RING[col]}`
                              : drawn
                              ? `${COL_COLORS[col]} opacity-50 text-white`
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {n}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {allDone && !hasWinners && !isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-6 bg-card border rounded-xl"
            >
              <p className="text-2xl font-black">Todos os 75 números foram sorteados!</p>
              <Button className="mt-4" onClick={() => setShowResetAll(true)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar Sorteio
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* ── DIALOGS ─────────────────────────────────────────────────────────── */}

      {/* Send Email Modal */}
      {showEmailModal && (
        <Dialog open onOpenChange={(v) => !v && setShowEmailModal(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-violet-600" />
                Enviar Link de Acompanhamento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Envie o link <strong>/minhas-cartelas</strong> para todos os compradores deste evento que têm e-mail cadastrado.
              </p>
              <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
                <strong>Atenção:</strong> o e-mail remetente precisa estar verificado no Hercules. Acesse a aba <strong>Emails</strong> no App Builder para verificar um endereço ou domínio antes de enviar.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senderEmail">E-mail remetente <span className="text-destructive">*</span></Label>
                <Input
                  id="senderEmail"
                  type="email"
                  placeholder="noreply@seudominio.com"
                  value={emailSender}
                  onChange={(e) => setEmailSender(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  O e-mail remetente deve estar verificado no Hercules (aba E-mail em Configurações).
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setShowEmailModal(false)} disabled={sendingEmails}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={!emailSender.trim() || sendingEmails}
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                {sendingEmails ? "Enviando..." : "Enviar E-mails"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Register Winner */}
      {showRegisterWinner && selectedPrize && (
        <Dialog open onOpenChange={(v) => !v && setShowRegisterWinner(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Registrar Ganhador
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Prêmio</p>
                <p className="font-bold">{selectedPrize.position}º — {selectedPrize.description}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Número da Cartela Ganhadora *</Label>
                <Input
                  type="number"
                  min={1}
                  value={registerWinnerCard}
                  onChange={(e) => setRegisterWinnerCard(e.target.value)}
                  placeholder="Ex: 42"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nome do Ganhador (opcional)</Label>
                <Input
                  value={registerWinnerName}
                  onChange={(e) => setRegisterWinnerName(e.target.value)}
                  placeholder="Maria Silva"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowRegisterWinner(false)}>Cancelar</Button>
              <Button onClick={() => void handleRegisterWinner()} disabled={registerWinnerSaving} className="gap-2">
                <Trophy className="w-4 h-4" />
                {registerWinnerSaving ? "Registrando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reset All */}
      <Dialog open={showResetAll} onOpenChange={setShowResetAll}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-destructive" />
              Reiniciar Sorteio
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">Escolha o que deseja reiniciar:</p>
            <div className="space-y-2">
              <Button
                className="w-full gap-2 justify-start"
                variant="secondary"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar apenas os números sorteados
              </Button>
              <Button
                className="w-full gap-2 justify-start"
                variant="destructive"
                onClick={() => void handleResetAll()}
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar tudo (números + todos os prêmios)
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowResetAll(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset specific prize */}
      <Dialog open={showResetPrize} onOpenChange={(v) => { setShowResetPrize(v); if (!v) setResetPrizePosition(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-amber-500" />
              Reiniciar Prêmio Específico
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Selecione o prêmio que deseja reiniciar. O registro do ganhador será removido e os números serão zerados para um novo sorteio.
            </p>
            <div className="space-y-1.5">
              <Label>Prêmio</Label>
              <Select value={resetPrizePosition} onValueChange={setResetPrizePosition}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o prêmio..." />
                </SelectTrigger>
                <SelectContent>
                  {(awards ?? []).sort((a, b) => a.prizePosition - b.prizePosition).map((a) => (
                    <SelectItem key={a.prizePosition} value={String(a.prizePosition)}>
                      {a.prizePosition}º — {a.prizeDescription} (#{String(a.winnerCardNumber).padStart(6, "0")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => { setShowResetPrize(false); setResetPrizePosition(""); }}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!resetPrizePosition || resetPrizePosition === ""}
              onClick={() => void handleResetPrize()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reiniciar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TIE BREAKER DIALOG ──────────────────────────────────────────────── */}
      {showTieBreaker && scores && scores.winners.length > 1 && selectedPrize && (
        <Dialog open onOpenChange={(v) => !v && setShowTieBreaker(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <span className="text-2xl">🤝</span>
                Empate detectado!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Prêmio em disputa</p>
                <p className="font-bold">{selectedPrize.position}º — {selectedPrize.description}</p>
              </div>

              <p className="text-sm text-muted-foreground">
                <strong>{scores.winners.length} cartelas</strong> atingiram 20 pontos ao mesmo tempo. Escolha como resolver:
              </p>

              {/* Tied cards list */}
              <div className="flex flex-wrap gap-2">
                {scores.winners.map((w) => (
                  <div key={w.cardNumber} className={`rounded-xl px-4 py-2 border-2 text-center flex-1 min-w-[80px] ${
                    tieRockResult
                      ? tieRockResult.find((r) => r.cardNumber === w.cardNumber)!.rock === Math.max(...tieRockResult.map((r) => r.rock))
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-muted bg-muted/30"
                      : "border-violet-400 bg-violet-500/10"
                  }`}>
                    <p className="font-black text-lg">#{String(w.cardNumber).padStart(3, "0")}</p>
                    {w.buyerName && <p className="text-xs text-muted-foreground">{w.buyerName}</p>}
                    {tieRockResult && (
                      <p className={`text-2xl font-black mt-1 ${
                        tieRockResult.find((r) => r.cardNumber === w.cardNumber)!.rock === Math.max(...tieRockResult.map((r) => r.rock))
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                      }`}>
                        {tieRockResult.find((r) => r.cardNumber === w.cardNumber)?.rock}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Options */}
              <div className="space-y-3 pt-1">
                {/* Mode toggle */}
                <div className="flex rounded-lg border overflow-hidden">
                  <button
                    className={`flex-1 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${tieMode === "auto" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}
                    onClick={() => setTieMode("auto")}
                  >
                    🤖 Automático
                  </button>
                  <button
                    className={`flex-1 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${tieMode === "manual" ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}
                    onClick={() => setTieMode("manual")}
                  >
                    🔮 Globo Manual
                  </button>
                </div>

                {tieMode === "auto" ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Pedra Maior automático */}
                    <div className="border rounded-xl p-4 space-y-3">
                      <div>
                        <p className="font-bold text-sm flex items-center gap-1">🪨 Pedra Maior</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Sorteia um número (apenas não sorteados) para cada cartela. Quem tirar o maior vence.</p>
                      </div>
                      {!tieRockResult ? (
                        <Button size="sm" className="w-full gap-1" onClick={handleTieRockDraw}>
                          Sortear
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full gap-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                          disabled={tieSaving}
                          onClick={() => void handleTieConfirmRock()}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {tieSaving ? "Registrando..." : "Confirmar"}
                        </Button>
                      )}
                      {tieRockResult && (
                        <button
                          className="text-xs text-muted-foreground underline w-full text-center cursor-pointer"
                          onClick={handleTieRockDraw}
                        >
                          Sortear novamente
                        </button>
                      )}
                    </div>

                    {/* Dividir prêmio */}
                    <div className="border rounded-xl p-4 space-y-3">
                      <div>
                        <p className="font-bold text-sm flex items-center gap-1">✂️ Dividir Prêmio</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Registra todas as cartelas empatadas como vencedoras deste prêmio.</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        disabled={tieSaving}
                        onClick={() => void handleTieDivide()}
                      >
                        {tieSaving ? "Registrando..." : "Dividir"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Manual mode - globe draw */
                  <div className="border rounded-xl p-4 space-y-3">
                    <div>
                      <p className="font-bold text-sm">🔮 Sorteio via Globo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Informe a cartela vencedora e o número que saiu no globo (apenas números ainda não sorteados são válidos).</p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Cartela vencedora</p>
                        <div className="flex flex-wrap gap-2">
                          {scores.winners.map((w) => (
                            <button
                              key={w.cardNumber}
                              onClick={() => setTieManualCard(w.cardNumber)}
                              className={`px-3 py-1.5 rounded-lg border-2 font-black text-sm cursor-pointer transition-all ${
                                tieManualCard === w.cardNumber
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-muted text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              #{String(w.cardNumber).padStart(3, "0")}
                              {w.buyerName && <span className="font-normal ml-1 text-xs">({w.buyerName})</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Número sorteado no globo</p>
                        <Input
                          type="number"
                          min={1}
                          max={75}
                          placeholder="Ex: 42"
                          value={tieManualNumber}
                          onChange={(e) => setTieManualNumber(e.target.value)}
                          className="w-32"
                        />
                        {tieManualNumber && drawnNumbers.includes(parseInt(tieManualNumber)) && (
                          <p className="text-xs text-red-500 mt-1">Este número já foi sorteado!</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                      disabled={tieSaving || tieManualCard === null || !tieManualNumber}
                      onClick={() => void handleTieManualConfirm()}
                    >
                      <Trophy className="w-3.5 h-3.5 mr-1" />
                      {tieSaving ? "Registrando..." : "Confirmar Ganhador"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setShowTieBreaker(false)}>
                Fechar (resolver manualmente)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reopen confirm */}
      <Dialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockOpen className="w-5 h-5 text-amber-500" />
              Reabrir Evento
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              O evento será reaberto e voltará ao estado ativo. Os prêmios já registrados serão mantidos. Você poderá reiniciar sorteios individuais conforme necessário.
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowReopenConfirm(false)}>Cancelar</Button>
            <Button
              className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => void handleReopen()}
            >
              <LockOpen className="w-4 h-4" />
              Reabrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
