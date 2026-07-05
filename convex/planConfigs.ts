import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Default values seeded if DB has no config yet
const DEFAULTS = [
  { key: "free" as const,       label: "FREE",       price: "Gratuito",      cardLimit: 70,    description: "Para conhecer o sistema" },
  { key: "basic" as const,      label: "BASIC",      price: "R$ 400,00",     cardLimit: 2000,  description: "Para pequenos eventos" },
  { key: "pro" as const,        label: "PRO",        price: "R$ 600,00",     cardLimit: 4000,  description: "Para eventos frequentes" },
  { key: "max" as const,        label: "MAX",        price: "R$ 1.000,00",   cardLimit: 8000,  description: "Para grandes eventos" },
  { key: "ultra" as const,      label: "ULTRA",      price: "R$ 1.500,00",   cardLimit: 12000, description: "Para eventos de grande porte" },
  { key: "enterprise" as const, label: "ENTERPRISE", price: "R$ 2.000,00",   cardLimit: 15000, description: "Para empresas e operações maiores" },
  { key: "mega" as const,       label: "MEGA",       price: "R$ 5.000,00",   cardLimit: 50000, description: "Para operações de larga escala" },
];

// Public query — used by info page and access guard to read plan limits
export const list = query({
  args: {},
  handler: async (ctx) => {
    const configs = await ctx.db.query("planConfigs").collect();
    // If no configs in DB, return defaults
    if (configs.length === 0) return DEFAULTS;
    // Merge defaults with DB values (in case a key is missing)
    return DEFAULTS.map((d) => {
      const saved = configs.find((c) => c.key === d.key);
      return saved ? { key: saved.key, label: saved.label, price: saved.price, cardLimit: saved.cardLimit, description: saved.description } : d;
    });
  },
});

// Admin mutation — upsert a plan config
export const upsert = mutation({
  args: {
    key: v.union(v.literal("free"), v.literal("basic"), v.literal("pro"), v.literal("max"), v.literal("ultra"), v.literal("enterprise"), v.literal("mega")),
    label: v.string(),
    price: v.string(),
    cardLimit: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    if (args.cardLimit < 1) throw new ConvexError({ code: "BAD_REQUEST", message: "Limite deve ser maior que 0" });
    if (!args.price.trim()) throw new ConvexError({ code: "BAD_REQUEST", message: "Preço é obrigatório" });

    const existing = await ctx.db
      .query("planConfigs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label.trim(),
        price: args.price.trim(),
        cardLimit: args.cardLimit,
        description: args.description.trim(),
      });
    } else {
      await ctx.db.insert("planConfigs", {
        key: args.key,
        label: args.label.trim(),
        price: args.price.trim(),
        cardLimit: args.cardLimit,
        description: args.description.trim(),
      });
    }

    // Also update all users on this plan with the new card limit
    const usersOnPlan = await ctx.db
      .query("users")
      .collect()
      .then((all) => all.filter((u) => (u.plan ?? "free") === args.key));

    for (const user of usersOnPlan) {
      await ctx.db.patch(user._id, { cardLimit: args.cardLimit });
    }
  },
});
