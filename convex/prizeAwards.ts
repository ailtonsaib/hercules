import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("prizeAwards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
  },
});

export const award = mutation({
  args: {
    eventId: v.id("events"),
    prizePosition: v.number(),
    prizeDescription: v.string(),
    winnerCardNumber: v.number(),
    winnerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Prevent duplicate award for same prize position
    const existing = await ctx.db
      .query("prizeAwards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    if (existing.find((a) => a.prizePosition === args.prizePosition)) {
      throw new ConvexError({ message: "Este prêmio já foi concedido", code: "CONFLICT" });
    }
    await ctx.db.insert("prizeAwards", {
      ...args,
      awardedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { awardId: v.id("prizeAwards") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.awardId);
  },
});

export const removeByPosition = mutation({
  args: { eventId: v.id("events"), prizePosition: v.number() },
  handler: async (ctx, args) => {
    const awards = await ctx.db
      .query("prizeAwards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const target = awards.find((a) => a.prizePosition === args.prizePosition);
    if (target) await ctx.db.delete(target._id);
  },
});

// Award prize to multiple winners (tie-share). Bypasses duplicate-position guard.
export const awardTie = mutation({
  args: {
    eventId: v.id("events"),
    prizePosition: v.number(),
    prizeDescription: v.string(),
    winners: v.array(v.object({
      winnerCardNumber: v.number(),
      winnerName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Remove any existing award for this position first
    const existing = await ctx.db
      .query("prizeAwards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const a of existing.filter((a) => a.prizePosition === args.prizePosition)) {
      await ctx.db.delete(a._id);
    }
    for (const w of args.winners) {
      await ctx.db.insert("prizeAwards", {
        eventId: args.eventId,
        prizePosition: args.prizePosition,
        prizeDescription: args.prizeDescription,
        winnerCardNumber: w.winnerCardNumber,
        winnerName: w.winnerName,
        awardedAt: new Date().toISOString(),
      });
    }
  },
});

export const removeAllByEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const awards = await ctx.db
      .query("prizeAwards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const a of awards) await ctx.db.delete(a._id);
  },
});
