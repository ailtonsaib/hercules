import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { InfoIcon, RefreshCwIcon, ShieldCheckIcon, HelpCircleIcon, BookOpenIcon } from "lucide-react";

export default function PaginaInformacoes() {
  // Conecta com a listagem de eventos/sorteios ativos da Convex em tempo real
  const eventos = useQuery((api as any).events.list) || [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans">
      {/* Cabeçalho da Página */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase flex items-center gap-2">
            <InfoIcon className="h-8 w-8 text-amber-500" />
            Central de Informações
          </h1>
          <p className="text-slate-400 mt-1">
            Regulamentos, instruções de uso e monitoramento global de rodadas.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800"
        >
          <RefreshCwIcon className="h-4 w-4" /> Sincronizar Regras
        </button>
      </header>

      {/* Grid Principal */}
      <main className="grid gap-6 md:grid-cols-3">
        {/* Painel de Diretrizes e Termos */}
        <section className="col-span-2 flex flex-col gap-6">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <BookOpenIcon className="h-5 w-5 text-amber-500" /> Como Funciona o Sistema
            </h2>
            <div className="flex flex-col gap-4 text-sm text-slate-300 leading-relaxed">
              <p>
                O <strong className="text-amber-400">Bingo Premier</strong> opera de forma 100% digital e síncrona. As dezenas são geradas e validadas diretamente em nossas funções na nuvem utilizando o banco de dados da Convex, garantindo total transparência e auditoria de cada bilhete emitido.
              </p>
              <p>
                Os prêmios são distribuídos automaticamente com base na validação criptográfica dos lotes. Nossos algoritmos realizam a conferência instantânea assim que uma cartela atinge os critérios de vitória configurados pelo administrador.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl backdrop-blur-md">
            <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <HelpCircleIcon className="h-5 w-5 text-amber-500" /> Perguntas Frequentes
            </h2>
            <div className="flex flex-col gap-4">
              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800/60">
                <h3 className="font-bold text-sm text-slate-200">Como é feita a validação das cartelas?</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Cada bilhete possui uma assinatura digital única vinculada ao seu respectivo lote. O validador cruza as dezenas sorteadas na mesa com o banco de dados mestre.
                </p>
              </div>
              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800/60">
                <h3 className="font-bold text-sm text-slate-200">O que define um privilégio de Administrador?</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Contas mestres possuem a flag de controle no banco que autoriza a abertura e fechamento de rodadas, emissão de cartelas em massa e acionamento de sorteios instantâneos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Informações das Rodadas Conectadas */}
        <aside className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-emerald-400" /> Status do Servidor
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Conexão Backend</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                ONLINE (CONVEX)
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3 uppercase tracking-wider">
              Rodadas em Execução:
            </p>
            
            {eventos.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Nenhuma rodada cadastrada ativa no banco.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {eventos.map((evento: any) => (
                  <div key={evento._id} className="rounded-lg bg-slate-950 p-3 border border-slate-800/40 text-xs">
                    <h4 className="font-bold text-amber-400">{evento.title}</h4>
                    <span className="text-[10px] text-slate-600 block mt-1">
                      REF: {evento._id}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
