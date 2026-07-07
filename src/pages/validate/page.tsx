import * as React from "react";
import { useUsers } from "./useUsers";
import { 
  RefreshCwIcon, UserCheckIcon, ContactIcon, 
  MapPinIcon, NetworkIcon, Trash2Icon, UserPlusIcon, Edit3Icon 
} from "lucide-react";

export default function ValidadorSeguro() {
  const u = useUsers();

  // Garante que a lista seja sempre um array, mesmo se o banco estiver vazio ou carregando
  const usuariosValidos = Array.isArray(u.todosUsuarios) ? u.todosUsuarios : [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans w-full">
      {/* Cabeçalho */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase flex items-center gap-2">
            <UserCheckIcon className="h-8 w-8 text-amber-500" />
            Controle de Usuários & Jogadores
          </h1>
          <p className="text-slate-400 mt-1">Gerencie a base de clientes comuns, endereços de auditoria e logs de rede IP.</p>
        </div>
        <button onClick={() => window.location.reload()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800">
          <RefreshCwIcon className="h-4 w-4" /> Sincronizar Base
        </button>
      </header>

      {/* Grid de Operação */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* FORMULÁRIO DE CADASTRO À ESQUERDA */}
        <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-6 shadow-xl backdrop-blur-md h-fit">
          <h2 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5 text-amber-500" /> 
            {u.selectedId ? "Alterar Cadastro" : "Incluir Usuário Comum"}
          </h2>

          <form onSubmit={u.handleSalvarUsuario} className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome do Jogador</label>
              <input type="text" placeholder="Ex: Carlos Mendes" value={u.name} onChange={(e) => u.setName(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100 focus:outline-none focus:border-amber-500" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Endereço Residencial</label>
              <input type="text" placeholder="Rua, número, bairro..." value={u.address} onChange={(e) => u.setAddress(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100 focus:outline-none focus:border-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-900 pt-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Telefone / Whats</label>
                <input type="text" placeholder="(00) 00000-0000" value={u.phone} onChange={(e) => u.handlePhoneChange(e.target.value)} className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-100 focus:outline-none focus:border-amber-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Endereço IP (Auto)</label>
                <div className="h-10 rounded-lg border border-slate-800 bg-slate-900/60 px-3 flex items-center text-xs text-amber-500/80 font-mono select-none">
                  Automático via Nuvem
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button type="submit" disabled={u.isLoading} className="flex-1 h-11 inline-flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-colors hover:bg-amber-400 disabled:opacity-50 shadow-md">
                {u.isLoading ? "Gravando..." : u.selectedId ? "Atualizar" : "Salvar Usuário"}
              </button>
              {u.selectedId && (
                <button type="button" onClick={u.handleLimpar} className="h-11 px-4 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-sm font-semibold hover:bg-slate-800">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        {/* LISTAGEM EM GRADE DE CARDS À DIREITA */}
        <section className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200">Jogadores Cadastrados no Banco</h2>
          {usuariosValidos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
              Nenhum usuário comum ativo localizado no servidor Convex. Use o formulário para incluir!
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {usuariosValidos.map((usuario: any) => (
                <div 
                  key={usuario._id} 
                  onClick={() => u.handleCarregarParaEditar(usuario)}
                  className={`rounded-xl border p-5 flex flex-col justify-between transition-all shadow-lg cursor-pointer relative group ${
                    u.selectedId === usuario._id ? "border-amber-500 bg-amber-500/5" : "border-slate-800 bg-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-amber-400 text-lg truncate pr-10">{usuario.name}</h3>
                      <button
                        onClick={(e) => u.handleExcluirUsuario(usuario._id, e)}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-500 hover:text-rose-400 transition-all shadow absolute top-5 right-5"
                        title="Remover Usuário"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 mt-2 text-xs text-slate-400">
                      {usuario.address && (
                        <div className="flex items-center gap-1.5">
                          <MapPinIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                          <span className="truncate">End.: <strong className="text-slate-200">{usuario.address}</strong></span>
                        </div>
                      )}
                      {usuario.phone && (
                        <div className="flex items-center gap-1.5">
                          <ContactIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                          <span>WhatsApp: <strong className="text-slate-200">{usuario.phone}</strong></span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <NetworkIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                        <span>Log IP Máquina: <strong className="text-amber-400 font-mono">{usuario.ipAddress || "Automático"}</strong></span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                    <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 text-amber-500 font-bold transition-opacity">
                      <Edit3Icon className="h-3 w-3" /> Clique para alterar
                    </span>
                    <span>REF: {usuario._id.substring(0, 8)}...</span>
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
