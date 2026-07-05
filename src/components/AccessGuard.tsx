import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { getBrowserFingerprint, getBrowserLabel } from "@/lib/device-fingerprint.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Trophy, Lock, MonitorX, ClockIcon, LogOut } from "lucide-react";
import { motion } from "motion/react";

type DeviceStatus = "checking" | "ok" | "blocked" | "pending" | "unauthenticated";

export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading, signout } = useAuth();
  const registerDevice = useMutation(api.users.registerDevice);
  const currentUser = useQuery(api.users.getCurrentUser);

  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("checking");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDeviceStatus("unauthenticated");
      return;
    }
    if (currentUser === undefined) return; // still loading

    const fingerprint = getBrowserFingerprint();
    const label = getBrowserLabel();

    void registerDevice({ fingerprint, label }).then((result) => {
      setDeviceStatus(result.status);
    }).catch(() => {
      setDeviceStatus("blocked");
    });
  }, [user, authLoading, currentUser, registerDevice]);

  // Still loading
  if (authLoading || (user && deviceStatus === "checking") || (user && currentUser === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center animate-pulse">
            <Trophy className="w-8 h-8 text-accent-foreground" />
          </div>
          <p className="text-muted-foreground text-sm font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show login
  if (!user || deviceStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center gap-8"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center shadow-2xl">
              <Trophy className="w-10 h-10 text-accent-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-black text-foreground">BINGO Premier</h1>
              <p className="text-muted-foreground mt-1 text-sm">Sistema Eletrônico de Bingo</p>
            </div>
          </div>

          <div className="w-full bg-card rounded-2xl border p-6 space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Faça login para acessar o sistema
            </p>
            <SignInButton className="w-full" />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Novo usuário? Entre em contato com o administrador para obter acesso.
          </p>
        </motion.div>
      </div>
    );
  }

  // Blocked
  if (deviceStatus === "blocked" || currentUser?.isBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm flex flex-col items-center gap-6 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">Acesso Bloqueado</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Sua conta foi bloqueada. Entre em contato com o administrador.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void signout()} className="gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </motion.div>
      </div>
    );
  }

  // Different device — pending approval
  if (deviceStatus === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center gap-6 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
            <MonitorX className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">Dispositivo Não Autorizado</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Este sistema está registrado em outro dispositivo. Sua solicitação de troca foi enviada ao administrador.
            </p>
          </div>
          <div className="w-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center gap-3">
            <ClockIcon className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300 text-left">
              Aguardando aprovação. Você será notificado quando o administrador liberar o acesso.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void signout()} className="gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </motion.div>
      </div>
    );
  }

  // Ok — render children (all users have free plan by default)
  return <>{children}</>;
}
