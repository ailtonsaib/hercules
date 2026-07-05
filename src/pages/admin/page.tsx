import React, { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { ShieldCheck, Users, ClipboardList, CheckCircle2, XCircle, MonitorX, Trophy, Lock, Unlock, Smartphone, UserCog, Settings, LayoutGrid, RefreshCw, Link2, Copy, Check, KeyRound, Mail, AlertTriangle, Search } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { cn } from "@/lib/utils.ts";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito (70)",
  basic: "Básico (2.000)",
  pro: "Profissional (4.000)",
  max: "Máximo (8.000)",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  basic: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  pro: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  max: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};

// ---- Validator Code Card (reusable for both admin and limited-view) ----
function ValidatorCodeCard({ currentCode, onSave }: { currentCode: string; onSave: (value: string) => Promise<void> }) {
  const [codeInput, setCodeInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const cleaned = codeInput.trim().replace(/\D/g, "").slice(0, 6);
    setSaving(true);
    await onSave(cleaned);
    setSaving(false);
    setCodeInput("");
  };

  return (
    <div className="bg-card border-2 rounded-xl p-5 space-y-3 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
          <KeyRound className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">Código do Validador Externo</p>
          <p className="text-xs text-muted-foreground">
            Código de 6 dígitos para acessar o validador sem login ({window.location.origin}/validador).
            Deixe em branco para desabilitar.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground font-medium shrink-0">
          Código atual:{" "}
          <span className="text-foreground font-bold font-mono">
            {currentCode ? currentCode : <span className="text-muted-foreground italic font-normal">Desabilitado</span>}
          </span>
        </span>
        <div className="flex items-center gap-2 flex-1">
          <Input
            placeholder="000000"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-9 text-sm w-32 font-mono"
            inputMode="numeric"
            onKeyDown={(e) => e.key === "Enter" && void handleSave()}
          />
          <Button size="sm" onClick={() => void handleSave()} disabled={saving} className="h-9">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Sender Email Card ----
type EmailStatus = "pending" | "verified" | "failed" | "not_found" | null;

function SenderEmailCard({ currentEmail, currentStatus, onSave }: {
  currentEmail: string;
  currentStatus: string;
  onSave: (email: string, status: string) => Promise<void>;
}) {
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [liveStatus, setLiveStatus] = useState<EmailStatus>(
    currentStatus as EmailStatus || null
  );
  const registerSenderEmail = useAction(api.emailIdentity.registerSenderEmail);
  const checkSenderEmailStatus = useAction(api.emailIdentity.checkSenderEmailStatus);

  // Sync live status when prop changes
  React.useEffect(() => {
    setLiveStatus(currentStatus as EmailStatus || null);
  }, [currentStatus]);

  const handleRegister = async () => {
    const email = emailInput.trim();
    if (!email || !email.includes("@")) { toast.error("Informe um e-mail válido"); return; }
    setLoading(true);
    try {
      const result = await registerSenderEmail({ email });
      setLiveStatus(result.status);
      await onSave(email, result.status);
      setEmailInput("");
      if (result.status === "verified") {
        toast.success("E-mail já verificado! Pronto para enviar.");
      } else {
        toast.success("E-mail de verificação enviado! Confirme sua caixa de entrada.");
      }
    } catch {
      toast.error("Erro ao registrar e-mail");
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!currentEmail) return;
    setChecking(true);
    try {
      const result = await checkSenderEmailStatus({ email: currentEmail });
      setLiveStatus(result.status);
      await onSave(currentEmail, result.status === "not_found" ? "" : result.status);
      if (result.status === "verified") toast.success("E-mail verificado!");
      else if (result.status === "pending") toast.info("Ainda aguardando confirmação.");
      else toast.error("Não encontrado ou falhou.");
    } catch {
      toast.error("Erro ao verificar status");
    } finally {
      setChecking(false);
    }
  };

  const statusConfig = {
    verified:  { label: "Verificado",           cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",  dot: "bg-green-500" },
    pending:   { label: "Aguardando confirmação",cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", dot: "bg-yellow-500" },
    failed:    { label: "Falhou",               cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",     dot: "bg-red-500" },
    not_found: { label: "Não encontrado",        cls: "bg-muted text-muted-foreground",                                    dot: "bg-muted-foreground" },
  } as const;

  const statusInfo = liveStatus && liveStatus !== "not_found" ? statusConfig[liveStatus] : null;

  return (
    <div className="bg-card border-2 rounded-xl p-5 space-y-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">E-mail Remetente para Rastreamento</p>
          <p className="text-xs text-muted-foreground">
            Informe o e-mail que será usado para enviar o link de acompanhamento aos compradores.
            É necessário confirmar o e-mail antes de usá-lo.
          </p>
        </div>
      </div>

      {/* Current email + status */}
      {currentEmail && (
        <div className="flex flex-wrap items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
          <span className="text-sm font-mono text-foreground font-semibold flex-1 min-w-0 truncate">{currentEmail}</span>
          {statusInfo && (
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full ${statusInfo.cls}`}>
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
          )}
          {liveStatus === "pending" && (
            <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => void handleCheck()} disabled={checking}>
              {checking ? "Verificando..." : "Checar status"}
            </Button>
          )}
        </div>
      )}

      {/* Pending alert */}
      {liveStatus === "pending" && (
        <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-800 dark:text-yellow-300">Confirmação pendente</p>
            <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-0.5">
              Um e-mail de confirmação foi enviado para <strong>{currentEmail}</strong>.
              Clique no link recebido para liberar o envio. Após confirmar, clique em "Checar status".
            </p>
          </div>
        </div>
      )}

      {/* Verified success */}
      {liveStatus === "verified" && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700 rounded-lg p-3 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-green-800 dark:text-green-300 font-semibold">
            E-mail verificado e pronto para envios!
          </p>
        </div>
      )}

      {/* Register new email */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {currentEmail ? "Alterar e-mail remetente" : "Cadastrar e-mail remetente"}
        </label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="seu@email.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="h-9 text-sm"
            onKeyDown={(e) => e.key === "Enter" && void handleRegister()}
          />
          <Button size="sm" onClick={() => void handleRegister()} disabled={loading || !emailInput.trim()} className="h-9 shrink-0">
            {loading ? "Enviando..." : "Cadastrar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Um e-mail de confirmação será enviado. O remetente só poderá ser usado após a confirmação.
        </p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const users = useQuery(api.users.adminListUsers);
  const requests = useQuery(api.users.adminListRequests);
  const approveRequest = useMutation(api.users.adminApproveRequest);
  const rejectRequest = useMutation(api.users.adminRejectRequest);
  const approveDeviceByUserId = useMutation(api.users.adminApproveDeviceByUserId);
  const setUserPlan = useMutation(api.users.adminSetUserPlan);
  const toggleBlock = useMutation(api.users.adminToggleBlock);
  const resetDevice = useMutation(api.users.adminResetDevice);
  const setUserRole = useMutation(api.users.adminSetUserRole);
  const vendors = useQuery(api.vendors.list);
  const planConfigs = useQuery(api.planConfigs.list);
  const upsertPlan = useMutation(api.planConfigs.upsert);
  const appSettings = useQuery(api.appSettings.getAll);
  const setSetting = useMutation(api.appSettings.set);
  const currentUser = useQuery(api.users.getCurrentUser);

  const PLAN_ORDER = ["free", "basic", "pro", "max", "ultra", "enterprise", "mega"] as const;
  type PlanKey = (typeof PLAN_ORDER)[number];
  const vendorMinPlan = (appSettings?.["vendor_app_min_plan"] ?? "pro") as PlanKey;
  const buyerTrackingMinPlan = (appSettings?.["buyer_tracking_min_plan"] ?? "free") as PlanKey;
  const userPlan = (currentUser?.plan ?? "free") as PlanKey;
  const isAdmin = currentUser?.isAdmin === true;
  const hasVendorAccess = isAdmin || PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(vendorMinPlan);
  const hasBuyerTrackingAccess = isAdmin || PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(buyerTrackingMinPlan);
  // Non-admins with vendor access see only invite link and validator code
  const isLimitedView = !isAdmin && hasVendorAccess;

  const [tab, setTab] = useState<"requests" | "users" | "plans" | "modules">("requests");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const pendingRequests = requests?.filter((r) => r.status === "pending") ?? [];
  const resolvedRequests = requests?.filter((r) => r.status !== "pending") ?? [];

  const handleApprove = async (requestId: Id<"accessRequests">) => {
    setLoadingId(requestId);
    try {
      await approveRequest({ requestId });
      toast.success("Solicitação aprovada!");
    } catch {
      toast.error("Erro ao aprovar");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (requestId: Id<"accessRequests">) => {
    setLoadingId(requestId);
    try {
      await rejectRequest({ requestId });
      toast.success("Solicitação rejeitada");
    } catch {
      toast.error("Erro ao rejeitar");
    } finally {
      setLoadingId(null);
    }
  };

  const handleSetPlan = async (userId: Id<"users">, plan: string) => {
    setLoadingId(userId);
    try {
      await setUserPlan({ userId, plan: plan as "free" | "basic" | "pro" | "max" | "ultra" | "enterprise" | "mega" });
      toast.success("Plano atualizado!");
    } catch {
      toast.error("Erro ao atualizar plano");
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleBlock = async (userId: Id<"users">, isBlocked: boolean | undefined) => {
    setLoadingId(userId);
    try {
      await toggleBlock({ userId });
      toast.success(isBlocked ? "Usuário desbloqueado" : "Usuário bloqueado");
    } catch {
      toast.error("Erro ao alterar bloqueio");
    } finally {
      setLoadingId(null);
    }
  };

  const handleResetDevice = async (userId: Id<"users">) => {
    setLoadingId(userId);
    try {
      await resetDevice({ userId });
      toast.success("Dispositivo resetado — usuário pode registrar novo");
    } catch {
      toast.error("Erro ao resetar dispositivo");
    } finally {
      setLoadingId(null);
    }
  };

  const handleSetRole = async (
    userId: Id<"users">,
    role: "admin" | "vendor" | "none",
    linkedVendorId?: Id<"vendors">,
  ) => {
    setLoadingId(userId);
    try {
      await setUserRole({ userId, role, linkedVendorId });
      toast.success("Perfil atualizado!");
    } catch {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-6 h-6 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-foreground">Painel Admin</h1>
          <p className="text-muted-foreground text-sm">{isAdmin ? "Controle total do sistema" : "Acesso de operador"}</p>
        </div>
      </div>

      {/* Sender Email Card (above invite banner, only for admin with buyer tracking access) */}
      {isAdmin && hasBuyerTrackingAccess && appSettings && (
        <SenderEmailCard
          currentEmail={appSettings["sender_email"] ?? ""}
          currentStatus={appSettings["sender_email_status"] ?? ""}
          onSave={async (email, status) => {
            await setSetting({ key: "sender_email", value: email });
            await setSetting({ key: "sender_email_status", value: status });
          }}
        />
      )}

      {/* Invite banner */}
      <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Link2 className="w-4 h-4 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Link de convite para operadores</p>
          <p className="text-xs text-muted-foreground">Compartilhe para que vendedores e validadores criem conta e solicitem acesso.</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={() => {
              void navigator.clipboard.writeText(`${window.location.origin}/convite`).then(() => {
                setCopiedInvite(true);
                setTimeout(() => setCopiedInvite(false), 2000);
              });
            }}
          >
            {copiedInvite ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copiedInvite ? "Copiado!" : "Copiar link"}
          </Button>
          <a href="/convite" target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-1.5">
              <Link2 className="w-4 h-4" />
              Abrir convite
            </Button>
          </a>
        </div>
      </div>

      {/* Validator code (visible for limited view too) */}
      {isLimitedView && appSettings && (
        <>
          <ValidatorCodeCard
            currentCode={appSettings["validator_access_code"] ?? ""}
            onSave={async (value) => { await setSetting({ key: "validator_access_code", value }); }}
          />
          {hasBuyerTrackingAccess && (
            <SenderEmailCard
              currentEmail={appSettings["sender_email"] ?? ""}
              currentStatus={appSettings["sender_email_status"] ?? ""}
              onSave={async (email, status) => {
                await setSetting({ key: "sender_email", value: email });
                await setSetting({ key: "sender_email_status", value: status });
              }}
            />
          )}
        </>
      )}

      {/* Non-admin without vendor access: blocked */}
      {!isAdmin && !hasVendorAccess && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground">Acesso restrito</p>
          <p className="text-sm text-muted-foreground max-w-xs">Você não tem permissão para acessar esta área. Entre em contato com o administrador.</p>
        </div>
      )}

      {/* Full admin view */}
      {isAdmin && (<>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Usuários", value: users?.length ?? 0, icon: Users },
          { label: "Pendentes", value: pendingRequests.length, icon: ClipboardList },
          { label: "Ativos", value: users?.filter((u) => !u.isBlocked).length ?? 0, icon: CheckCircle2 },
          { label: "Bloqueados", value: users?.filter((u) => u.isBlocked).length ?? 0, icon: Lock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-xl border p-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-black text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === "requests" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTab("requests")}
          className="gap-2"
        >
          <ClipboardList className="w-4 h-4" />
          Solicitações
          {pendingRequests.length > 0 && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </Button>
        <Button
          variant={tab === "users" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTab("users")}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          Usuários
        </Button>
        <Button
          variant={tab === "plans" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTab("plans")}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Planos
        </Button>
        <Button
          variant={tab === "modules" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTab("modules")}
          className="gap-2"
        >
          <LayoutGrid className="w-4 h-4" />
          Módulos
        </Button>
      </div>

      {/* Requests tab */}
      {tab === "requests" && (
        <div className="space-y-6">
          {/* Pending */}
          <div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
              Pendentes ({pendingRequests.length})
            </h2>
            {!requests ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="bg-muted/40 rounded-xl border border-dashed p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req._id} className="bg-card border rounded-xl p-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.type === "upgrade" ? (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-0">
                            <Trophy className="w-3 h-3 mr-1" /> {req.userEmail || req.userName ? "Novo Acesso" : "Upgrade"}
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-0">
                            <Smartphone className="w-3 h-3 mr-1" /> Troca de Dispositivo
                          </Badge>
                        )}
                        <span className="text-sm font-semibold text-foreground truncate">
                          {req.userName ?? req.userEmail ?? "Usuário desconhecido"}
                        </span>
                        {req.userEmail && (
                          <span className="text-xs text-muted-foreground truncate">{req.userEmail}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {req.type === "upgrade"
                          ? `Plano solicitado: ${PLAN_LABELS[req.requestedPlan ?? ""] ?? req.requestedPlan}`
                          : `Novo dispositivo: ${req.newDeviceLabel ?? req.newDeviceFingerprint}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground">
                          Solicitado em: {new Date(req.createdAt).toLocaleString("pt-BR")}
                        </p>
                        {req.type === "upgrade" && (() => {
                          // Calculate remaining business days
                          const created = new Date(req.createdAt);
                          const now = new Date();
                          let elapsed = 0;
                          const cur = new Date(created);
                          while (cur < now) {
                            cur.setDate(cur.getDate() + 1);
                            const d = cur.getDay();
                            if (d !== 0 && d !== 6) elapsed++;
                          }
                          const remaining = Math.max(0, 3 - elapsed);
                          return (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${remaining === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : remaining === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                              {remaining === 0 ? "Expira hoje" : `${remaining} dia${remaining > 1 ? "s úteis" : " útil"} restante${remaining > 1 ? "s" : ""}`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={loadingId === req._id}
                        onClick={() => void handleApprove(req._id)}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        disabled={loadingId === req._id}
                        onClick={() => void handleReject(req._id)}
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolved */}
          {resolvedRequests.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
                Histórico
              </h2>
              <div className="space-y-2">
                {resolvedRequests.slice(0, 20).map((req) => (
                  <div key={req._id} className="bg-muted/30 border rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", req.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {req.status === "approved" ? "Aprovado" : "Rejeitado"}
                    </span>
                    <span className="text-sm text-foreground truncate flex-1">{req.userEmail ?? req.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {req.type === "upgrade" ? `Plano: ${req.requestedPlan}` : "Dispositivo"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {!users ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
          ) : (() => {
            const filtered = users.filter((u) => {
              const q = userSearch.toLowerCase();
              return !q || (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
            });

            if (filtered.length === 0) {
              return <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>;
            }

            return filtered.map((u) => {
              const currentRole = u.isAdmin ? "admin" : (u.role === "vendor" ? "vendor" : "none");
              return (
                <div key={u._id} className={cn("bg-card border rounded-xl p-4 space-y-3", u.isBlocked && "opacity-60")}>
                  {/* Top row: name + badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {u.isAdmin && (
                      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-0 text-xs">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                      </Badge>
                    )}
                    {u.role === "vendor" && !u.isAdmin && (
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-xs">
                        <Users className="w-3 h-3 mr-1" /> Vendedor
                      </Badge>
                    )}
                    {!u.isAdmin && u.role !== "vendor" && (
                      <Badge className="bg-muted text-muted-foreground border-0 text-xs">
                        <UserCog className="w-3 h-3 mr-1" /> Padrão
                      </Badge>
                    )}
                    {u.isBlocked && (
                      <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                    )}
                    <span className="font-semibold text-foreground text-sm">{u.name ?? u.email ?? "Sem nome"}</span>
                  </div>

                  {/* Info row */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {u.email && <span className="truncate">{u.email}</span>}
                    <span>Dispositivo: <strong className="text-foreground">{u.deviceLabel ?? "Aguardando primeiro acesso"}</strong></span>
                    {u.devicePendingApproval && (
                      <span className="text-orange-500 font-semibold">Troca pendente: {u.newDeviceLabel}</span>
                    )}
                    {u.linkedVendorId && (
                      <span className="text-blue-500">Vinculado: {vendors?.find((v) => v._id === u.linkedVendorId)?.name ?? "vendedor"}</span>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Perfil selector */}
                    <Select
                      value={currentRole}
                      onValueChange={(v) => void handleSetRole(u._id, v as "admin" | "vendor" | "none")}
                      disabled={loadingId === u._id}
                    >
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Padrão</SelectItem>
                        <SelectItem value="vendor">Vendedor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Vendor link */}
                    {(u.role === "vendor" || currentRole === "vendor") && (
                      <Select
                        value={u.linkedVendorId ?? "none"}
                        onValueChange={(v) =>
                          void handleSetRole(u._id, "vendor", v !== "none" ? (v as Id<"vendors">) : undefined)
                        }
                        disabled={loadingId === u._id}
                      >
                        <SelectTrigger className="h-8 text-xs w-48">
                          <SelectValue placeholder="Vincular vendedor..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem vínculo</SelectItem>
                          {vendors?.map((v) => (
                            <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Plan selector */}
                    {!u.isAdmin && (
                      <Select
                        value={u.plan ?? "free"}
                        onValueChange={(v) => void handleSetPlan(u._id, v)}
                        disabled={loadingId === u._id}
                      >
                        <SelectTrigger className={cn("h-8 text-xs w-52", PLAN_COLORS[u.plan ?? "free"])}>
                          <span>
                            {u.plan === "free" && `Gratuito — ${(u.cardLimit ?? 70).toLocaleString("pt-BR")} cartelas`}
                            {u.plan === "basic" && `Básico — ${(u.cardLimit ?? 2000).toLocaleString("pt-BR")} cartelas`}
                            {u.plan === "pro" && `Profissional — ${(u.cardLimit ?? 4000).toLocaleString("pt-BR")} cartelas`}
                            {u.plan === "max" && `Máximo — ${(u.cardLimit ?? 8000).toLocaleString("pt-BR")} cartelas`}
                            {u.plan === "ultra" && `Ultra — ${(u.cardLimit ?? 12000).toLocaleString("pt-BR")} cartelas`}
                            {u.plan === "enterprise" && `Enterprise — ${(u.cardLimit ?? 15000).toLocaleString("pt-BR")} cartelas`}
                            {u.plan === "mega" && `Mega — ${(u.cardLimit ?? 50000).toLocaleString("pt-BR")} cartelas`}
                            {!u.plan && `Gratuito — ${(u.cardLimit ?? 70).toLocaleString("pt-BR")} cartelas`}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Gratuito — {u.plan === "free" ? (u.cardLimit ?? 70).toLocaleString("pt-BR") : "70"} cartelas</SelectItem>
                          <SelectItem value="basic">Básico — {u.plan === "basic" ? (u.cardLimit ?? 2000).toLocaleString("pt-BR") : "2.000"} cartelas</SelectItem>
                          <SelectItem value="pro">Profissional — {u.plan === "pro" ? (u.cardLimit ?? 4000).toLocaleString("pt-BR") : "4.000"} cartelas</SelectItem>
                          <SelectItem value="max">Máximo — {u.plan === "max" ? (u.cardLimit ?? 8000).toLocaleString("pt-BR") : "8.000"} cartelas</SelectItem>
                          <SelectItem value="ultra">Ultra — {u.plan === "ultra" ? (u.cardLimit ?? 12000).toLocaleString("pt-BR") : "12.000"} cartelas</SelectItem>
                          <SelectItem value="enterprise">Enterprise — {u.plan === "enterprise" ? (u.cardLimit ?? 15000).toLocaleString("pt-BR") : "15.000"} cartelas</SelectItem>
                          <SelectItem value="mega">Mega — {u.plan === "mega" ? (u.cardLimit ?? 50000).toLocaleString("pt-BR") : "50.000"} cartelas</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Approve device swap */}
                    {!u.isAdmin && u.devicePendingApproval && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700"
                          disabled={loadingId === u._id}
                          onClick={async () => {
                            setLoadingId(u._id);
                            try {
                              await approveDeviceByUserId({ userId: u._id });
                              toast.success("Troca de dispositivo aprovada!");
                            } catch {
                              toast.error("Erro ao aprovar troca");
                            } finally {
                              setLoadingId(null);
                            }
                          }}
                        >
                          <MonitorX className="w-3.5 h-3.5" />
                          Aprovar Troca
                        </Button>
                        {(() => {
                          const deviceReq = requests?.find(
                            (r) => r.userId === u._id && r.type === "device" && r.status === "pending"
                          );
                          return deviceReq ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1.5 text-xs h-8"
                              disabled={loadingId === deviceReq._id}
                              onClick={() => void handleReject(deviceReq._id)}
                            >
                              Rejeitar
                            </Button>
                          ) : null;
                        })()}
                      </>
                    )}

                    {/* Reset device */}
                    {!u.isAdmin && u.deviceFingerprint && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 text-xs h-8"
                        disabled={loadingId === u._id}
                        onClick={() => void handleResetDevice(u._id)}
                        title="Resetar dispositivo"
                      >
                        <MonitorX className="w-3.5 h-3.5" />
                        Reset Dispositivo
                      </Button>
                    )}

                    {/* Block/unblock */}
                    {!u.isAdmin && (
                      <Button
                        size="sm"
                        variant={u.isBlocked ? "secondary" : "destructive"}
                        className="gap-1.5 text-xs h-8"
                        disabled={loadingId === u._id}
                        onClick={() => void handleToggleBlock(u._id, u.isBlocked)}
                      >
                        {u.isBlocked
                          ? <><Unlock className="w-3.5 h-3.5" />Desbloquear</>
                          : <><Lock className="w-3.5 h-3.5" />Bloquear</>}
                      </Button>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Plans tab */}
      {tab === "plans" && <PlansEditor configs={planConfigs ?? []} upsertPlan={async (data) => { await upsertPlan(data); }} />}

      {/* Modules tab */}
      {tab === "modules" && (
        <>
          <ModulesEditor
            settings={appSettings ?? {}}
            onSave={async (key, value) => {
              try {
                await setSetting({ key, value });
                toast.success("Configuração salva!");
              } catch {
                toast.error("Erro ao salvar");
              }
            }}
          />
        </>
      )}
      </>)}
    </div>
  );
}

// ---- Plan editor sub-component ----
type PlanConfig = {
  key: "free" | "basic" | "pro" | "max" | "ultra" | "enterprise" | "mega";
  label: string;
  price: string;
  cardLimit: number;
  description: string;
};

const PLAN_COLORS_EDITOR: Record<string, string> = {
  free:  "border-border",
  basic: "border-emerald-400",
  pro:   "border-blue-400",
  max:   "border-purple-400",
};

function PlanCard({
  config,
  onSave,
}: {
  config: PlanConfig;
  onSave: (data: Omit<PlanConfig, "_id">) => Promise<void>;
}) {
  const [label, setLabel] = useState(config.label);
  const [price, setPrice] = useState(config.price);
  const [cardLimit, setCardLimit] = useState(String(config.cardLimit));
  const [description, setDescription] = useState(config.description);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // sync if parent config changes (e.g. first load from DB)
  const mark = () => setDirty(true);

  const handleSave = async () => {
    const limit = parseInt(cardLimit, 10);
    if (isNaN(limit) || limit < 1) { toast.error("Limite inválido"); return; }
    setSaving(true);
    try {
      await onSave({ key: config.key, label: label.trim() || config.key.toUpperCase(), price: price.trim(), cardLimit: limit, description: description.trim() });
      toast.success(`Plano ${config.key.toUpperCase()} salvo!`);
      setDirty(false);
    } catch {
      toast.error("Erro ao salvar plano");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("bg-card border-2 rounded-xl p-5 space-y-4", PLAN_COLORS_EDITOR[config.key])}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{config.key}</span>
        {dirty && <span className="text-xs text-yellow-500 font-semibold">● Alterado</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Rótulo</Label>
          <Input
            value={label}
            onChange={(e) => { setLabel(e.target.value); mark(); }}
            placeholder="FREE"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Preço (exibição)</Label>
          <Input
            value={price}
            onChange={(e) => { setPrice(e.target.value); mark(); }}
            placeholder="R$ 400,00"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Limite de cartelas</Label>
          <Input
            type="number"
            min={1}
            value={cardLimit}
            onChange={(e) => { setCardLimit(e.target.value); mark(); }}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descrição curta</Label>
          <Input
            value={description}
            onChange={(e) => { setDescription(e.target.value); mark(); }}
            placeholder="Para pequenos eventos"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Button
        size="sm"
        className="w-full cursor-pointer"
        disabled={saving || !dirty}
        onClick={() => void handleSave()}
      >
        {saving ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
}

function PlansEditor({
  configs,
  upsertPlan,
}: {
  configs: PlanConfig[];
  upsertPlan: (args: PlanConfig) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-700 rounded-xl text-sm">
        <Settings className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold text-yellow-800 dark:text-yellow-300">Atenção</p>
          <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-0.5">
            Alterar o limite de cartelas de um plano atualiza automaticamente todos os usuários nesse plano. O preço é apenas texto de exibição.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((c) => (
          <PlanCard
            key={c.key}
            config={c}
            onSave={(data) => upsertPlan(data)}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Modules editor ----
const PLAN_ORDER_KEYS = ["free", "basic", "pro", "max", "ultra", "enterprise", "mega"] as const;
const PLAN_DISPLAY: Record<string, string> = {
  free: "Gratuito (todos)",
  basic: "BASIC e acima",
  pro: "PRO e acima",
  max: "MAX e acima",
  ultra: "ULTRA e acima",
  enterprise: "ENTERPRISE e acima",
  mega: "MEGA",
};

type ModuleConfig = {
  settingKey: string;   // e.g. "rifas_min_plan"
  label: string;
  description: string;
  icon: React.ReactNode;
};

const MODULES: ModuleConfig[] = [
  {
    settingKey: "rifas_min_plan",
    label: "Gerador de Rifas",
    description: "Módulo de criação e impressão de rifas",
    icon: <LayoutGrid className="w-5 h-5 text-violet-500" />,
  },
  {
    settingKey: "buyer_tracking_min_plan",
    label: "Acompanhamento do Comprador",
    description: "Página pública onde o comprador vê suas cartelas e acompanha o sorteio em tempo real",
    icon: <LayoutGrid className="w-5 h-5 text-indigo-500" />,
  },
  {
    settingKey: "vendor_app_min_plan",
    label: "App do Vendedor",
    description: "Aplicativo de vendas utilizado pelos vendedores para registrar e gerenciar vendas de cartelas",
    icon: <LayoutGrid className="w-5 h-5 text-emerald-500" />,
  },
];

function ModulesEditor({
  settings,
  onSave,
}: {
  settings: Record<string, string>;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState<string>("");

  const currentFee = settings["reinstall_fee"] ?? "50,00";

  const handleChange = async (settingKey: string, value: string) => {
    setSaving(settingKey);
    await onSave(settingKey, value);
    setSaving(null);
  };

  const handleSaveFee = async () => {
    const cleaned = feeInput.trim().replace(/[^0-9,.]/g, "");
    if (!cleaned) return;
    setSaving("reinstall_fee");
    await onSave("reinstall_fee", cleaned);
    setSaving(null);
    setFeeInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700 rounded-xl text-sm">
        <LayoutGrid className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="font-bold text-blue-800 dark:text-blue-300">Controle de Módulos</p>
          <p className="text-blue-700 dark:text-blue-400 text-xs mt-0.5">
            Defina o plano mínimo necessário para acessar cada módulo do sistema. O admin sempre tem acesso total.
          </p>
        </div>
      </div>

      {/* Taxa de reinstalação */}
      <div className="bg-card border-2 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">Taxa de Reinstalação</p>
            <p className="text-xs text-muted-foreground">Valor cobrado para liberar acesso em novo dispositivo (exibido na página de Informações e no painel do usuário)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium shrink-0">Valor atual: <span className="text-foreground font-bold">R$ {currentFee}</span></span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm text-muted-foreground shrink-0">R$</span>
            <Input
              placeholder={currentFee}
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              className="h-9 text-sm w-32"
              onKeyDown={(e) => e.key === "Enter" && void handleSaveFee()}
            />
            <Button
              size="sm"
              onClick={() => void handleSaveFee()}
              disabled={!feeInput.trim() || saving === "reinstall_fee"}
              className="h-9"
            >
              {saving === "reinstall_fee" ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Código do Validador */}
      {settings && (
        <ValidatorCodeCard
          currentCode={settings["validator_access_code"] ?? ""}
          onSave={async (value) => { await onSave("validator_access_code", value); }}
        />
      )}

      <div className="space-y-3">
        {MODULES.map((mod) => {
          const currentValue = settings[mod.settingKey] ?? "free";
          return (
            <div key={mod.settingKey} className="bg-card border-2 rounded-xl p-5 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {mod.icon}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{mod.label}</p>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">Plano mínimo:</span>
                <Select
                  value={currentValue}
                  onValueChange={(v) => void handleChange(mod.settingKey, v)}
                  disabled={saving === mod.settingKey}
                >
                  <SelectTrigger className="h-9 text-sm w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_ORDER_KEYS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLAN_DISPLAY[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {saving === mod.settingKey && (
                  <span className="text-xs text-muted-foreground">Salvando...</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
