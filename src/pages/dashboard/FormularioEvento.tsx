import * as React from "react";
import { Trash2Icon, PlusIcon, Edit3Icon } from "lucide-react";

export function FormularioEvento({ s }: { s: any }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-6 shadow-xl backdrop-blur-md h-fit">
      {/* 👑 Título muda de acordo com o estado de edição */}
      <h2 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
        {s.editingEventId ? (
          <>
            <Edit3Icon className="h-5 w-5 text-amber-500 animate-pulse" /> Editar Evento
          </>
        ) : (
          <>
            <PlusIcon className="h-5 w-5 text-amber-500" /> Novo Evento
          </>
        )}
      </h2>
      
      <form onSubmit={s.handleLancarEvento} className="flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome do Evento</label>
          <input type="text" placeholder="Ex: Bingo de Natal" value={s.title} onChange={(e) => s.setTitle(e.target.value)} disabled={s.isLoading} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100 focus:outline-none focus:border-amber-500" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição (opcional)</label>
          <textarea placeholder="Detalhes do evento..." value={s.description} onChange={(e) => s.setDescription(e.target.value)} disabled={s.isLoading} rows={2} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-100 focus:outline-none focus:border-amber-500 resize-none" />
        </div>

        <div className="border-t border-slate-900 pt-3">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-2">Local do Evento</span>
          <div className="flex flex-col gap-3">
            <input type="text" placeholder="Nome do Local" value={s.localName} onChange={(e) => s.setLocalName(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3" />
            <input type="text" placeholder="Endereço" value={s.address} onChange={(e) => s.setAddress(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Cidade" value={s.city} onChange={(e) => s.setCity(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3" />
              <input type="text" placeholder="Telefone" value={s.phone} onChange={(e) => s.setPhone(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-900 pt-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Data do Evento</label>
            <input type="date" value={s.eventDate} onChange={(e) => s.setEventDate(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Horário</label>
            <input type="time" value={s.eventTime} onChange={(e) => s.setEventTime(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100" />
          </div>
        </div>

        <div className="border-t border-slate-900 pt-3 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Cartelas</span>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Total de Cartelas (máx. 50.000)</label>
            <input type="number" value={s.totalCards} onChange={(e) => s.setTotalCards(Number(e.target.value))} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Tipo de Chance</label>
            <select value={s.chanceType} onChange={(e) => s.setChanceType(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100 focus:outline-none">
              <option value="unica">Chance Única (1 grade)</option>
              <option value="dupla">Chance Dupla (2 grades)</option>
              <option value="tripla">Chance Tripla (3 grades)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Valor da Cartela (R$)</label>
            <input type="text" placeholder="0,00" value={s.cardValue} onChange={(e) => s.setCardValue(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100" />
          </div>
        </div>

        <div className="border-t border-slate-900 pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-400">Prêmios ({s.prizes.length}/5)</label>
            <button type="button" onClick={s.handleAddPrize} className="h-7 px-2.5 rounded bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20">+ Incluir</button>
          </div>
          <input type="text" placeholder="Descreva o prêmio..." value={s.newPrize} onChange={(e) => s.setNewPrize(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), s.handleAddPrize())} className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100 mb-2" />
          
          {s.prizes.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-2">Nenhum prêmio cadastrado ainda.</p>
          ) : (
            <div className="flex flex-col gap-1.5 bg-slate-950 p-2 rounded-lg border border-slate-900 max-h-36 overflow-y-auto">
              {s.prizes.map((p: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="truncate text-slate-300 font-medium">{idx + 1}º Prê.: {p}</span>
                  <button type="button" onClick={() => s.handleRemovePrize(idx)} className="text-slate-500 hover:text-rose-400">
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 👑 BOTOES DE SUBMISSÃO INTELIGENTES */}
        <div className="flex gap-2 mt-2">
          <button type="submit" disabled={s.isLoading} className="flex-1 h-11 inline-flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-colors hover:bg-amber-400 disabled:opacity-50 shadow-md">
            {s.isLoading ? "Salvando..." : s.editingEventId ? "Salvar Alterações" : "Salvar Evento"}
          </button>
          
          {s.editingEventId && (
            <button type="button" onClick={s.handleCancelarEdicao} className="h-11 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-semibold text-xs transition-colors">
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

/**
 * 👑 DIREITA: Nova Lista de Extrações Ativas com Botões de Alterar e Excluir
 */
export function ListaEventos({ s }: { s: any }) {
  const lista = Array.isArray(s.eventos) ? s.eventos : [];

  if (lista.length === 0) {
    return (
      <div className="text-center p-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
        Nenhum sorteio cadastrado na nuvem. Use o painel ao lado para lançar o primeiro!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {lista.map((evento: any) => (
        <div 
          key={evento._id} 
          className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl flex justify-between items-center transition-all hover:border-slate-700 shadow-md"
        >
          <div>
            <h3 className="font-bold text-sm text-slate-200">{evento.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {evento.eventDate || "Sem data"} - {evento.eventTime || "Sem horário"}
            </p>
            <div className="flex gap-2 mt-1.5">
              <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase">
                {evento.totalCards} Crt.
              </span>
              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                R$ {((evento.cardValue || 0) / 100).toFixed(2)}
              </span>
            </div>
          </div>
          
          {/* Botões operacionais para Alterar ou Excluir */}
          <div className="flex gap-2">
            <button 
              onClick={() => s.handleIniciarEdicao(evento)}
              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded-lg text-xs font-bold transition-all border border-amber-500/10 flex items-center gap-1"
            >
              Alterar
            </button>
            <button 
              onClick={() => s.handleDeletarEvento(evento._id)}
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-rose-500/10 flex items-center gap-1"
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
