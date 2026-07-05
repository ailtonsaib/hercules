// V8 runtime — internal queries for email actions
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query: get all cards for an event that have buyerEmail
export const getCardsWithEmail = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    return cards.filter((c) => !!c.buyerEmail);
  },
});

// Internal query: get event name
export const getEventName = internalQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    return event?.name ?? "Evento";
  },
});
