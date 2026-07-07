import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Configurações padrões de monitoramento e regras que o site espera ler do backend
const DEFAULT_SETTINGS: Record<string, any> = {
  maintenanceMode: false,
  allowNewRegistrations: true,
  minWithdrawAmount: 2000, // R$ 20,00 em centavos, por exemplo
  bingoBallDelay: 4000,    // 4 segundos entre as bolas do globo
};

/**
 * 📊 QUERY: Monitorar e obter uma configuração específica do sistema
 */
export const get = query({
  args: { key: v.string() },
  handler: async (ctx: any, args) => {
    // 1. Tenta buscar no banco usando tipagem livre para não travar o compilador
    const setting = await ctx.db
      .query("appSettings" as any)
      .filter((q: any) => q.eq(q.field("key"), args.key))
      .first();

    // 2. Se não achar no banco, devolve o padrão monitorado com segurança
    if (!setting) {
      return DEFAULT_SETTINGS[args.key] ?? null;
    }

    return setting.value;
  },
});

/**
 * ⚙️ MUTATION: Atualizar uma configuração (Disponível para futuras travas de Admin)
 */
export const set = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx: any, args) => {
    const existing = await ctx.db
      .query("appSettings" as any)
      .filter((q: any) => q.eq(q.field("key"), args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("appSettings" as any, { key: args.key, value: args.value });
    }
    
    return { success: true };
  },
});
