import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * 📋 QUERY: Listar todo o histórico de e-mails/notificações de uma rodada
 */
export const getEmailsByEvent = query({
  args: { eventId: v.string() },
  handler: async (ctx: any, args) => {
    // Retorna uma busca flexível na tabela de e-mails usando tipagem dinâmica
    return await ctx.db
      .query("emails" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .collect();
  },
});

/**
 * ✉️ MUTATION: Registrar envio de notificação digital no banco local
 */
export const logSentEmail = mutation({
  args: {
    userId: v.string(),
    eventId: v.optional(v.string()),
    subject: v.string(), // Assunto da mensagem (Ex: "Sua cartela foi emitida!")
  },
  handler: async (ctx: any, args) => {
    // Insere o registro de auditoria do e-mail de forma dinâmica na nuvem
    const emailId = await ctx.db.insert("emails" as any, {
      userId: args.userId,
      eventId: args.eventId ?? "NOTIFICACAO-GERAL",
      subject: args.subject,
      status: "delivered", // Define como entregue por padrão
      sentAt: Date.now(),
    });

    return emailId;
  },
});
