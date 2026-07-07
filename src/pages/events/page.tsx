import * as React from "react";
import { useDashboard } from "../dashboard/useDashboard";
import { FormularioEvento } from "../dashboard/FormularioEvento";
import { CalendarDaysIcon, RefreshCwIcon, MapPinIcon, Edit3Icon, Trash2Icon } from "lucide-react";

export default function PaginaEventosGeral() {
  const s = useDashboard(); // Reutiliza os mesmos estados estruturados e injetados com cache

  // Blindagem contra carregamento assíncrono do Convex
  const listaEventos = Array.isArray(s.eventos) ? s.eventos : [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans w-full">
      {/* Cabeçalho Contextual Correto */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-rose-500 uppercase flex items-center gap-2">
            <CalendarDaysIcon className="h-8 w-8 text-rose-500" />
            Gerenciar Eventos
          </h1>
          <p className="text-slate-400 mt-1">Abra novas rodadas com chances customizadas e gerencie sorteios ativos.</p>
        </div>
        <button onClick={() => window.location.reload()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800">
          <RefreshCwIcon className="h-4 w-4" /> Sincronizar Grade
        </button>
      </header>

      {/* Estrutura Operacional Completa baseado no Layout das Imagens */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Renderiza o formulário avançado de criação/edição dinâmico */}
        <FormularioEvento s={s} />

        {/* LISTAGEM EM TEMPO REAL À DIREITA */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200">Rodadas de Extração Ativas</h2>
          
          {listaEventos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
              Nenhum sorteio cadastrado na nuvem. Use o painel ao lado para lançar o primeiro!
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {listaEventos.map((evento: any) => (
                <div key={evento._id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between hover:border-rose-500/20 transition-all shadow-lg">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-rose-400 text-lg capitalize">{evento.title}</h3>
                      <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 uppercase shrink-0">
                        Chance {evento.chanceType ?? "dupla"}
                      </span>
                    </div>
                    {evento.description && <p className="text-sm text-slate-400 mt-2 line-clamp-2">{evento.description}</p>}
                    
                    {evento.localName && (
                      <div className="text-xs text-slate-500 mt-3 flex items-center gap-1.5 bg-slate-950 p-2 rounded border border-slate-900/60">
                        <MapPinIcon className="h-3.5 w-3.5 text-slate-600" />
                        <span className="truncate">{evento.localName} - {evento.city}</span>
                      </div>
                    )}

                    {/* Tags informativas extras (Valor e Cartelas) */}
                    <div className="flex gap-2 mt-3">
                      <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">
                        {evento.totalCards || 0} Cartelas
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                        R$ {((evento.cardValue || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Metadados do card */}
                  <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-600">
                    <span>Data: {evento.eventDate ?? "--/--/----"}</span>
                    <span className="truncate max-w-[120px]">REF: {evento._id}</span>
                  </div>

                  {/* SELETORES OPERACIONAIS INTERNOS DO CARTÃO */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end gap-2">
                    <button 
                      type="button"
                      onClick={() => s.handleIniciarEdicao(evento)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-gray-950 font-black rounded-lg text-xs transition-all border border-amber-500/20"
                    >
                      <Edit3Icon className="h-3.5 w-3.5" />
                      Alterar
                    </button>
                    <button 
                      type="button"
                      onClick={() => s.handleDeletarEvento(evento._id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white font-black rounded-lg text-xs transition-all border border-red-600/20"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
