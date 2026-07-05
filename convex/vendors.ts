import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api.js";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
  return user;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    if (user.isAdmin) {
      return await ctx.db.query("vendors").withIndex("by_name").order("asc").collect();
    }

    return await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: { name: v.string(), phone: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args): Promise<string> => {
    const user = await requireUser(ctx);
    if (!args.name.trim()) throw new ConvexError({ message: "Nome é obrigatório", code: "BAD_REQUEST" });
    const vendorId = await ctx.db.insert("vendors", {
      name: args.name.trim(),
      phone: args.phone,
      notes: args.notes,
      userId: user._id,
    });
    await ctx.scheduler.runAfter(0, internal.notifications.create, {
      userId: user._id,
      title: "Vendedor adicionado",
      message: `${args.name.trim()} foi adicionado à sua lista de vendedores`,
      type: "info",
      link: "/vendedores",
    });
    return vendorId;
  },
});

export const update = mutation({
  args: { vendorId: v.id("vendors"), name: v.string(), phone: v.optional(v.string()), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new ConvexError({ message: "Vendedor não encontrado", code: "NOT_FOUND" });
    if (!user.isAdmin && vendor.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });
    }
    if (!args.name.trim()) throw new ConvexError({ message: "Nome é obrigatório", code: "BAD_REQUEST" });
    await ctx.db.patch(args.vendorId, { name: args.name.trim(), phone: args.phone, notes: args.notes });
  },
});

export const remove = mutation({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new ConvexError({ message: "Vendedor não encontrado", code: "NOT_FOUND" });
    if (!user.isAdmin && vendor.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });
    }
    await ctx.db.delete(args.vendorId);
  },
});

// Ranking: for a given event, compute how many cards each vendor sold (paid)
export const rankingByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const batches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const cardMap = new Map(cards.map((c) => [c.cardNumber, c]));

    type BatchStats = {
      vendorId: string | null;
      vendorName: string;
      phone?: string;
      batchCode: string;
      totalCards: number;
      sold: number;
      paid: number;
      validated: number;
      unsold: number;
    };

    const rows: BatchStats[] = [];

    for (const batch of batches) {
      let vendorName = batch.vendorName ?? "Sem nome";
      let phone: string | undefined;
      if (batch.vendorId) {
        const vendor = await ctx.db.get(batch.vendorId);
        if (vendor) { vendorName = vendor.name; phone = vendor.phone; }
      }

      let sold = 0, paid = 0, validated = 0;
      for (const num of batch.cardNumbers) {
        const card = cardMap.get(num);
        if (!card) continue;
        if (card.buyerName) sold++;
        if (card.paid) paid++;
        if (card.validated) validated++;
      }

      rows.push({
        vendorId: batch.vendorId ?? null,
        vendorName,
        phone,
        batchCode: batch.accessCode,
        totalCards: batch.cardNumbers.length,
        sold,
        paid,
        validated,
        unsold: batch.cardNumbers.length - sold,
      });
    }

    rows.sort((a, b) => b.paid - a.paid);
    return rows;
  },
});

// Get all batches for a specific vendor (used in vendor dashboard)
export const getVendorBatches = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });
    return await ctx.db
      .query("vendorBatches")
      .collect()
      .then((all) => all.filter((b) => b.vendorId === args.vendorId));
  },
});

export const distributionByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const batches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const cardMap = new Map(cards.map((c) => [c.cardNumber, c]));

    const rows = await Promise.all(batches.map(async (batch) => {
      let vendorName = batch.vendorName ?? "Sem nome";
      let phone: string | undefined;
      if (batch.vendorId) {
        const vendor = await ctx.db.get(batch.vendorId);
        if (vendor) { vendorName = vendor.name; phone = vendor.phone; }
      }
      const nums = [...batch.cardNumbers].sort((a, b) => a - b);
      const sold = nums.filter((n) => cardMap.get(n)?.buyerName).length;
      const paid = nums.filter((n) => cardMap.get(n)?.paid).length;
      return {
        batchCode: batch.accessCode,
        vendorName,
        phone,
        cardNumbers: nums,
        minCard: nums[0] ?? 0,
        maxCard: nums[nums.length - 1] ?? 0,
        total: nums.length,
        sold,
        paid,
        unsold: nums.length - sold,
      };
    }));

    rows.sort((a, b) => a.minCard - b.minCard);
    return rows;
  },
});
