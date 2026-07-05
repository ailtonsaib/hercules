import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";
import {
  CheckCircle2,
  Monitor,
  AlertTriangle,
  RefreshCw,
  Shield,
  Layers,
  Zap,
  Star,
  Crown,
  Info,
  Phone,
  Lock,
  HelpCircle,
  Copy,
  ShoppingBag,
  Ticket,
  Link2,
} from "lucide-react";

// Static features per plan key (not editable, shown on info page)
const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    "Até X cartelas no total",
    "1 evento ativo",
    "Geração automática de cartelas",
    "Sorteio eletrônico",
    "Validação de cartelas",
  ],
  basic: [
    "Até X cartelas no total",
    "Eventos ilimitados",
    "Geração automática de cartelas",
    "Sorteio eletrônico completo",
    "Validação de cartelas",
    "App do vendedor (lotes por código)",
    "Exportação PDF e CSV",
    "Suporte por WhatsApp",
  ],
  pro: [
    "Até X cartelas no total",
    "Eventos ilimitados",
    "Todas as funções do BASIC",
    "Telão do sorteio (projetor)",
    "Dashboard completo com estatísticas",
    "Relatório em PDF do evento",
    "Ranking por vendedor",
    "Criação de rifas",
    "Suporte prioritário",
  ],
  max: [
    "Até X cartelas no total",
    "Eventos ilimitados",
    "Todas as funções do PRO",
    "Criação de rifas",
    "Acompanhamento do sorteio via aplicativo",
    "Múltiplos vendedores com lotes",
    "Exportação em lote (PDF)",
    "Acesso vitalício ao histórico",
    "Suporte VIP com atendimento rápido",
  ],
  ultra: [
    "Até X cartelas no total",
    "Eventos ilimitados",
    "Todas as funções do MAX",
    "Múltiplos vendedores com lotes",
    "Exportação em lote (PDF)",
    "Acesso vitalício ao histórico",
    "Suporte VIP com atendimento rápido",
  ],
  enterprise: [
    "Até X cartelas no total",
    "Eventos ilimitados",
    "Todas as funções do ULTRA",
    "Múltiplos vendedores com lotes",
    "Exportação em lote (PDF)",
    "Acesso vitalício ao histórico",
    "Suporte VIP com atendimento rápido",
  ],
  mega: [
    "Até 50.000 cartelas no total",
    "Eventos ilimitados",
    "Todas as funções do ENTERPRISE",
    "Múltiplos vendedores com lotes",
    "Exportação em lote (PDF)",
    "Acesso vitalício ao histórico",
    "Suporte VIP com atendimento rápido",
  ],
};

const PLAN_STYLE: Record<string, { color: string; badge: string; icon: typeof Layers; highlight?: boolean }> = {
  free:       { color: "border-border bg-card",                                    badge: "bg-muted text-muted-foreground",   icon: Layers },
  basic:      { color: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20",  badge: "bg-emerald-600 text-white",        icon: Zap },
  pro:        { color: "border-blue-400 bg-blue-50 dark:bg-blue-950/20",           badge: "bg-blue-600 text-white",           icon: Star, highlight: true },
  max:        { color: "border-purple-400 bg-purple-50 dark:bg-purple-950/20",     badge: "bg-purple-600 text-white",         icon: Crown },
  ultra:      { color: "border-purple-400 bg-purple-50 dark:bg-purple-950/20",     badge: "bg-purple-600 text-white",         icon: Crown },
  enterprise: { color: "border-purple-400 bg-purple-50 dark:bg-purple-950/20",     badge: "bg-purple-600 text-white",         icon: Crown },
  mega:       { color: "border-purple-400 bg-purple-50 dark:bg-purple-950/20",     badge: "bg-purple-600 text-white",         icon: Crown },
};

const RULES = [
  {
    icon: Monitor,
    title: "Uso em dispositivo único",
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    description:
      "Sua licença está vinculada a um único dispositivo (computador, tablet ou celular). O sistema registra automaticamente o dispositivo no primeiro acesso.",
  },
  {
    icon: AlertTriangle,
    title: "Troca de dispositivo",
    color: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
    description:
      "Ao tentar acessar de um dispositivo diferente, uma solicitação de troca é enviada ao administrador. O acesso no novo dispositivo só é liberado após aprovação.",
  },
  {
    icon: RefreshCw,
    title: "Taxa de reinstalação",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    description:
      "Em caso de formatação ou perda de acesso ao dispositivo original, será cobrada uma taxa de reinstalação para liberar o acesso em um novo dispositivo.",
  },
  {
    icon: Lock,
    title: "Conta intransferível",
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700",
    description:
      "A licença é pessoal e intransferível. Não é permitido compartilhar o acesso com outras pessoas ou organizações. Cada usuário deve possuir sua própria conta.",
  },
  {
    icon: Shield,
    title: "Suspensão por uso indevido",
    color: "text-destructive",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    description:
      "O uso indevido da plataforma, como tentativas de burlar o limite de cartelas ou o bloqueio de dispositivo, pode resultar em suspensão imediata da conta sem reembolso.",
  },
];

const FAQ = [
  {
    q: "Como solicito upgrade de plano?",
    a: 'Entre em contato com o administrador ou clique em "Solicitar Upgrade" na tela de limite de cartelas. O administrador aprovará o upgrade e seu limite será atualizado imediatamente.',
  },
  {
    q: "O que acontece com minhas cartelas ao trocar de plano?",
    a: "Todas as cartelas já geradas são mantidas. Ao fazer upgrade, o novo limite passa a valer e você pode gerar mais cartelas conforme o novo plano.",
  },
  {
    q: "Posso usar em celular e computador ao mesmo tempo?",
    a: "Não. O sistema permite o uso em apenas um dispositivo por vez. Para trocar, é necessário aprovação do administrador e pode haver cobrança de taxa de reinstalação.",
  },
  {
    q: "O app do vendedor conta como dispositivo separado?",
    a: "Não. O app do vendedor (/vendedor) é um acesso especial via código de lote e não requer login. Apenas o painel principal tem restrição de dispositivo.",
  },
  {
    q: "O limite de cartelas é por evento ou no total?",
    a: "O limite é no total por evento, ao excluir cartelas o limite volta a ficar disponível para cada evento.",
  },
];

export default function InfoPage() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const planConfigs = useQuery(api.planConfigs.list);
  const reinstallFee = useQuery(api.appSettings.getReinstallFee);
  const moduleStatus = useQuery(api.appSettings.getUserModuleStatus);

  const vendorUrl = `${window.location.origin}/vendedor`;
  const buyerUrl = `${window.location.origin}/minhas-cartelas`;
  const rifaUrl = `${window.location.origin}/rifas`;

  const copyUrl = (url: string, label: string) => {
    void navigator.clipboard.writeText(url).then(() => toast.success(`${label} copiado!`));
  };

  const currentPlan = currentUser?.plan ?? "free";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-foreground">Informações & Planos</h2>
        <p className="text-muted-foreground font-medium mt-1">
          Conheça os planos disponíveis, regras de uso e termos importantes do sistema
        </p>
      </div>

      {/* Current plan banner */}
      {currentUser && (
        <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/30 rounded-xl">
          <Info className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              Seu plano atual:{" "}
              <span className="text-primary">
                {currentPlan.toUpperCase()} — {currentUser.cardLimit?.toLocaleString("pt-BR") ?? 70} cartelas
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Para fazer upgrade, entre em contato com o administrador do sistema.
            </p>
          </div>
          <Badge className="flex-shrink-0 font-bold bg-primary text-primary-foreground">
            {currentPlan.toUpperCase()}
          </Badge>
        </div>
      )}

      {/* Access Links */}
      <section className="bg-card border rounded-2xl p-5 space-y-3">
        <h4 className="font-black text-foreground flex items-center gap-2 text-sm">
          <Link2 className="w-4 h-4 text-primary" />
          Links de Acesso do Sistema
        </h4>
        <div className="space-y-2">
          {/* Buyer tracking link */}
          {moduleStatus?.buyerTracking.enabled ? (
            <div className="flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl">
              <Ticket className="w-5 h-5 text-violet-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-violet-700 dark:text-violet-300">Acompanhamento do Comprador</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{buyerUrl}</p>
              </div>
              <Button size="sm" variant="secondary" className="shrink-0 h-8 text-xs gap-1" onClick={() => copyUrl(buyerUrl, "Link do comprador")}>
                <Copy className="w-3 h-3" />Copiar
              </Button>
            </div>
          ) : moduleStatus !== undefined && moduleStatus !== null && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-xl opacity-70">
              <Ticket className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-muted-foreground">Acompanhamento do Comprador</p>
                <p className="text-[11px] text-muted-foreground">Módulo não liberado neste plano — disponível a partir do <span className="font-bold">{moduleStatus.buyerTracking.minPlan.toUpperCase()}</span></p>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          )}

          {/* Vendor app link */}
          {moduleStatus?.vendorApp.enabled ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">App do Vendedor</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{vendorUrl}</p>
              </div>
              <Button size="sm" variant="secondary" className="shrink-0 h-8 text-xs gap-1" onClick={() => copyUrl(vendorUrl, "Link do vendedor")}>
                <Copy className="w-3 h-3" />Copiar
              </Button>
            </div>
          ) : moduleStatus !== undefined && moduleStatus !== null && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-xl opacity-70">
              <ShoppingBag className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-muted-foreground">App do Vendedor</p>
                <p className="text-[11px] text-muted-foreground">Módulo não liberado neste plano — disponível a partir do <span className="font-bold">{moduleStatus.vendorApp.minPlan.toUpperCase()}</span></p>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          )}

          {/* Rifas link */}
          {moduleStatus?.rifas.enabled ? (
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl">
              <Ticket className="w-5 h-5 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-orange-700 dark:text-orange-300">Rifas</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{rifaUrl}</p>
              </div>
              <Button size="sm" variant="secondary" className="shrink-0 h-8 text-xs gap-1" onClick={() => copyUrl(rifaUrl, "Link das rifas")}>
                <Copy className="w-3 h-3" />Copiar
              </Button>
            </div>
          ) : moduleStatus !== undefined && moduleStatus !== null && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-xl opacity-70">
              <Ticket className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-muted-foreground">Rifas</p>
                <p className="text-[11px] text-muted-foreground">Módulo não liberado neste plano — disponível a partir do <span className="font-bold">{moduleStatus.rifas.minPlan.toUpperCase()}</span></p>
              </div>
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          )}
        </div>
      </section>

      {/* Plans */}
      <section>
        <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Planos e Preços
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(planConfigs ?? []).map((plan) => {
            const style = PLAN_STYLE[plan.key] ?? PLAN_STYLE.free;
            const Icon = style.icon;
            const isCurrent = currentPlan === plan.key;
            const features = (PLAN_FEATURES[plan.key] ?? []).map((f) =>
              f.replace(/\bX\b/, plan.cardLimit.toLocaleString("pt-BR"))
            );
            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-shadow ${style.color} ${isCurrent ? "ring-2 ring-primary shadow-lg" : ""}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-0.5 rounded-full shadow">
                      Seu plano
                    </span>
                  </div>
                )}
                {style.highlight && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow">
                      Mais popular
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-current" />
                  <Badge className={`font-black text-sm px-2 ${style.badge}`}>{plan.label}</Badge>
                </div>
                <div>
                  <div className="text-2xl font-black text-foreground">{plan.price}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                </div>
                <div className="text-sm font-black text-primary">
                  {plan.cardLimit.toLocaleString("pt-BR")} cartelas
                </div>
                <ul className="space-y-1.5 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-foreground/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          * Os preços são cobrados uma única vez. Entre em contato com o administrador para contratar ou fazer upgrade.
        </p>
      </section>

      {/* Rules */}
      <section>
        <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Regras de Uso e Termos Importantes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RULES.map((rule) => {
            const Icon = rule.icon;
            const isReinstall = rule.title === "Taxa de reinstalação";
            const displayDescription = isReinstall
              ? `Em caso de formatação ou perda de acesso ao dispositivo original, será cobrada uma taxa de reinstalação de R$ ${reinstallFee ?? "..."} para liberar o acesso em um novo dispositivo.`
              : rule.description;
            return (
              <div key={rule.title} className={`flex gap-3 p-4 rounded-xl border ${rule.bg}`}>
                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${rule.color}`} />
                <div>
                  <p className={`text-sm font-black ${rule.color}`}>{rule.title}</p>
                  <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{displayDescription}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tax highlight */}
      <section className="bg-destructive/10 border-2 border-destructive/40 rounded-2xl p-5">
        <div className="flex gap-4 items-start">
          <RefreshCw className="w-8 h-8 text-destructive flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-lg font-black text-destructive">Taxa de Reinstalação: R$ {reinstallFee ?? "..."}</h4>
            <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
              Ao formatar ou perder acesso ao dispositivo original,
              será necessário pagar uma <strong>taxa única de R$ {reinstallFee ?? "..."}</strong> para liberar o acesso
              em um novo dispositivo. Essa taxa cobre o processo de verificação e reativação da licença.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              {["Formatação do dispositivo", "Perda do dispositivo", "Reinstalação do sistema"].map((t) => (
                <span key={t} className="bg-destructive/20 text-destructive px-2 py-1 rounded-md">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Perguntas Frequentes
        </h3>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group bg-card border rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer font-semibold text-sm text-foreground hover:bg-muted transition-colors list-none">
                <span>{item.q}</span>
                <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
              </summary>
              <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed border-t">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="bg-card border rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
        <Phone className="w-8 h-8 text-primary flex-shrink-0" />
        <div className="flex-1 text-center sm:text-left">
          <h4 className="font-black text-foreground">Precisa de ajuda ou quer fazer upgrade?</h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            Entre em contato com o administrador do sistema para contratar um plano, solicitar upgrade,
            pagar taxa de reinstalação ou tirar dúvidas.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <a
              href="tel:+556299609-9697"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary/10 text-primary px-4 py-2 text-sm font-bold hover:bg-primary/20 transition-colors"
            >
              <Phone className="w-4 h-4" />
              AILTON AIRES — (62) 99609-9697
            </a>
            <a
              href="https://wa.me/5562996099697"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600/10 text-green-700 dark:text-green-400 px-4 py-2 text-sm font-bold hover:bg-green-600/20 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp — (62) 99609-9697
            </a>
            <a
              href="mailto:ailtonsaib@gmail.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-400 px-4 py-2 text-sm font-bold hover:bg-blue-600/20 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              ailtonsaib@gmail.com
            </a>
          </div>
        </div>
      </section>
      {/* Copyright */}
      <section className="border-t pt-6 text-center space-y-1">
        <p className="text-sm font-bold text-foreground">© {new Date().getFullYear()} AILTON AIRES</p>
        <p className="text-xs text-muted-foreground">
          Todos os direitos reservados. Este sistema é de propriedade exclusiva de Ailton Aires.
          É proibida a reprodução, distribuição ou uso não autorizado deste software.
        </p>
      </section>
    </div>
  );
}
