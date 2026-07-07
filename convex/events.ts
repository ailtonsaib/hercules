import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📋 QUERY: Listar projetos/eventos (Admin vê tudo, usuário comum vê apenas os seus)
 */
export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx: any, args: any) => {
    if (!args.token) return [];

    const session = await ctx.db
      .query("sessions")
      .filter((q: any) => q.eq(q.field("token"), args.token))
      .first();

    if (!session || (session as any).expiresAt < Date.now()) {
      throw new ConvexError("Sessão inválida ou expirada. Faça login novamente.");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) throw new ConvexError("Usuário não localizado no sistema.");

    // 👑 NOVA REGRA ADMIN: Acesso total irrestrito a todos os projetos
    if (user.role === "admin") {
      return await ctx.db.query("events").order("desc").collect();
    }

    // 👤 Usuário comum: Vê apenas os eventos criados por si mesmo
    return await ctx.db
      .query("events")
      .filter((q: any) => q.eq(q.field("creatorId"), user._id))
      .order("desc")
      .collect();
  },
});

/**
 * 🚀 MUTATION PUBLICADA: Criar e Salvar o Novo Evento
 */
export const create = mutation({
  args: v.any(),
  handler: async (ctx: any, args: any) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q: any) => q.eq(q.field("token"), args.token))
      .first();

    if (!session || (session as any).expiresAt < Date.now()) {
      throw new ConvexError("Sessão administrativa inválida ou expirada.");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Operação negada. Apenas administradores criam eventos.");
    }

    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description ?? "",
      localName: args.localName ?? "",
      address: args.address ?? "",
      city: args.city ?? "",
      phone: args.phone ?? "",
      eventDate: args.eventDate ?? "",
      eventTime: args.eventTime ?? "",
      totalCards: Number(args.totalCards ?? 100),
      chanceType: args.chanceType ?? "dupla",
      cardValue: Number(args.cardValue ?? 0),
      prizes: args.prizes ?? [],
      creatorId: user._id,
      createdAt: Date.now(),
    });
  },
});
/**
 * 🗑️ MUTATION: Deletar um Evento Existente (Apenas Admin)
 */
export const remove = mutation({
  args: { 
    token: v.string(),
    eventId: v.id("events") 
  },
  handler: async (ctx, args) => {
    // Valida a sessão do administrador
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Sessão administrativa inválida ou expirada.");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Operação negada. Apenas administradores podem excluir eventos.");
    }

    // Remove o evento do banco de dados
    await ctx.db.delete(args.eventId);
    return { success: true };
  },
});

/**
 * 📝 MUTATION: Atualizar Dados de um Evento Existente (Apenas Admin)
 */
export const update = mutation({
  args: v.any(), // Aceita os novos campos estruturados dinamicamente
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Sessão administrativa inválida ou expirada.");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Operação negada. Apenas administradores podem alterar eventos.");
    }

    const { eventId, token, ...updateFields } = args;

    // Atualiza apenas os campos enviados no payload
    await ctx.db.patch(eventId, {
      ...updateFields,
      totalCards: Number(updateFields.totalCards),
      cardValue: Number(updateFields.cardValue)
    });

    return { success: true };
  },
});
