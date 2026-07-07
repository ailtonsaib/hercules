import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * 📋 QUERY: Listar todas as notificações de um usuário específico
 * Mantém a leitura limpa e síncrona na nuvem para o painel do jogador
 */
export const getMyNotifications = query({
  args: { userId: v.string() },
  handler: async (ctx: any, args) => {
    return await ctx.db
      .query("notifications" as any)
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * 🔔 MUTATION: Disparar um alerta / Notificação interna no painel
 * Registra avisos como "Sua cartela foi premiada!" ou "Nova rodada aberta!"
 */
export const createNotification = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx: any, args) => {
    const notificationId = await ctx.db.insert("notifications" as any, {
      userId: args.userId,
      title: args.title,
      message: args.message,
      read: false, // Inicia como não lida por padrão
      createdAt: Date.now(),
    });

    return notificationId;
  },
});

/**
 * 👁️ MUTATION: Marcar notificação como lida
 */
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications" as any) },
  handler: async (ctx: any, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
    return { success: true };
  },
});
