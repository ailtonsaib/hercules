import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📋 QUERY: Buscar usuário por e-mail de forma flexível
 */
export const getByUserEmail = query({
  args: { email: v.string() },
  handler: async (ctx: any, args) => {
    const emailClean = args.email.toLowerCase().trim();
    
    // Busca flexível varrendo a tabela sem travar em índices estritos de terceiros
    const users = await ctx.db.query("users" as any).collect();
    return users.find((u: any) => u.username === emailClean || u.email === emailClean) || null;
  },
});

/**
 * 🔗 MUTATION: Vincular e-mail de identidade digital ao usuário local
 */
export const linkEmailIdentity = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
  },
  handler: async (ctx: any, args) => {
    const user = await ctx.db.get(args.userId as any);
    if (!user) {
      throw new ConvexError("Usuário master não localizado para vinculação.");
    }

    await ctx.db.patch(args.userId as any, {
      email: args.email.toLowerCase().trim(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
