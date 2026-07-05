import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

// List notifications for the current user (latest 50)
export const list = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: Id<"notifications">;
    _creationTime: number;
    userId: Id<"users">;
    title: string;
    message: string;
    type: "info" | "success" | "warning";
    read: boolean;
    createdAt: string;
    link?: string;
  }>> => {
    const user = await getUser(ctx);
    if (!user) return [];
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return all;
  },
});

// Count unread notifications
export const countUnread = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const user = await getUser(ctx);
    if (!user) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    return unread.length;
  },
});

// Mark a single notification as read
export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });
    const notif = await ctx.db.get(args.notificationId);
    if (!notif || notif.userId !== user._id) return;
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

// Mark all notifications as read
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) => q.eq("userId", user._id).eq("read", false))
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
  },
});

// Delete a notification
export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });
    const notif = await ctx.db.get(args.notificationId);
    if (!notif || notif.userId !== user._id) return;
    await ctx.db.delete(args.notificationId);
  },
});

// Internal: create a notification for a user
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("info"), v.literal("success"), v.literal("warning")),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      read: false,
      createdAt: new Date().toISOString(),
      link: args.link,
    });
  },
});
