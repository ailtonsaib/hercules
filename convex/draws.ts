import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📊 QUERY: Monitorar o estado atual do sorteio de um evento
 * Retorna a lista de números que já saíram do globo para o telão exibir
 */
export const getDrawState = query({
  args: { eventId: v.string() },
  handler: async (ctx: any, args) => {
    const draw = await ctx.db
      .query("draws" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .first();

    if (!draw) {
      return { numbers: [], lastNumber: null, isFinished: false };
    }

    return draw;
  },
});

/**
 * 🎰 MUTATION: Registrar o sorteio de uma nova bola no Globo
 * Persiste a dezena cantada no banco de dados para sincronizar com todos os jogadores
 */
export const drawNumber = mutation({
  args: {
    eventId: v.string(),
    number: v.number(),
  },
  handler: async (ctx: any, args) => {
    // 1. Busca se já existe um sorteio em andamento para este evento
    const existingDraw = await ctx.db
      .query("draws" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .first();

    if (existingDraw) {
      // Evita duplicar o mesmo número no histórico do jogo
      if (existingDraw.numbers.includes(args.number)) {
        return existingDraw._id;
      }

      const updatedNumbers = [...existingDraw.numbers, args.number];

      await ctx.db.patch(existingDraw._id, {
        numbers: updatedNumbers,
        lastNumber: args.number,
        updatedAt: Date.now(),
      });

      return existingDraw._id;
    } else {
      // Se for a primeira bola da rodada, insere um novo registro de sorteio
      const newDrawId = await ctx.db.insert("draws" as any, {
        eventId: args.eventId,
        numbers: [args.number],
        lastNumber: args.number,
        isFinished: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return newDrawId;
    }
  },
});

/**
 * 🔄 MUTATION: Reiniciar o Globo / Limpar Sorteio
 */
export const resetDraw = mutation({
  args: { eventId: v.string() },
  handler: async (ctx: any, args) => {
    const draw = await ctx.db
      .query("draws" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .first();

    if (draw) {
      await ctx.db.delete(draw._id);
    }

    return { success: true };
  },
});
