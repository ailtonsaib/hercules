import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📋 QUERY: Listar todas as rifas/cotas vinculadas a um sorteio
 */
export const getRifasByEvent = query({
  args: { eventId: v.string() },
  handler: async (ctx: any, args) => {
    return await ctx.db
      .query("rifas" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .collect();
  },
});

/**
 * 🎟️ QUERY: Listar as rifas adquiridas por um usuário específico
 */
export const getMyRifas = query({
  args: { userId: v.string() },
  handler: async (ctx: any, args) => {
    return await ctx.db
      .query("rifas" as any)
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * 🛒 MUTATION: Reservar / Adquirir uma Cota de Rifa
 */
export const buyRifaCota = mutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
    number: v.string(), // O número escolhido (Ex: "07", "42")
  },
  handler: async (ctx: any, args) => {
    // Verifica se o número já não foi comprado ou reservado por outra pessoa neste evento
    const existing = await ctx.db
      .query("rifas" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .filter((q: any) => q.eq(q.field("number"), args.number))
      .first();

    if (existing) {
      throw new ConvexError("Esta cota numérica já foi reservada ou adquirida.");
    }

    const rifaId = await ctx.db.insert("rifas" as any, {
      eventId: args.eventId,
      userId: args.userId,
      number: args.number,
      status: "paid", // Define como pago/ativo por padrão no fluxo local
      createdAt: Date.now(),
    });

    return rifaId;
  },
});

/**
 * ❌ MUTATION: Cancelar / Remover Reserva de Rifa (Corrigido Linhas 112 e 114)
 */
export const cancelRifaCota = mutation({
  args: {
    rifaId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx: any, args) => {
    // 1. Busca a rifa pelo ID usando coerção de tipo flexível
    const rifa = await ctx.db.get(args.rifaId as any);

    // 2. Linha 112 Corrigida: Verifica a posse usando as any para evitar erro de tipo misto
    if (!rifa || (rifa as any).userId !== args.userId) {
      throw new ConvexError("Ação não autorizada ou bilhete não localizado.");
    }

    // 3. Linha 114 Corrigida: Deleta o registro enviando o ID convertido de forma segura
    await ctx.db.delete(args.rifaId as any);

    return { success: true };
  },
});
