import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

const PLAN_ORDER = ["free", "basic", "pro", "max", "ultra", "enterprise", "mega"] as const;
type PlanKey = (typeof PLAN_ORDER)[number];

// Defaults for all settings
const DEFAULTS: Record<string, string> = {
  rifas_min_plan: "free",
  buyer_tracking_min_plan: "free",
  vendor_app_min_plan: "pro",
  reinstall_fee: "50,00",
  validator_access_code: "",
  sender_email: "",           // verified sender email for tracking emails
  sender_email_status: "",    // "pending" | "verified" | "failed"
};

// Public read — no auth required
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return row?.value ?? DEFAULTS[args.key] ?? null;
  },
});

// Get all settings at once (public)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("appSettings").collect();
    const result: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },
});

// Admin upsert
export const set = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("appSettings", { key: args.key, value: args.value });
    }
  },
});

// Public check: is buyer tracking enabled at all (no auth needed — used on public page)
// The restriction applies to the app owner's plan (admin), not the buyer.
// If the admin is logged in, always allow. Otherwise check against the configured min plan
// using the app owner (admin) user's plan.
export const getBuyerTrackingStatus = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "buyer_tracking_min_plan"))
      .first();
    const minPlan = (row?.value ?? DEFAULTS["buyer_tracking_min_plan"] ?? "free") as PlanKey;

    // "free" means no restriction — always enabled
    if (minPlan === "free") return { enabled: true, minPlan };

    // Find the admin user to check their plan
    const adminUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();

    if (!adminUser) return { enabled: false, minPlan };

    // Admin always has full access regardless of plan
    if (adminUser.isAdmin) return { enabled: true, minPlan };

    const adminPlan = (adminUser.plan ?? "free") as PlanKey;
    const enabled = PLAN_ORDER.indexOf(adminPlan) >= PLAN_ORDER.indexOf(minPlan);
    return { enabled, minPlan };
  },
});

// Public: get the reinstall fee value (used on info page and admin panel)
export const getReinstallFee = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "reinstall_fee"))
      .first();
    return row?.value ?? DEFAULTS["reinstall_fee"] ?? "50,00";
  },
});

// Public check: is vendor app enabled (no auth required — checked on public /vendedor page)
export const getVendorAppStatus = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", "vendor_app_min_plan"))
      .first();
    const minPlan = (row?.value ?? DEFAULTS["vendor_app_min_plan"] ?? "pro") as PlanKey;

    // Find the admin user to check their plan
    const adminUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isAdmin"), true))
      .first();

    if (!adminUser) return { enabled: false, minPlan };

    const adminPlan = (adminUser.plan ?? "free") as PlanKey;
    const enabled = PLAN_ORDER.indexOf(adminPlan) >= PLAN_ORDER.indexOf(minPlan);
    return { enabled, minPlan };
  },
});
// Per-user module access status — checks current user's plan against each module's min plan
export const getUserModuleStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    if (user.isAdmin) {
      return {
        vendorApp: { enabled: true, minPlan: "basic" as PlanKey },
        buyerTracking: { enabled: true, minPlan: "max" as PlanKey },
        rifas: { enabled: true, minPlan: "pro" as PlanKey },
      };
    }

    const userPlan = (user.plan ?? "free") as PlanKey;

    const getStatus = async (key: string, defaultMin: PlanKey) => {
      const row = await ctx.db
        .query("appSettings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      const minPlan = (row?.value ?? defaultMin) as PlanKey;
      const enabled = PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minPlan);
      return { enabled, minPlan };
    };

    const [vendorApp, buyerTracking, rifas] = await Promise.all([
      getStatus("vendor_app_min_plan", "basic"),
      getStatus("buyer_tracking_min_plan", "max"),
      getStatus("rifas_min_plan", "pro"),
    ]);

    return { vendorApp, buyerTracking, rifas };
  },
});


export const checkModuleAccess = query({
  args: { moduleKey: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return false;
    if (user.isAdmin) return true;

    const settingKey = `${args.moduleKey}_min_plan`;
    const row = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", settingKey))
      .first();
    const minPlan = (row?.value ?? DEFAULTS[settingKey] ?? "free") as PlanKey;

    const userPlan = (user.plan ?? "free") as PlanKey;
    return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(minPlan);
  },
});
