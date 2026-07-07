import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📋 QUERY: Buscar o regulamento ativo de um sorteio específico
 */
export const getByEvent = query({
  args: { eventId: v.string() },
  handler: async (ctx: any, args) => {
    return await ctx.db
      .query("regulations" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .first();
  },
});

/**
 * 📝 MUTATION: Criar ou Atualizar o Regulamento Oficial da Rodada
 */
export const upsertRegulation = mutation({
  args: {
    eventId: v.string(),
    content: v.string(), // Texto contendo os termos e regras de premiação
  },
  handler: async (ctx: any, args) => {
    const existing = await ctx.db
      .query("regulations" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const regulationId = await ctx.db.insert("regulations" as any, {
      eventId: args.eventId,
      content: args.content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return regulationId;
  },
});
