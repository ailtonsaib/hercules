import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📊 QUERY: Listar todas as premiações declaradas
 * Exibe o histórico de cartelas contempladas e o status de entrega do prêmio.
 */
export const list = query({
  args: {},
  handler: async (ctx: any) => {
    return await ctx.db
      .query("prizeAwards" as any)
      .order("desc")
      .collect();
  },
});

/**
 * 🏆 MUTATION: Conceder Prêmio / Declarar Ganhador
 * Registra o felizardo que completou a cartela (Bingo, Linha ou Giro da Sorte)
 */
export const awardPrize = mutation({
  args: {
    eventId: v.string(),       // ID do sorteio em andamento
    userId: v.string(),        // ID do jogador vencedor
    cardId: v.optional(v.string()), // ID da cartela premiada (se aplicável)
    prizeDescription: v.string(),   // O que ele ganhou (Ex: Moto 0KM, R$ 500 no PIX)
  },
  handler: async (ctx: any, args) => {
    // Insere o registro mestre de premiação de forma dinâmica na nuvem
    const awardId = await ctx.db.insert("prizeAwards" as any, {
      eventId: args.eventId,
      userId: args.userId,
      cardId: args.cardId || "GIRO-IMEDIATO",
      prizeDescription: args.prizeDescription,
      status: "pending", // Status padrão inicia como "pendente" para o administrador auditar
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return awardId;
  },
});

/**
 * 📦 MUTATION: Atualizar o Status de Entrega do Prêmio
 * Permite que o administrador altere o status para "pago" ou "entregue"
 */
export const updateStatus = mutation({
  args: {
    awardId: v.id("prizeAwards" as any),
    status: v.string(), // "pending", "paid", "delivered", "canceled"
  },
  handler: async (ctx: any, args) => {
    const existing = await ctx.db.get(args.awardId);
    if (!existing) {
      throw new ConvexError("Registro de premiação não localizado no servidor.");
    }

    await ctx.db.patch(args.awardId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
