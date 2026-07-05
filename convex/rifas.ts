import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Não autenticado", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "Usuário não encontrado", code: "NOT_FOUND" });
  return user;
}

export const list = query({
  args: {},
  handler: async (ctx): Promise<typeof rifas> => {
    const user = await requireUser(ctx);
    const rifas = await ctx.db
      .query("rifas")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return rifas;
  },
});

export const getById = query({
  args: { id: v.id("rifas") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const rifa = await ctx.db.get(args.id);
    if (!rifa || rifa.userId !== user._id) return null;
    return rifa;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    totalNumbers: v.number(),
    ticketPrice: v.optional(v.number()),
    prizes: v.optional(v.array(v.object({ position: v.number(), description: v.string() }))),
    planRequired: v.optional(v.union(v.literal("free"), v.literal("basic"), v.literal("pro"), v.literal("max"))),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db.insert("rifas", {
      ...args,
      userId: user._id,
      status: "active",
      createdAt: new Date().toISOString(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("rifas"),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    totalNumbers: v.number(),
    ticketPrice: v.optional(v.number()),
    prizes: v.optional(v.array(v.object({ position: v.number(), description: v.string() }))),
    planRequired: v.optional(v.union(v.literal("free"), v.literal("basic"), v.literal("pro"), v.literal("max"))),
    status: v.union(v.literal("active"), v.literal("finished")),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const { id, ...rest } = args;
    const rifa = await ctx.db.get(id);
    if (!rifa || rifa.userId !== user._id)
      throw new ConvexError({ message: "Rifa não encontrada", code: "NOT_FOUND" });
    await ctx.db.patch(id, rest);
  },
});

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const remove = mutation({
  args: { id: v.id("rifas") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const rifa = await ctx.db.get(args.id);
    if (!rifa || rifa.userId !== user._id)
      throw new ConvexError({ message: "Rifa não encontrada", code: "NOT_FOUND" });
    await ctx.db.delete(args.id);
  },
});
