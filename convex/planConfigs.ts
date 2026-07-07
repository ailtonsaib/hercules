import { v } from "convex/values";
import { query } from "./_generated/server";

// Valores padrões de monitoramento que o seu site original espera ler
const DEFAULTS = [
  { key: "free" as const,       label: "FREE",       price: "Gratuito",     cardLimit: 5 },
  { key: "basic" as const,      label: "BASIC",      price: "R$ 400,00",    cardLimit: 15 },
  { key: "pro" as const,        label: "PRO",        price: "R$ 600,00",    cardLimit: 30 },
  { key: "max" as const,        label: "MAX",        price: "R$ 1.000,00",  cardLimit: 80 },
  { key: "ultra" as const,      label: "ULTRA",      price: "R$ 1.500,00",  cardLimit: 150 },
  { key: "enterprise" as const, label: "ENTERPRISE", price: "R$ 2.000,00",  cardLimit: 500 },
  { key: "mega" as const,       label: "MEGA",       price: "R$ 5.000,00",  cardLimit: 5000 }
];

/**
 * 📊 QUERY DE MONITORAMENTO
 * Lê o token de sessão local do usuário e devolve o nível de acesso e limites permitidos.
 */
export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx: any, args) => {
    // Se o usuário não passou token, devolve a lista de planos padrão do site
    if (!args.token) {
      return DEFAULTS;
    }

    // 1. Monitora se existe uma sessão ativa para o token informado
    const session = await ctx.db
      .query("sessions" as any)
      .filter((q: any) => q.eq(q.field("token"), args.token))
      .first();

    if (!session) {
      return DEFAULTS;
    }

    // 2. Busca o usuário dono da sessão para verificar o nível (role) dele
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return DEFAULTS;
    }

    // 3. Regra do Administrador Supremo: Se for admin, devolve o plano MEGA (libera tudo)
    if (user.role === "admin") {
      return DEFAULTS.filter(p => p.key === "mega");
    }

    // Para usuários comuns, devolve o plano FREE inicial por padrão
    return DEFAULTS.filter(p => p.key === "free");
  },
});
