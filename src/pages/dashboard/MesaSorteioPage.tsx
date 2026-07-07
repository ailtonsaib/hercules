import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { TrophyIcon, PlayIcon } from "lucide-react";

export default function MesaSorteioPage({ eventId }: { eventId: string }) {
  const token = localStorage.getItem("hercules_session_token") || localStorage.getItem("token") || "";

  // 1. Busca os dados informativos do sorteio ativo
  const eventosDoBanco = useQuery(api.events.list, { token }) || [];
  const evento = eventosDoBanco.find((e: any) => e._id === eventId);

  // 👑 SEGURANÇA TOTAL: Busca estritamente as cartelas vendidas e validadas na auditoria
  const cartelasValidadas = useQuery(api.cards.getValidatedCardsForDraw, { eventId }) || [];

  // Estados operacionais do Globo Físico
  const [dezenasSorteadas, setDezenasSorteadas] = React.useState<number[]>([]);
  const [inputNumero, setInputNumero] = React.useState("");

  // Estados para as modalidades de premiação
  const [modalidade, setModalidade] = React.useState<"linha_coluna_cantos" | "cartela_cheia" | "">("linha_coluna_cantos");
  
  // Controle de travas para as sub-modalidades
  const [ganhadorHorizontal, setGanhadorHorizontal] = React.useState<any>(null);
  const [ganhadorVertical, setGanhadorVertical] = React.useState<any>(null);
  const [ganhadorQuatroCantos, setGanhadorQuatroCantos] = React.useState<any>(null);

  // Injeta uma dezena cantada no painel mestre
  const handleCantarNumero = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(inputNumero);

    if (isNaN(num) || num < 1 || num > 75) {
      toast.error("Insira uma dezena válida entre 01 e 75.");
      return;
    }
    if (dezenasSorteadas.includes(num)) {
      toast.warning(`A dezena ${String(num).padStart(2, "0")} já foi cantada no globo.`);
      return;
    }

    setDezenasSorteadas([...dezenasSorteadas, num]);
    setInputNumero("");
  };

  // Reseta o globo físico para iniciar uma nova rodada
  const handleLimparGlobo = () => {
    if (window.confirm("Deseja zerar o globo e apagar todas as dezenas cantadas desta rodada?")) {
      setDezenasSorteadas([]);
      setGanhadorHorizontal(null);
      setGanhadorVertical(null);
      setGanhadorQuatroCantos(null);
    }
  };
  // LÓGICA DE AUDITORIA CRÍTICA EM TEMPO REAL
  const processarAuditoria = React.useMemo(() => {
    let jogoEncerrado = false;
    const vencedoresAtuais: any[] = [];

    const ranking17: string[] = [];
    const ranking18: string[] = [];
    const ranking19: string[] = [];

    cartelasValidadas.forEach((card: any) => {
      const numCard = card.numbers || [];
      
      // Cria a matriz de conferência física 4x5 baseada na array linear de 20 posições
      const matriz = [
        numCard.slice(0, 5),
        numCard.slice(5, 10),
        numCard.slice(10, 15),
        numCard.slice(15, 20)
      ];

      // Verificação 1: Quatro Cantos (Extremidades da cartela)
      const cantosMarcados = [matriz[0][0], matriz[0][4], matriz[3][0], matriz[3][4]].every(n => dezenasSorteadas.includes(n));

      // Verificação 2: Horizontais (Linhas Completas)
      let temHorizontal = false;
      matriz.forEach(linha => {
        if (linha.every((n: number) => dezenasSorteadas.includes(n))) temHorizontal = true;
      });

      // Verificação 3: Verticais (Colunas Completas)
      let temVertical = false;
      for (let c = 0; c < 5; c++) {
        if ([matriz[0][c], matriz[1][c], matriz[2][c], matriz[3][c]].every((n: number) => dezenasSorteadas.includes(n))) {
          temVertical = true;
        }
      }

      // Verificação 4: Cartela Cheia (20 Pontos)
      const totalAcertos = numCard.filter((n: number) => dezenasSorteadas.includes(n)).length;

      // Processamento de Rankings de Proximidade (Apenas para modalidade Cartela Cheia)
      if (modalidade === "cartela_cheia" && !jogoEncerrado) {
        const numLimpo = card.serialNumber.replace("CRT-", "");
        if (totalAcertos === 17) ranking17.push(numLimpo);
        if (totalAcertos === 18) ranking18.push(numLimpo);
        if (totalAcertos === 19) ranking19.push(numLimpo);
      }

      // DISPARO DE GANHADORES CONFORME A MODALIDADE SELECIONADA
      if (modalidade === "linha_coluna_cantos") {
        if (temHorizontal && !ganhadorHorizontal) {
          setGanhadorHorizontal(card);
          toast.success(`🎉 Linha Horizontal batida pela Cartela ${card.serialNumber}!`);
        }
        if (temVertical && !ganhadorVertical) {
          setGanhadorVertical(card);
          toast.success(`🎉 Linha Vertical batida pela Cartela ${card.serialNumber}!`);
        }
        if (cantosMarcados && !ganhadorQuatroCantos) {
          setGanhadorQuatroCantos(card);
          toast.success(`🎉 Quatro Cantos batidos pela Cartela ${card.serialNumber}!`);
        }
      } else {
        // Modalidade Cartela Cheia (20 pontos)
        if (totalAcertos === 20) {
          jogoEncerrado = true;
          const fone = String(card.buyerPhone || "0000");
          vencedoresAtuais.push({
            numero: card.serialNumber.replace("CRT-", ""),
            nome: card.buyerName || "Comprador Anônimo",
            finalFone: fone.substring(fone.length - 4)
          });
        }
      }
    });

    return { ranking17, ranking18, ranking19, jogoEncerrado, vencedoresAtuais };
  }, [dezenasSorteadas, cartelasValidadas, modalidade, ganhadorHorizontal, ganhadorVertical, ganhadorQuatroCantos]);
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans w-full">
      
      {/* SELETOR DE MODALIDADE DE JOGO */}
      <div className="mb-6 grid grid-cols-2 gap-4 bg-slate-900/60 p-2 rounded-xl border border-slate-800 no-print">
        <button
          onClick={() => setModalidade("linha_coluna_cantos")}
          className={`py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${modalidade === "linha_coluna_cantos" ? "bg-rose-600 text-white shadow-md border border-rose-500" : "text-slate-400 hover:text-slate-200"}`}
        >
          Horizontal / Vertical / 4 Cantos
        </button>
        <button
          onClick={() => setModalidade("cartela_cheia")}
          className={`py-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${modalidade === "cartela_cheia" ? "bg-amber-500 text-slate-950 shadow-md border border-amber-400" : "text-slate-400 hover:text-slate-200"}`}
        >
          Modalidade Cartela Cheia (20 Pts)
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* COLUNA ESQUERDA: ENTRADA DO GLOBO E LEITURA DE DEZENAS */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-5 shadow-xl backdrop-blur-md">
            <form onSubmit={handleCantarNumero} className="flex gap-2 mb-4">
              <input
                type="number"
                disabled={processarAuditoria.jogoEncerrado}
                placeholder={processarAuditoria.jogoEncerrado ? "SORTEIO CONCLUÍDO" : "Digitar Bola Sorteada (Ex: 45)"}
                value={inputNumero}
                onChange={(e) => setInputNumero(e.target.value)}
                className="flex-1 h-12 rounded-xl border border-slate-800 bg-slate-950 px-4 text-center text-lg font-black text-amber-500 focus:outline-none focus:border-amber-500 disabled:opacity-30 font-mono"
              />
              <button type="submit" disabled={processarAuditoria.jogoEncerrado} className="h-12 px-6 bg-amber-500 text-slate-950 font-black rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-30">
                <PlayIcon className="h-5 w-5" />
              </button>
            </form>

            {/* PAINEL DOS 75 NÚMEROS DO GLOBO MESTRE */}
            <div className="grid grid-cols-10 gap-1.5 p-3 bg-slate-950 rounded-xl border border-slate-900 font-mono">
              {Array.from({ length: 75 }, (_, i) => i + 1).map((n) => {
                const foiSorteadas = dezenasSorteadas.includes(n);
                return (
                  <div
                    key={n}
                    className={`h-8 rounded-md text-xs font-black flex items-center justify-center border transition-all ${foiSorteadas ? "bg-amber-500 border-amber-400 text-slate-950 scale-105 shadow-sm" : "bg-slate-900/40 border-slate-800/60 text-slate-600"}`}
                  >
                    {String(n).padStart(2, "0")}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 flex justify-between text-[11px] font-mono text-slate-500 px-1">
              <span>Pedras Sorteadas: {dezenasSorteadas.length}/75</span>
              <button onClick={handleLimparGlobo} className="text-rose-400 hover:text-rose-300 font-bold uppercase tracking-tight">Zerar Globo</button>
            </div>
          </section>
        </div>

        {/* COLUNA DIREITA: RANKINGS E EXIBIÇÃO DE VENCEDORES DA RODADA */}
        <div className="md:col-span-1 flex flex-col gap-4">
          
          {/* SEÇÃO 1: STATUS SE FOR MODALIDADE LINHA/COLUNA/CANTOS */}
          {modalidade === "linha_coluna_cantos" && (
            <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-5 shadow-xl backdrop-blur-md">
              <h3 className="text-sm font-bold text-slate-200 mb-3 border-b border-slate-800 pb-2 uppercase tracking-wide text-xs">Vencedores por Modelo</h3>
              <div className="space-y-2 text-xs">
                <div className={`p-3 rounded-lg border ${ganhadorHorizontal ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold" : "bg-slate-950/40 border-slate-900 text-slate-500"}`}>
                  Horizontal: {ganhadorHorizontal ? `Cartela #${ganhadorHorizontal.serialNumber.replace("CRT-","")}` : "Aguardando..."}
                </div>
                <div className={`p-3 rounded-lg border ${ganhadorVertical ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold" : "bg-slate-950/40 border-slate-900 text-slate-500"}`}>
                  Vertical: {ganhadorVertical ? `Cartela #${ganhadorVertical.serialNumber.replace("CRT-","")}` : "Aguardando..."}
                </div>
                <div className={`p-3 rounded-lg border ${ganhadorQuatroCantos ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold" : "bg-slate-950/40 border-slate-900 text-slate-500"}`}>
                  Quatro Cantos: {ganhadorQuatroCantos ? `Cartela #${ganhadorQuatroCantos.serialNumber.replace("CRT-","")}` : "Aguardando..."}
                </div>
              </div>
            </section>
          )}

          {/* SEÇÃO 2: RANKING DE APROXIMAÇÃO DA CARTELA CHEIA */}
          {modalidade === "cartela_cheia" && !processarAuditoria.jogoEncerrado && (
            <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-5 shadow-xl backdrop-blur-md space-y-3">
              <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-2 uppercase tracking-wide text-xs">Aproximação do Prêmio</h3>
              
              <div className="text-xs space-y-2 font-mono">
                <div className="p-2 bg-slate-950 border border-slate-900 rounded-lg flex justify-between items-center">
                  <span className="text-slate-400">17 Pontos:</span>
                  <span className="text-slate-200 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">{processarAuditoria.ranking17.length} cartela(s)</span>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-900 rounded-lg flex justify-between items-center">
                  <span className="text-amber-500 font-bold">18 Pontos:</span>
                  <span className="text-amber-400 font-bold bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">{processarAuditoria.ranking18.length} cartela(s)</span>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-900 rounded-lg flex justify-between items-center text-rose-400">
                  <span className="font-bold">19 Pontos:</span>
                  <span className="font-bold bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 rounded">{processarAuditoria.ranking19.length} cartela(s)</span>
                </div>
              </div>

              {/* 💓 ALERTA DINÂMICO "NA BOA" (19 ACERTOS COM CORAÇÃO PALPITANTE) */}
              {processarAuditoria.ranking19.length > 0 && (
                <div className="bg-rose-600 border border-rose-500 text-white rounded-xl p-4 text-center mt-3 animate-pulse shadow-xl shadow-rose-600/5">
                  <div className="text-2xl font-black mb-1 flex items-center justify-center gap-1.5 animate-bounce">
                    ❤️ <span className="uppercase tracking-tight text-base font-black">TEM CARTELA NA BOA!</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 leading-tight">
                    Falta apenas 1 bola para {processarAuditoria.ranking19.length} cartela(s) faturar o prêmio!
                  </p>
                  <div className="mt-2.5 text-xs font-mono font-black tracking-wider bg-black/20 py-1 rounded max-h-16 overflow-y-auto no-scrollbar">
                    Nº: {processarAuditoria.ranking19.join(" • ")}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 🏆 BLOQUEIO TOTAL / TELA DE VITÓRIA: CARTELA CHEIA ALCANÇOU 20 PONTOS */}
          {modalidade === "cartela_cheia" && processarAuditoria.jogoEncerrado && (
            <section className="rounded-xl border-2 border-emerald-500 bg-emerald-950/20 p-5 text-center shadow-2xl backdrop-blur-md">
              <TrophyIcon className="h-12 w-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
              <h2 className="text-xl font-black text-emerald-400 uppercase tracking-tight">BINGO CONFIRMADO!</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase font-black tracking-wide">O sorteio foi encerrado automaticamente.</p>
              
              <div className="mt-4 space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {processarAuditoria.vencedoresAtuais.map((venc: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-left shadow">
                    <div className="text-xs font-black text-amber-500 tracking-wide font-mono">CARTELA Nº {venc.numero}</div>
                    <div className="text-sm font-extrabold text-white mt-1 capitalize truncate">Nome: {venc.nome}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">WhatsApp: ****-**{venc.finalFone}</div>
                  </div>
                ))}
              </div>
              
              <button onClick={handleLimparGlobo} className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-800 rounded-xl transition-all">
                Iniciar Nova Rodada
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
