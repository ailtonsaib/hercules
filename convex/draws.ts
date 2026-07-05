import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
  },
});

export const init = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("draws", {
      eventId: args.eventId,
      drawnNumbers: [],
      lastDrawn: undefined,
    });
  },
});

export const drawNumber = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const draw = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (!draw) throw new ConvexError({ message: "Sorteio não iniciado", code: "NOT_FOUND" });

    const allNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
    const remaining = allNumbers.filter((n) => !draw.drawnNumbers.includes(n));

    if (remaining.length === 0) {
      throw new ConvexError({ message: "Todos os números já foram sorteados", code: "CONFLICT" });
    }

    const randomIdx = Math.floor(Math.random() * remaining.length);
    const picked = remaining[randomIdx];
    const newDrawn = [...draw.drawnNumbers, picked];

    await ctx.db.patch(draw._id, {
      drawnNumbers: newDrawn,
      lastDrawn: picked,
    });

    return picked;
  },
});

export const undoLast = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const draw = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();

    if (!draw || draw.drawnNumbers.length === 0) {
      throw new ConvexError({ message: "Nenhum número para desfazer", code: "BAD_REQUEST" });
    }

    const newDrawn = draw.drawnNumbers.slice(0, -1);
    await ctx.db.patch(draw._id, {
      drawnNumbers: newDrawn,
      lastDrawn: newDrawn.length > 0 ? newDrawn[newDrawn.length - 1] : undefined,
    });

    return draw.drawnNumbers[draw.drawnNumbers.length - 1];
  },
});

export const drawSpecific = mutation({
  args: { eventId: v.id("events"), number: v.number() },
  handler: async (ctx, args) => {
    if (args.number < 1 || args.number > 75) {
      throw new ConvexError({ message: "Número inválido. Digite entre 1 e 75.", code: "BAD_REQUEST" });
    }
    const draw = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (!draw) throw new ConvexError({ message: "Sorteio não iniciado", code: "NOT_FOUND" });
    if (draw.drawnNumbers.includes(args.number)) {
      throw new ConvexError({ message: `Número ${args.number} já foi sorteado`, code: "CONFLICT" });
    }
    const newDrawn = [...draw.drawnNumbers, args.number];
    await ctx.db.patch(draw._id, { drawnNumbers: newDrawn, lastDrawn: args.number });
    return args.number;
  },
});

export const toggleSalesBlock = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const draw = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (!draw) throw new ConvexError({ message: "Sorteio não iniciado", code: "NOT_FOUND" });
    await ctx.db.patch(draw._id, { salesBlocked: !draw.salesBlocked });
    return !draw.salesBlocked;
  },
});

export const reset = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const draws = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const draw of draws) {
      await ctx.db.patch(draw._id, { drawnNumbers: [], lastDrawn: undefined });
    }
  },
});
