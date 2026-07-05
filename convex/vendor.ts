import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate upload URL for payment proof
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save payment proof storage ID to a card
export const savePaymentProof = mutation({
  args: {
    cardId: v.id("cards"),
    storageId: v.id("_storage"),
    buyerName: v.string(),
    buyerPhone: v.optional(v.string()),
    buyerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cardId, {
      buyerName: args.buyerName,
      buyerPhone: args.buyerPhone,
      buyerEmail: args.buyerEmail,
      paid: true,
      paymentProofStorageId: args.storageId,
    });
  },
});

// Get cards by list of card numbers for a given event (for vendor batch)
export const getByNumbers = query({
  args: { eventId: v.id("events"), cardNumbers: v.array(v.number()) },
  handler: async (ctx, args) => {
    if (args.cardNumbers.length === 0) return [];
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const set = new Set(args.cardNumbers);
    return cards.filter((c) => set.has(c.cardNumber));
  },
});

// Get payment proof URL for a card
export const getPaymentProofUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
