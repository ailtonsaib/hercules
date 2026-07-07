import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📋 QUERY: Listar todos os cambistas ativos
 */
export const list = query({
  args: {},
  handler: async (ctx: any) => {
    return await ctx.db
      .query("vendors" as any)
      .order("desc")
      .collect();
  },
});

/**
 * 💼 MUTATION: Incluir ou Alterar dados de um cambista (Upsert)
 */
export const upsertVendor = mutation({
  args: v.any(),
  handler: async (ctx: any, args: any) => {
    // Se receber um ID, realiza a alteração direta do registro existente
    if (args.vendorId) {
      await ctx.db.patch(args.vendorId as any, {
        name: args.name.trim(),
        document: args.document ? args.document.trim() : "",
        commissionRate: Number(args.commissionRate) || 0,
        phone: args.phone ? args.phone.trim() : "",
        updatedAt: Date.now(),
      });
      return args.vendorId;
    }

    // Caso contrário, inclui um novo cambista no banco
    const vendorId = await ctx.db.insert("vendors" as any, {
      name: args.name.trim(),
      document: args.document ? args.document.trim() : "",
      commissionRate: Number(args.commissionRate) || 0,
      phone: args.phone ? args.phone.trim() : "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return vendorId;
  },
});

/**
 * 🗑️ MUTATION: Excluir um cambista do sistema
 */
export const deleteVendor = mutation({
  args: { vendorId: v.id("vendors" as any) },
  handler: async (ctx: any, args: any) => {
    const existing = await ctx.db.get(args.vendorId);
    if (!existing) {
      throw new ConvexError("Vendedor não localizado no servidor.");
    }
    await ctx.db.delete(args.vendorId);
    return { success: true };
  },
});
