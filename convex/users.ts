import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

const ADMIN_EMAIL = "ailtonsaib@gmail.com";
const DEFAULT_CARD_LIMIT = 70;

// Helper: get card limit for a plan from planConfigs table (falls back to hardcoded defaults)
async function getPlanCardLimit(ctx: MutationCtx, planKey: string): Promise<number> {
  const HARDCODED: Record<string, number> = { free: 70, basic: 2000, pro: 4000, max: 8000, ultra: 12000, enterprise: 15000, mega: 50000 };
  const validKeys = ["free", "basic", "pro", "max", "ultra", "enterprise", "mega"] as const;
  type PlanKey = typeof validKeys[number];
  const key = validKeys.includes(planKey as PlanKey) ? (planKey as PlanKey) : "free";
  const config = await ctx.db.query("planConfigs").withIndex("by_key", (q) => q.eq("key", key)).first();
  return config?.cardLimit ?? HARDCODED[planKey] ?? 70;
}

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "User not logged in" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (user !== null) {
      // Ensure existing admin user has correct flags (handles migration)
      if (identity.email === ADMIN_EMAIL && !user.isAdmin) {
        await ctx.db.patch(user._id, {
          isAdmin: true,
          cardLimit: 8000,
          plan: "max",
          deviceFingerprint: undefined,
          devicePendingApproval: false,
        });
      }
      return user._id;
    }

    // New user — check if admin
    const isAdmin = identity.email === ADMIN_EMAIL;
    const freeLimit = isAdmin ? 8000 : await getPlanCardLimit(ctx, "free");

    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      isAdmin: isAdmin || undefined,
      cardLimit: freeLimit,
      plan: isAdmin ? "max" : "free",
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

// Register/verify device fingerprint for current user
export const registerDevice = mutation({
  args: {
    fingerprint: v.string(),
    label: v.string(),
  },
  handler: async (ctx, args): Promise<{ status: "ok" | "blocked" | "pending" }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

    if (user.isBlocked) return { status: "blocked" };

    // Admin: always allowed, no device lock (check both field and email)
    if (user.isAdmin || identity.email === ADMIN_EMAIL) return { status: "ok" };

    // No device registered yet — register this one
    if (!user.deviceFingerprint) {
      await ctx.db.patch(user._id, {
        deviceFingerprint: args.fingerprint,
        deviceLabel: args.label,
      });
      return { status: "ok" };
    }

    // Same device — ok
    if (user.deviceFingerprint === args.fingerprint) return { status: "ok" };

    // Different device — check if there's already a pending request for this new device
    if (user.newDeviceFingerprint === args.fingerprint && user.devicePendingApproval) {
      return { status: "pending" };
    }

    // Different device — register as pending request
    await ctx.db.patch(user._id, {
      newDeviceFingerprint: args.fingerprint,
      newDeviceLabel: args.label,
      devicePendingApproval: true,
    });

    // Create an access request record
    const existing = await ctx.db
      .query("accessRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const alreadyPending = existing.find(
      (r) => r.type === "device" && r.status === "pending"
    );
    if (!alreadyPending) {
      await ctx.db.insert("accessRequests", {
        userId: user._id,
        type: "device",
        newDeviceFingerprint: args.fingerprint,
        newDeviceLabel: args.label,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }

    return { status: "pending" };
  },
});

// Get current user's pending plan request
export const getMyPendingPlanRequest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    const requests = await ctx.db
      .query("accessRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return requests.find((r) => r.type === "upgrade" && r.status === "pending") ?? null;
  },
});

// Request upgrade plan
export const requestUpgrade = mutation({
  args: {
    plan: v.union(v.literal("basic"), v.literal("pro"), v.literal("max")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

    // Check for already pending request
    const existing = await ctx.db
      .query("accessRequests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const alreadyPending = existing.find((r) => r.type === "upgrade" && r.status === "pending");
    if (alreadyPending) {
      throw new ConvexError({ code: "CONFLICT", message: "Já existe uma solicitação pendente" });
    }

    await ctx.db.insert("accessRequests", {
      userId: user._id,
      type: "upgrade",
      requestedPlan: args.plan,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Send confirmation email to the user if they have an email address
    const EMAIL_FROM = process.env.UPGRADE_EMAIL_FROM ?? "";
    if (user.email && EMAIL_FROM) {
      await ctx.scheduler.runAfter(0, internal.emails.sendUpgradeRequestEmail, {
        to: user.email,
        userName: user.name ?? "Usuário",
        requestedPlan: args.plan,
        from: EMAIL_FROM,
      });
    }
  },
});

// ---- Admin queries/mutations ----

export const adminListUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    return await ctx.db.query("users").collect();
  },
});

export const adminListRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    const requests = await ctx.db.query("accessRequests").order("desc").collect();
    const withUser = await Promise.all(
      requests.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return { ...r, userEmail: user?.email, userName: user?.name };
      })
    );
    return withUser;
  },
});

export const adminApproveRequest = mutation({
  args: { requestId: v.id("accessRequests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });

    const user = await ctx.db.get(request.userId);
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

    if (request.type === "upgrade" && request.requestedPlan) {
      const limit = await getPlanCardLimit(ctx, request.requestedPlan);
      await ctx.db.patch(user._id, {
        plan: request.requestedPlan,
        cardLimit: limit,
      });
    } else if (request.type === "device") {
      await ctx.db.patch(user._id, {
        deviceFingerprint: user.newDeviceFingerprint,
        deviceLabel: user.newDeviceLabel,
        newDeviceFingerprint: undefined,
        newDeviceLabel: undefined,
        devicePendingApproval: false,
      });
    }

    await ctx.db.patch(args.requestId, {
      status: "approved",
      resolvedAt: new Date().toISOString(),
    });
  },
});

export const adminRejectRequest = mutation({
  args: { requestId: v.id("accessRequests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError({ code: "NOT_FOUND", message: "Não encontrado" });

    const user = await ctx.db.get(request.userId);
    if (user && request.type === "device") {
      await ctx.db.patch(user._id, {
        newDeviceFingerprint: undefined,
        newDeviceLabel: undefined,
        devicePendingApproval: false,
      });
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      resolvedAt: new Date().toISOString(),
    });
  },
});

export const adminSetUserPlan = mutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("basic"), v.literal("pro"), v.literal("max"), v.literal("ultra"), v.literal("enterprise"), v.literal("mega")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    const limit = await getPlanCardLimit(ctx, args.plan);
    await ctx.db.patch(args.userId, { plan: args.plan, cardLimit: limit });
  },
});

export const adminToggleBlock = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
    await ctx.db.patch(args.userId, { isBlocked: !user.isBlocked });
  },
});

// ---- Role management ----

export const adminSetUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("vendor"), v.literal("none")),
    linkedVendorId: v.optional(v.id("vendors")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    if (args.role === "admin") {
      await ctx.db.patch(args.userId, { role: "admin", isAdmin: true, linkedVendorId: undefined });
    } else if (args.role === "vendor") {
      await ctx.db.patch(args.userId, { role: "vendor", isAdmin: undefined, linkedVendorId: args.linkedVendorId });
    } else {
      await ctx.db.patch(args.userId, { role: undefined, isAdmin: undefined, linkedVendorId: undefined });
    }
  },
});

export const adminResetDevice = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    await ctx.db.patch(args.userId, {
      deviceFingerprint: undefined,
      deviceLabel: undefined,
      newDeviceFingerprint: undefined,
      newDeviceLabel: undefined,
      devicePendingApproval: false,
    });
  },
});

// Approve device swap directly by userId (used when no accessRequest record exists)
export const adminApproveDeviceByUserId = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me?.isAdmin) throw new ConvexError({ code: "FORBIDDEN", message: "Sem permissão" });

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "Usuário não encontrado" });

    // Promote newDevice → current device
    await ctx.db.patch(args.userId, {
      deviceFingerprint: user.newDeviceFingerprint ?? user.deviceFingerprint,
      deviceLabel: user.newDeviceLabel ?? user.deviceLabel,
      newDeviceFingerprint: undefined,
      newDeviceLabel: undefined,
      devicePendingApproval: false,
    });

    // Mark any related pending device requests as approved
    const pending = await ctx.db
      .query("accessRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const r of pending) {
      if (r.type === "device" && r.status === "pending") {
        await ctx.db.patch(r._id, { status: "approved", resolvedAt: new Date().toISOString() });
      }
    }
  },
});


function businessDaysBetween(from: Date, to: Date): number {
  let count = 0;
  const cur = new Date(from);
  while (cur < to) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

// Internal: expire plan requests older than 3 business days (called by cron)
export const expireOldPlanRequests = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("accessRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const now = new Date();
    for (const req of pending) {
      if (req.type !== "upgrade") continue;
      const created = new Date(req.createdAt);
      if (businessDaysBetween(created, now) >= 3) {
        await ctx.db.delete(req._id);
      }
    }
  },
});
