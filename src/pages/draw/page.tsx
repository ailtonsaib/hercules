import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { DiscIcon, RefreshCwIcon, PlayIcon, PauseIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";

export default function PainelSorteioBingo() {
  const [numerosSorteados, setNumerosSorteados] = React.useState<number[]>([]);
  const [ultimoNumero, setUltimoNumero] = React.useState<number | null>(null);
  const [estaRodando, setEstaRodando] = React.useState(false);
  const intervaloRef = React.useRef<any>(null);

  // Escuta a listagem de eventos ativos na Convex em tempo real
  const eventos = useQuery((api as any).events.list) || [];
  const userDataRaw = localStorage.getItem("hercules_user");
  const user = userDataRaw ? JSON.parse(userDataRaw) : { role: "user" };

  const sortearProximoNumero = () => {
    if (numerosSorteados.length >= 75) {
      toast.info("Todos os 75 números já foram sorteados!");
      setEstaRodando(false);
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      return;
    }

    let numeroAleatorio: number;
    do {
      numeroAleatorio = Math.floor(Math.random() * 75) + 1;
    } while (numerosSorteados.includes(numeroAleatorio));

    setNumerosSorteados((prev) => [...prev, numeroAleatorio]);
    setUltimoNumero(numeroAleatorio);
  };

  const alternarSorteioAutomatico = () => {
    if (estaRodando) {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      setEstaRodando(false);
    } else {
      setEstaRodando(true);
      sortearProximoNumero();
      intervaloRef.current = setInterval(() => {
        sortearProximoNumero();
      }, 4000); // Sorteia uma nova bola a cada 4 segundos
    }
  };

  const reiniciarSorteio = () => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    setEstaRodando(false);
    setNumerosSorteados([]);
    setUltimoNumero(null);
    toast.info("Painel de sorteio reiniciado!");
  };

  React.useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans">
      {/* Cabeçalho da Página */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase flex items-center gap-2">
            <DiscIcon className={`h-8 w-8 text-amber-500 ${estaRodando ? "animate-spin" : ""}`} />
            Painel do Globo de Sorteio
          </h1>
          <p className="text-slate-400 mt-1">
            Extração de dezenas e controle de chamadas em tempo real.
          </p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <button 
              onClick={reiniciarSorteio}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-rose-400 border border-slate-800 transition-colors hover:bg-slate-800"
            >
              <RotateCcwIcon className="h-4 w-4" /> Limpar Globo
            </button>
          )}
          <button 
            onClick={() => window.location.reload()} 
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800"
          >
            <RefreshCwIcon className="h-4 w-4" /> Sincronizar
          </button>
        </div>
      </header>

      {/* Grid Principal */}
      <main className="grid gap-6 md:grid-cols-3">
        {/* Painel de Controle de Extração */}
        <section className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 shadow-2xl relative overflow-hidden">
          <h2 className="text-xl font-bold text-slate-200 self-start mb-6">Extração Ativa</h2>

          <div className="flex flex-col items-center gap-6 my-4">
            {/* Globo Visual Principal */}
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-slate-950 border-4 border-amber-500 shadow-2xl relative">
              <span className="text-6xl font-black text-amber-500 animate-pulse">
                {ultimoNumero !== null ? String(ultimoNumero).padStart(2, "0") : "--"}
              </span>
              <span className="absolute bottom-2 text-[10px] font-mono tracking-widest uppercase text-slate-500">
                Última Bola
              </span>
            </div>

            {user.role !== "admin" ? (
              <p className="text-sm text-center text-amber-500/80 bg-amber-500/5 p-4 rounded-lg border border-amber-500/10 max-w-sm">
                Apenas administradores podem acionar os botões do globo mestre e cantar as dezenas.
              </p>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={sortearProximoNumero}
                  disabled={estaRodando}
                  className="h-11 px-5 rounded-lg bg-slate-900 border border-slate-800 text-amber-500 font-bold text-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
                >
                  Sortear Uma
                </button>
                <button
                  onClick={alternarSorteioAutomatico}
                  className={`h-11 px-6 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
                    estaRodando 
                      ? "bg-amber-500 text-slate-950 hover:bg-amber-400" 
                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                  }`}
                >
                  {estaRodando ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                  {estaRodando ? "Pausar Globo" : "Girar Automático"}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Quadro Geral de Dezenas Chamadas */}
        <section className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex justify-between items-center">
            <span>Pedras Chamadas</span>
            <span className="text-xs text-slate-500 font-mono font-normal">Sorteados: {numerosSorteados.length}/75</span>
          </h2>
          
          <div className="grid grid-cols-10 gap-2 p-2 bg-slate-950 rounded-xl border border-slate-900">
            {Array.from({ length: 75 }).map((_, i) => {
              const num = i + 1;
              const foiSorteado = numerosSorteados.includes(num);
              const isUltimo = ultimoNumero === num;

              return (
                <div 
                  key={num} 
                  className={`aspect-square flex items-center justify-center font-bold text-sm rounded transition-all border ${
                    isUltimo
                      ? "bg-amber-500 border-amber-400 text-slate-950 scale-110 shadow-lg"
                      : foiSorteado
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-slate-900 border-slate-800/40 text-slate-700"
                  }`}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
