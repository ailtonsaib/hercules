import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, Layers, Shuffle, CheckSquare, Trophy, LayoutDashboard, Users, BarChart3, LogOut, ShieldCheck, Info, Sparkles, UserCircle, ArrowRightLeft, Ticket, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "convex/react";
import { Button } from "@/components/ui/button.tsx";
import { NotificationBell } from "@/components/notifications/NotificationBell.tsx";
import { useEffect } from "react";

const adminNavItems = [
  { to: "/", label: "Eventos", icon: CalendarDays, exact: true },
  { to: "/cartelas", label: "Cartelas", icon: Layers },
  { to: "/sorteio", label: "Sorteio", icon: Shuffle },
  { to: "/giro", label: "Giro da Sorte", icon: Sparkles },
  { to: "/validar", label: "Validar", icon: CheckSquare },
  { to: "/vendedores", label: "Vendedores", icon: Users },
  { to: "/lotes", label: "Transferir Lotes", icon: ArrowRightLeft },
  { to: "/rifas", label: "Rifas", icon: Ticket },
  { to: "/design-cartela", label: "Design Cartela", icon: Paintbrush },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/informacoes", label: "Informações", icon: Info },
];

const vendorNavItems = [
  { to: "/meu-painel", label: "Meu Painel", icon: UserCircle, exact: true },
];

function UserInfo() {
  const { user, signout } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const usage = useQuery(api.events.getMyCardUsage);

  const isVendor = currentUser?.role === "vendor" && !currentUser?.isAdmin;

  const planLabel: Record<string, string> = {
    free: "Gratuito",
    basic: "Básico",
    pro: "Profissional",
    max: "Máximo",
    ultra: "Ultra",
    enterprise: "Enterprise",
    mega: "MEGA",
  };

  return (
    <div className="p-4 border-t border-sidebar-border space-y-3">
      {currentUser?.isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-yellow-500 hover:bg-sidebar-accent"
            )
          }
        >
          <ShieldCheck className="w-4 h-4" />
          Painel Admin
        </NavLink>
      )}
      {usage && !currentUser?.isAdmin && !isVendor && (
        <div className="px-3 space-y-1">
          <div className="flex justify-between text-xs text-sidebar-foreground/60">
            <span>Plano {planLabel[usage.plan] ?? usage.plan}</span>
            <span>{usage.used} / {usage.limit} cartelas</span>
          </div>
          <div className="h-1.5 bg-sidebar-border rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usage.used / usage.limit > 0.9
                  ? "bg-destructive"
                  : usage.used / usage.limit > 0.7
                  ? "bg-yellow-500"
                  : "bg-accent"
              )}
              style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {isVendor && (
        <div className="px-3">
          <span className="text-xs text-sidebar-foreground/50 font-medium">Perfil: Vendedor</span>
        </div>
      )}
      <div className="flex items-center justify-between px-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sidebar-foreground truncate">
            {user?.profile.name ?? user?.profile.email ?? "Usuário"}
          </p>
          <p className="text-xs text-sidebar-foreground/50 truncate">
            {user?.profile.email}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground w-7 h-7"
          onClick={() => void signout()}
          title="Sair"
        >
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// Routes allowed for vendor role
const VENDOR_ALLOWED_ROUTES = ["/meu-painel"];

export default function AppLayout() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const moduleStatus = useQuery(api.appSettings.getUserModuleStatus);
  const isVendor = currentUser?.role === "vendor" && !currentUser?.isAdmin;
  const hasVendorApp = currentUser?.isAdmin || (moduleStatus?.vendorApp.enabled ?? true);
  const hasRifas = currentUser?.isAdmin || (moduleStatus?.rifas.enabled ?? true);

  // Filter nav items based on module access
  const filteredAdminNavItems = adminNavItems.filter((item) => {
    if (item.to === "/lotes" || item.to === "/vendedores") return hasVendorApp;
    if (item.to === "/rifas") return hasRifas;
    return true;
  });

  const navItems = isVendor ? vendorNavItems : filteredAdminNavItems;
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect vendor to their panel, and prevent access to admin routes
  useEffect(() => {
    if (!currentUser) return;
    if (isVendor) {
      const allowed = VENDOR_ALLOWED_ROUTES.some((r) => location.pathname.startsWith(r));
      if (!allowed) {
        void navigate("/meu-painel", { replace: true });
      }
    }
  }, [isVendor, currentUser, location.pathname, navigate]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="font-black text-sidebar-foreground text-lg leading-tight">BINGO</h1>
                <p className="text-sidebar-foreground/60 text-xs font-medium">Sistema Eletrônico</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Authenticated>
          <UserInfo />
        </Authenticated>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Trophy className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-black text-sidebar-foreground text-base">BINGO</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </main>

        {/* Bottom nav mobile */}
        <nav className="fixed bottom-0 left-0 right-0 flex md:hidden bg-sidebar border-t border-sidebar-border z-40">
          {navItems.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 text-xs font-semibold transition-colors cursor-pointer",
                  isActive
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
