import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ShieldCheckIcon, RefreshCwIcon, PlusIcon, CalendarIcon, UsersIcon, BarChart3Icon } from "lucide-react";
import { toast } from "sonner";

export default function PainelAdminGeral() {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // 1. Recupera as sessões e credenciais locais do localStorage
  const token = localStorage.getItem("hercules_session_token") || "";
  const userDataRaw = localStorage.getItem("hercules_user");
  const user = userDataRaw ? JSON.parse(userDataRaw) : { name: "Usuário", role: "user" };

  // 2. Escuta a listagem de eventos e a mutation de criação
  const listaEventos = useQuery((api as any).events.list) || [];
  const criarRodada = useMutation((api as any).events.create);

  const handleCriarRodada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título do sorteio é obrigatório.");
      return;
    }

    setIsLoading(true);
    try {
      await criarRodada({
        token,
        title,
        description: description || undefined,
      });

      toast.success("Nova rodada lançada com sucesso!");
      setTitle("");
      setDescription("");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao tentar gravar dados na Convex.");
    } finally {
      setIsLoading(false);
    }
  };

  // Trava de Segurança Visual: Se não for administrador, barra o acesso aqui mesmo
  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 font-sans text-white">
        <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center shadow-2xl backdrop-blur-md">
          <ShieldCheckIcon className="h-16 w-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-rose-400">Acesso Restrito</h1>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Seu usuário atual não possui privilégios de administrador para acessar este módulo de auditoria e configurações.
          </p>
          <button 
            onClick={() => window.location.replace("/")}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 px-6 font-semibold text-sm text-slate-200 transition-colors hover:bg-slate-800"
          >
            Voltar para o Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans">
      {/* Cabeçalho */}
      <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-slate-900 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <ShieldCheckIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-amber-500 uppercase">
              Painel de Controle Mestre
            </h1>
            <p className="text-slate-400 mt-1">
              Gerenciamento global de apostas, sorteios, usuários e lotes do Bingo Premier.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 font-semibold text-sm text-slate-200 border border-slate-800 transition-colors hover:bg-slate-800"
        >
          <RefreshCwIcon className="h-4 w-4" /> Atualizar Métricas
        </button>
      </header>

      {/* Grid de Métricas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Sorteios Criados</span>
            <span className="text-3xl font-black text-amber-500 mt-1 block">{listaEventos.length}</span>
          </div>
          <BarChart3Icon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Usuários Ativos</span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">1</span>
          </div>
          <UsersIcon className="h-8 w-8 text-slate-700" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Nível de Permissão</span>
            <span className="text-sm font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded mt-2 inline-block">ADMIN MASTER</span>
          </div>
          <ShieldCheckIcon className="h-8 w-8 text-slate-700" />
        </div>
      </div>

      {/* Corpo de Gerenciamento */}
      <main className="grid gap-6 md:grid-cols-3">
        {/* Formulário de Ações */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl backdrop-blur-md">
          <h2 className="text-xl font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">
            Disparar Nova Rodada
          </h2>
          <form onSubmit={handleCriarRodada} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Nome da Extração
              </label>
              <input
                type="text"
                placeholder="Ex: Super Bingo de Prêmios"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 rounded-lg border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Prêmios e Detalhes
              </label>
              <textarea
                placeholder="Ex: 1º Prêmio: Carro 0KM"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={4}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              {isLoading ? "Enviando..." : "Iniciar Sorteio Mestre"}
            </button>
          </form>
        </section>

        {/* Monitor de Eventos */}
        <section className="col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200">Monitor de Rodadas na Nuvem</h2>
          {listaEventos.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12 border border-dashed border-slate-800 rounded-xl">
              Nenhuma rodada em andamento no banco Convex. Use o painel ao lado.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {listaEventos.map((evento: any) => (
                <div key={evento._id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-lg text-amber-400">{evento.title}</h4>
                    {evento.description && <p className="text-sm text-slate-400 mt-1">{evento.description}</p>}
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-2.5">
                      <CalendarIcon className="h-3 w-3" />
                      Criado em: {new Date(evento.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-950 px-2 py-1 rounded text-slate-600 shrink-0 self-start">
                    REF: {evento._id}
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
