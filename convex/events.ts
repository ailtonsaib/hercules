import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

const eventFields = {
  name: v.string(),
  description: v.optional(v.string()),
  date: v.string(),
  time: v.optional(v.string()),
  location: v.optional(v.string()),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  phone: v.optional(v.string()),
  totalCards: v.number(),
  cardPrice: v.optional(v.number()),
  prizes: v.optional(v.array(v.object({ position: v.number(), description: v.string() }))),
  chanceTipo: v.optional(v.union(v.literal("unica"), v.literal("dupla"), v.literal("tripla"))),
};

// Helper: get current user or throw
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

    // Admin sees all events
    if (user.isAdmin) {
      return await ctx.db.query("events").order("desc").collect();
    }

    // Regular user sees only their events
    return await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

export const create = mutation({
  args: eventFields,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.totalCards < 1 || args.totalCards > 8000) {
      throw new ConvexError({ message: "Total de cartelas deve ser entre 1 e 8000", code: "BAD_REQUEST" });
    }
    return await ctx.db.insert("events", {
      ...args,
      status: "open",
      userId: user._id,
      createdBy: user.email ?? user.name,
    });
  },
});

export const update = mutation({
  args: { eventId: v.id("events"), ...eventFields },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const { eventId, ...rest } = args;
    const event = await ctx.db.get(eventId);
    if (!event) throw new ConvexError({ message: "Evento não encontrado", code: "NOT_FOUND" });
    if (!user.isAdmin && event.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });
    }
    await ctx.db.patch(eventId, rest);
  },
});

export const updateStatus = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("finished")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError({ message: "Evento não encontrado", code: "NOT_FOUND" });
    if (!user.isAdmin && event.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });
    }
    await ctx.db.patch(args.eventId, { status: args.status });
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError({ message: "Evento não encontrado", code: "NOT_FOUND" });
    if (!user.isAdmin && event.userId !== user._id) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });
    }

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const card of cards) await ctx.db.delete(card._id);

    const draws = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const draw of draws) await ctx.db.delete(draw._id);

    await ctx.db.delete(args.eventId);
  },
});

// Check how many cards the current user has generated across all their events
export const getMyCardUsage = query({
  args: {},
  handler: async (ctx): Promise<{ used: number; limit: number; plan: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { used: 0, limit: 70, plan: "free" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { used: 0, limit: 70, plan: "free" };

    const limit = user.cardLimit ?? 70;
    const plan = user.plan ?? "free";

    // Admin has no practical limit
    if (user.isAdmin) return { used: 0, limit: 8000, plan: "max" };

    // Count cards across all user events
    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let used = 0;
    for (const event of events) {
      // Use the totalCards field as the authoritative count (matches what was generated)
      used += event.totalCards;
    }

    return { used, limit, plan };
  },
});

// Validate that user can generate N more cards (called before generation)
export const canGenerateCards = query({
  args: { count: v.number() },
  handler: async (ctx, args): Promise<{ allowed: boolean; used: number; limit: number; plan: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { allowed: false, used: 0, limit: 70, plan: "free" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return { allowed: false, used: 0, limit: 70, plan: "free" };

    if (user.isAdmin) return { allowed: true, used: 0, limit: 8000, plan: "max" };

    const limit = user.cardLimit ?? 70;
    const plan = user.plan ?? "free";

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user._id as Id<"users">))
      .collect();

    const used = events.reduce((sum, e) => sum + e.totalCards, 0);
    return { allowed: used + args.count <= limit, used, limit, plan };
  },
});
