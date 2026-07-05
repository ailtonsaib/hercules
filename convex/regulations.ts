import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const getByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Não autenticado", code: "UNAUTHENTICATED" });
    return await ctx.db
      .query("regulations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Não autenticado", code: "UNAUTHENTICATED" });

    const existing = await ctx.db
      .query("regulations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();

    const now = new Date().toISOString();
    if (existing) {
      await ctx.db.patch(existing._id, { title: args.title, content: args.content, updatedAt: now });
    } else {
      await ctx.db.insert("regulations", {
        eventId: args.eventId,
        title: args.title,
        content: args.content,
        updatedAt: now,
      });
    }
  },
});
