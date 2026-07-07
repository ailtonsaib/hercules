import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { StarIcon, TrophyIcon, HelpCircleIcon, RefreshCwIcon, UserIcon } from "lucide-react";

export default function GiroSortePage() {
  const token = localStorage.getItem("hercules_session_token") || localStorage.getItem("token") || "";

  // 1. Estados de controle do sorteio e animações
  const [eventoSelecionado, setEventoSelecionado] = React.useState("");
  const [isGirando, setIsGirando] = React.useState(false);
  const [numeroExibido, setNumeroExibido] = React.useState("000000");
  const [ganhadorConfirmado, setGanhadorConfirmado] = React.useState<any>(null);

  // 2. Busca a lista de sorteios disponíveis
  const eventos = useQuery(api.events.list, { token }) || [];

  // Puxa automaticamente o último ID do cache do sistema se não houver um selecionado
  React.useEffect(() => {
    if (eventos.length > 0 && !eventoSelecionado) {
      const lastId = localStorage.getItem("hercules_last_event_id");
      const existe = eventos.some((e: any) => e._id === lastId);
      setEventoSelecionado(existe && lastId ? lastId : eventos[0]._id);
    }
  }, [eventos, eventoSelecionado]);

  // 👑 TRANCA DE SEGURANÇA: O Giro busca apenas cartelas reais que foram vendidas E validadas
  const cartelasAptas = useQuery(api.cards.getValidatedCardsForDraw, { eventId: eventoSelecionado }) || [];

  // Efeito visual de roleta (números mudando rapidamente antes de fixar o ganhador)
  const executarEfeitoGiro = (numeroFinal: string, callbackGanhador: () => void) => {
    let duracao = 0;
    const intervalo = setInterval(() => {
      // Gera números aleatórios de 6 dígitos piscando na tela
      const numeroFalso = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
      setNumeroExibido(numeroFalso);
      duracao += 80;

      // Após 3 segundos de suspense, encerra a animação e fixa o verdadeiro premiado
      if (duracao >= 3000) {
        clearInterval(intervalo);
        setNumeroExibido(numeroFinal);
        callbackGanhador();
        setIsGirando(false);
      }
    }, 80);
  };

  const handleIniciarGiro = () => {
    if (cartelasAptas.length === 0) {
      toast.error("Não há nenhuma cartela validada e apta para o sorteio neste evento.");
      return;
    }

    setIsGirando(true);
    setGanhadorConfirmado(null);

    // 🎯 SORTEIO RANDÔMICO DIRETO NO VETOR: Seleciona um índice aleatório das cartelas validadas
    const indiceSorteado = Math.floor(Math.random() * cartelasAptas.length);
    const cartelaVencedora: any = cartelasAptas[indiceSorteado];
    
    // Filtra o número limpo para o display gigante (Ex: CRT-000125 -> 000125)
    const numeroLimpo = cartelaVencedora.serialNumber.replace("CRT-", "");

    // Dispara a roleta visual na tela
    executarEfeitoGiro(numeroLimpo, () => {
      const fone = String(cartelaVencedora.buyerPhone || "0000");
      setGanhadorConfirmado({
        numero: numeroLimpo,
        nome: cartelaVencedora.buyerName || "Comprador Anônimo",
        vendedor: cartelaVencedora.vendorName || "Estoque Central",
        finalFone: fone.substring(fone.length - 4)
      });
      toast.success(`🏆 Cartela Nº ${numeroLimpo} faturou o Giro da Sorte!`);
    });
  };
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans w-full">
      {/* Cabeçalho */}
      <header className="mb-6 border-b border-slate-900 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase flex items-center gap-2">
          <StarIcon className="h-8 w-8 text-amber-500 animate-spin [animation-duration:10s]" />
          Giro da Sorte Eletrônico
        </h1>
        <p className="text-slate-400 mt-1">Premiação rápida por sorteio direto do número de série das cartelas auditadas.</p>
      </header>

      {/* Seletor de Eventos Oculto em Card Compacto */}
      <div className="mb-6 bg-slate-900/30 p-4 rounded-xl border border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1 text-xs w-full sm:w-72">
          <span className="text-slate-500 font-bold uppercase tracking-wider">Sorteio Vinculado</span>
          <select 
            value={eventoSelecionado} 
            onChange={(e) => {
              setEventoSelecionado(e.target.value);
              setGanhadorConfirmado(null);
              setNumeroExibido("000000");
            }} 
            className="h-9 rounded-lg border border-slate-800 bg-slate-950 px-2 font-semibold text-slate-200 focus:outline-none"
          >
            <option value="">-- Escolha o Sorteio --</option>
            {eventos.map((ev: any) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
          </select>
        </div>
        <div className="text-right text-xs text-slate-500 font-mono shrink-0">
          Cartelas Auditadas no Globo: <strong className="text-amber-400">{cartelasAptas.length}</strong>
        </div>
      </div>

      {/* GRID CENTRALIZADO DA ROLETA */}
      <div className="grid gap-6 md:grid-cols-3 items-center my-auto max-w-4xl mx-auto w-full">
        
        {/* COLUNA DO PAINEL DA ROLETA GIGANTE */}
        <div className="md:col-span-2 flex flex-col items-center gap-6 bg-slate-900/20 border border-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0 animate-pulse" />
          
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-950 px-4 py-1.5 rounded-full border border-slate-900">
            {isGirando ? "Sorteando..." : "Pronto para o Giro"}
          </h2>

          {/* 🎰 DISPLAY ILUMINADO GIGANTE (NÚMEROS DA SORTE) */}
          <div className="flex justify-center gap-2.5 p-6 bg-slate-950 rounded-2xl border-2 border-slate-900 w-full shadow-inner relative group">
            {numeroExibido.split("").map((digito, idx) => (
              <div 
                key={idx} 
                className={`h-24 w-16 text-5xl font-black font-mono flex items-center justify-center rounded-xl border transition-all ${
                  isGirando 
                    ? "bg-amber-500/5 border-amber-500/20 text-amber-500/40 animate-pulse" 
                    : ganhadorConfirmado 
                      ? "bg-emerald-500 border-emerald-400 text-slate-950 scale-105 shadow-lg shadow-emerald-500/10" 
                      : "bg-slate-900/60 border-slate-800 text-slate-300"
                }`}
              >
                {digito}
              </div>
            ))}
          </div>

          {/* BOTÃO MESTRE DE DISPARO */}
          <button
            onClick={handleIniciarGiro}
            disabled={isGirando || cartelasAptas.length === 0}
            className="w-full h-14 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-black tracking-wide text-sm transition-all shadow-xl shadow-amber-500/5 active:scale-95 cursor-pointer uppercase"
          >
            <RefreshCwIcon className={`h-5 w-5 ${isGirando ? 'animate-spin' : ''}`} />
            {isGirando ? "Embaralhando Globo..." : "Girar e Sortear Número"}
          </button>
        </div>

        {/* COLUNA DO CARD DE DESTAQUE DO VENDEDOR / GANHADOR */}
        <div className="md:col-span-1 h-full flex flex-col justify-center">
          {ganhadorConfirmado ? (
            <div className="bg-emerald-950/10 border-2 border-emerald-500 rounded-3xl p-6 text-center shadow-2xl backdrop-blur-md animate-fade-in relative flex flex-col justify-between h-fit">
              <TrophyIcon className="h-12 w-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
              <h3 className="text-xl font-black text-emerald-400 uppercase tracking-tight">GANHADOR!</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Premiação de Série Validada</p>
              
              <div className="mt-5 space-y-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-900 text-left font-sans">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Número Premiado:</span>
                  <div className="text-lg font-black text-amber-500 font-mono mt-0.5">CRT-{ganhadorConfirmado.numero}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nome do Comprador:</span>
                  <div className="text-sm font-extrabold text-white mt-0.5 capitalize truncate">{ganhadorConfirmado.nome}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Últimos 4 Dígitos Fone:</span>
                  <div className="text-xs font-bold font-mono text-slate-300 mt-0.5">****-**{ganhadorConfirmado.finalFone}</div>
                </div>
                <div className="pt-2 border-t border-slate-900 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <UserIcon className="h-3.5 w-3.5 text-slate-600" />
                  <span className="truncate">Cambista: <strong className="text-slate-300">{ganhadorConfirmado.vendedor}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-800 rounded-3xl p-8 text-center text-slate-600 flex flex-col items-center justify-center h-full min-h-[220px]">
              <HelpCircleIcon className="h-8 w-8 text-slate-700 mb-2" />
              <p className="text-xs font-semibold uppercase tracking-wider max-w-[160px] leading-relaxed">
                Aguardando o sorteio para exibir o vencedor...
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
