import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📊 QUERY: Buscar histórico de e-mails de um usuário específico
 */
export const getMyEmails = query({
  args: { userId: v.string() },
  handler: async (ctx: any, args) => {
    return await ctx.db
      .query("emails" as any)
      .filter((q: any) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});

/**
 * 📥 MUTATION: Inserir ou atualizar um log de e-mail enviado
 */
export const insertEmailLog = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    type: v.string(), // "welcome", "prize", "purchase"
  },
  handler: async (ctx: any, args) => {
    const emailId = await ctx.db.insert("emails" as any, {
      userId: args.userId,
      email: args.email.toLowerCase().trim(),
      type: args.type,
      status: "sent",
      createdAt: Date.now(),
    });

    return emailId;
  },
});
