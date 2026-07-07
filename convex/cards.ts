import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 🎫 QUERY: Listar todas as cartelas de um evento (Ordem Crescente)
 */
export const list = query({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const allCards = await ctx.db.query("cards" as any).collect();
    
    return allCards
      .filter((c: any) => c.eventId === args.eventId)
      .sort((a: any, b: any) => {
        return (a.serialNumber || "").localeCompare(b.serialNumber || "", undefined, { numeric: true });
      });
  },
});

/**
 * 🎰 MUTATION: Fabricar Cartelas em Lote/Massa para o Estoque Mestre
 */
export const generateCardsForEvent = mutation({
  args: {
    token: v.string(),
    eventId: v.string(),
    startNumber: v.number(),
    endNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions" as any)
      .filter((q: any) => q.eq(q.field("token"), args.token))
      .first();

    if (!session || (session as any).expiresAt < Date.now()) {
      throw new ConvexError("Sessão administrativa inválida ou expirada.");
    }

    const cardsCriados = [];

    for (let i = args.startNumber; i <= args.endNumber; i++) {
      const dezenasCalculadas = Array.from({ length: 20 }, (_, idx) => {
        const num = ((idx * 3) + i) % 75;
        return num === 0 ? 75 : num;
      });

      const cardId = await ctx.db.insert("cards" as any, {
        eventId: args.eventId,
        serialNumber: `CRT-${String(i).padStart(6, "0")}`,
        numbers: dezenasCalculadas,
        isSold: false,
        isValidated: false,
        createdAt: Date.now(),
      });

      cardsCriados.push(cardId);
    }

    await ctx.db.insert("batches" as any, {
      eventId: args.eventId,
      startNumber: args.startNumber,
      endNumber: args.endNumber,
      vendorName: "Estoque Central",
      createdAt: Date.now(),
    });

    return { success: true, total: cardsCriados.length };
  },
});

/**
 * 🔒 MUTATION: Auditar e Validar as Cartelas Vendidas em Bloco (Mesa Administrativa)
 */
export const validateCardsInBulk = mutation({
  args: {
    token: v.string(),
    cardIds: v.array(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const session: any = await ctx.db
      .query("sessions" as any)
      .filter((q: any) => q.eq(q.field("token"), args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Sessão administrativa expirada ou inválida.");
    }

    const user: any = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Acesso negado. Apenas o administrador mestre valida cartelas.");
    }

    for (const id of args.cardIds) {
      const card: any = await ctx.db.get(id as any);
      if (!card) continue;

      if (!card.isSold) {
        throw new ConvexError(`A cartela ${card.serialNumber} não foi vendida e não pode ir ao globo.`);
      }

      await ctx.db.patch(card._id, {
        isValidated: true,
        validatedAt: Date.now()
      });
    }

    return { success: true, count: args.cardIds.length };
  },
});

/**
 * 🔮 QUERY EXCLUSIVA: Filtrar Apenas Cartelas Validadas Prontas para Entrar no Globo de Sorteio
 */
export const getValidatedCardsForDraw = query({
  args: { eventId: v.string() },
  handler: async (ctx: any, args: any) => {
    const allCards = await ctx.db.query("cards" as any).collect();
    
    return allCards.filter(
      (c: any) => c.eventId === args.eventId && c.isValidated === true
    );
  },
});
