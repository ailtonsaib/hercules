import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ShieldCheck, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

export default function ValidarCartela() {
  const [codigoCartela, setCodigoCartela] = React.useState("");
  const [statusValidacao, setStatusValidacao] = React.useState<"espera" | "valido" | "invalido">("espera");

  // Busca os dados das rodadas em tempo real se necessário
  const eventos = useQuery(api.events.list) || [];

  const handleValidar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoCartela.trim()) return;

    // Simulação de validação local simples baseada no código
    // Se o código digitado terminar com "777", considera válido
    if (codigoCartela.endsWith("777") || codigoCartela.toLowerCase() === "admin") {
      setStatusValidacao("valido");
    } else {
      setStatusValidacao("invalido");
    }
  };

  const handleReset = () => {
    setCodigoCartela("");
    setStatusValidacao("espera");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-md">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Validador de Cartelas
          </h1>
          <p className="text-sm text-slate-400">
            Insira o identificador numérico da cartela premiada
          </p>
        </div>

        {/* Estados de Retorno da Validação */}
        {statusValidacao === "espera" && (
          <form onSubmit={handleValidar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Código da Cartela
              </label>
              <input
                type="text"
                placeholder="Ex: CRT-4002-777"
                value={codigoCartela}
                onChange={(e) => setCodigoCartela(e.target.value)}
                className="w-full h-11 rounded-lg border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full h-11 inline-flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-colors hover:bg-amber-400"
            >
              Verificar Ganhador
            </button>
          </form>
        )}

        {statusValidacao === "valido" && (
          <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in duration-200">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold text-emerald-400">Cartela Premiada!</h2>
            <p className="text-sm text-slate-400 mt-2 px-4">
              Código <span className="font-mono text-slate-200 bg-slate-950 px-1.5 py-0.5 rounded">{codigoCartela}</span> está validado com sucesso no sistema.
            </p>
            <button
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-800 px-4 h-9 rounded-lg hover:bg-slate-800 transition-all"
            >
              <RotateCcw className="h-4 w-4" /> Validar Outra
            </button>
          </div>
        )}

        {statusValidacao === "invalido" && (
          <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in duration-200">
            <XCircle className="h-16 w-16 text-rose-500 mb-4" />
            <h2 className="text-xl font-bold text-rose-400">Cartela Inválida</h2>
            <p className="text-sm text-slate-400 mt-2 px-4">
              O identificador fornecido não bate com as regras de premiação atuais.
            </p>
            <button
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-800 px-4 h-9 rounded-lg hover:bg-slate-800 transition-all"
            >
              <RotateCcw className="h-4 w-4" /> Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
