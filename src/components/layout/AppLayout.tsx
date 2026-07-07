import * as React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { 
  TrophyIcon, 
  CalendarIcon,
  CreditCardIcon,
  DiscIcon,
  StarIcon,
  CheckSquareIcon,
  UsersIcon,
  RefreshCwIcon,
  TicketIcon,
  PaintbrushIcon,
  BarChart3Icon,
  LayoutDashboardIcon,
  InfoIcon,
  LogOutIcon
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { eventId } = useParams<{ eventId: string }>();

  const userDataRaw = localStorage.getItem("hercules_user");
  const user = userDataRaw ? JSON.parse(userDataRaw) : { name: "Ailton Aires", role: "admin" };

  // Captura de forma segura se existe algum identificador de extração ativa em cache
  const idSorteioAtivo = eventId || localStorage.getItem("hercules_last_event_id") || "";

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-100 w-screen overflow-x-hidden">
      {/* 💻 BARRA LATERAL ESQUERDA ESTILIZADA */}
      <aside className="w-64 border-r border-slate-900 bg-[#0f0f1e]/40 p-5 flex flex-col justify-between shrink-0">
        <div className="flex flex-col gap-6">
          {/* Cabeçalho do App */}
          <div className="flex items-center gap-3 border-b border-slate-900/60 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
              <TrophyIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-widest text-white uppercase">BINGO</h2>
              <span className="text-[10px] text-slate-400 block font-medium">Sistema Eletrônico</span>
            </div>
          </div>

          {/* Links de Navegação Forçados e Estabilizados */}
          <nav className="flex flex-col gap-1">
            
            {/* 1. EVENTOS */}
            <Link
              to="/events"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/events" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <CalendarIcon className="h-4 w-4 shrink-0" />
              Eventos
            </Link>

             {/* 👑 2. CARTELAS REATIVADO COM ÍCONE BLINDADO CONTRA SUMIÇOS */}
            <Link
              to="/cartelas"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/cartelas" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              {/* Mudado de CreditCardIcon para TrophyIcon ou LayersIcon que já existem no seu projeto */}
              <TrophyIcon className="h-4 w-4 shrink-0 text-slate-500" />
              Cartelas
            </Link>

            {/* 3. SORTEIO */}
            <Link
              to={idSorteioAtivo ? `/sorteio/${idSorteioAtivo}` : "/events"}
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname.startsWith("/sorteio/") ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <DiscIcon className="h-4 w-4 shrink-0" />
              Sorteio
            </Link>

            {/* 4. GIRO DA SORTE */}
            <Link
              to="/giro"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/giro" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <StarIcon className="h-4 w-4 shrink-0" />
              Giro da Sorte
            </Link>

            {/* 5. VALIDAR */}
            <Link
              to={idSorteioAtivo ? `/validar/${idSorteioAtivo}` : "/events"}
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname.startsWith("/validar/") ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <CheckSquareIcon className="h-4 w-4 shrink-0" />
              Validar
            </Link>

            {/* 6. VENDEDORES */}
            <Link
              to="/vendors"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/vendors" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <UsersIcon className="h-4 w-4 shrink-0" />
              Vendedores
            </Link>

            {/* 7. TRANSFERIR LOTES */}
            <Link
              to="/batches"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/batches" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <RefreshCwIcon className="h-4 w-4 shrink-0" />
              Transferir Lotes
            </Link>

            {/* 8. RIFAS */}
            <Link
              to="/rifas"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/rifas" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <TicketIcon className="h-4 w-4 shrink-0" />
              Rifas
            </Link>

            {/* 9. DESIGN CARTELA */}
            <Link
              to="/design-cartela"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/design-cartela" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <PaintbrushIcon className="h-4 w-4 shrink-0" />
              Design Cartela
            </Link>

            {/* 10. RELATÓRIOS */}
            <Link
              to="/reports"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/reports" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <BarChart3Icon className="h-4 w-4 shrink-0" />
              Relatórios
            </Link>

            {/* 11. DASHBOARD */}
            <Link
              to="/dashboard"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/dashboard" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <LayoutDashboardIcon className="h-4 w-4 shrink-0" />
              Dashboard
            </Link>

            {/* 12. INFORMAÇÕES */}
            <Link
              to="/info"
              className={`flex h-10 items-center gap-3 rounded-xl px-4 font-semibold text-sm transition-all ${location.pathname === "/info" ? "bg-rose-500 text-white shadow-md" : "text-slate-400 hover:bg-slate-900/50"}`}
            >
              <InfoIcon className="h-4 w-4 shrink-0" />
              Informações
            </Link>

          </nav>
        </div>

        {/* Rodapé do Administrador */}
        <div className="border-t border-slate-900 pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mt-0.5">
                👑 Painel Admin
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg border border-slate-900 bg-slate-950 text-slate-500 hover:text-rose-400 transition-colors"
              title="Encerrar Painel"
            >
              <LogOutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 📑 ÁREA DE CONTEÚDO PRINCIPAL DINÂMICO */}
      <main className="flex-1 overflow-y-auto bg-slate-950 p-6 no-print">
        {children}
      </main>
    </div>
  );
}
