import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api"; // Ajuste o número de pontos (../../) se o arquivo estiver mais fundo em subpastas
import { TrophyIcon, PlusIcon, ShieldCheckIcon, LogOutIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";

export default function MeuPainelScreen() {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // 1. Recupera a sessão local salva no localStorage pelo formulário de Login
  const token = localStorage.getItem("hercules_session_token") || "";
  const userDataRaw = localStorage.getItem("hercules_user");
  const user = userDataRaw ? JSON.parse(userDataRaw) : { name: "Usuário", role: "user" };

  // 2. Escuta a Mutation de criar e a Query de listar os eventos em tempo real
  const criarEvento = useMutation((api as any).events.create);
  const listaEventos = useQuery((api as any).events.list) || [];

  const handleCriarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título do evento é obrigatório.");
      return;
    }

    setIsLoading(true);
    try {
      // Envia o formulário incluindo o token de autenticação local para validação no backend
      await criarEvento({
        token,
        title,
        description: description || undefined,
      });

      toast.success("Evento adicionado com sucesso!");
      setTitle("");
      setDescription("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao tentar salvar o evento no banco.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.info("Sessão encerrada.");
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans">
      {/* Barra de Navegação Superior */}
      <header className="mb-8 flex items-center justify-between border-b border-slate-900 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <TrophyIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Painel Bingo Premier</h1>
            <p className="text-xs text-slate-400">Olá, {user.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Tag Visual do Administrador Supremo */}
          {user.role === "admin" && (
            <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/20">
              <ShieldCheckIcon className="h-3.5 w-3.5" /> Admin Mestre
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex h-9 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOutIcon className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      {/* Grade de Funcionalidades */}
      <main className="grid gap-6 md:grid-cols-3">
        {/* Painel de Criação: Só processa ações de gravação se for Admin */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
            Gerenciar Rodadas
          </h2>

          {user.role !== "admin" ? (
            <p className="text-sm text-amber-500/80 bg-amber-500/5 p-4 rounded-lg border border-amber-500/10">
              Apenas usuários com privilégio de administrador podem cadastrar novos sorteios ou modificar o sistema.
            </p>
          ) : (
            <form onSubmit={handleCriarEvento} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Título da Rodada
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bingo Especial de Domingo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLoading}
                  className="h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Descrição / Prêmios
                </label>
                <textarea
                  placeholder="Ex: Prêmio principal de R$ 5.000,00"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-colors hover:bg-amber-400 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4 stroke-[3]" />
                {isLoading ? "Salvando..." : "Lançar Sorteio"}
              </button>
            </form>
          )}
        </section>

        {/* Listagem em Tempo Real vinda do Banco Convex */}
        <section className="col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-200">Sorteios Cadastrados (Banco Convex)</h2>

          {listaEventos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-500">
              Nenhuma rodada em andamento. Use o painel ao lado para cadastrar.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {listaEventos.map((evento: any) => (
                <div
                  key={evento._id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-amber-500/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-amber-400 text-lg">{evento.title}</h3>
                    <CalendarIcon className="h-4 w-4 text-slate-600 shrink-0 mt-1" />
                  </div>
                  {evento.description && (
                    <p className="text-sm text-slate-400 mt-2 line-clamp-3">{evento.description}</p>
                  )}
                  <span className="text-[10px] font-mono text-slate-600 block mt-4 border-t border-slate-800/60 pt-2">
                    ID REF: {evento._id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
