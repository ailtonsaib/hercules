import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api"; // Mapeia a árvore de chamadas da API mestre
import { LockIcon, UserIcon, TrophyIcon } from "lucide-react";
import { toast } from "sonner";
import "@/index.css"; // Garante a injeção nativa do Tailwind v4 através do Vite

export function LoginScreen() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Aponta de forma explícita para o arquivo 'users' que atualizamos no backend
  const executeLogin = useMutation((api as any).users.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    try {
      // Dispara a requisição de login enviando as credenciais informadas nos inputs
      const response = await executeLogin({ username, password });

      if (response && response.token) {
        // Armazena as chaves de sessão locais de forma segura no navegador do usuário
        localStorage.setItem("hercules_session_token", response.token);
        localStorage.setItem("hercules_user", JSON.stringify(response.user));
        
        toast.success(`Bem-vindo, ${response.user.name}!`);
        
        // Aplica um pequeno delay e recarrega para destravar a renderização do painel
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Usuário ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-md">
        
        {/* Cabeçalho / Identidade Visual */}
        <div className="flex flex-col items-center gap-2 text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <TrophyIcon className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Bingo Premier
          </h1>
          <p className="text-sm text-slate-400">
            Insira suas credenciais para acessar o painel
          </p>
        </div>

        {/* Formulário de Acesso */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nome de Usuário
            </label>
            <div className="relative flex items-center">
              <UserIcon className="absolute left-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Ex: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Senha
            </label>
            <div className="relative flex items-center">
              <LockIcon className="absolute left-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 w-full h-11 inline-flex items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold text-sm transition-colors hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Autenticando..." : "Entrar no Painel"}
          </button>
        </form>

        {/* Informações Auxiliares de Testes */}
        <div className="mt-6 border-t border-slate-800/60 pt-4 text-center">
          <p className="text-xs text-slate-500">
            Acesso mestre de testes: <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-amber-400">admin</code> / <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-amber-400">admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
