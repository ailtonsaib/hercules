import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

const tipoValidator = v.union(v.literal("unica"), v.literal("dupla"), v.literal("tripla"));

export const getByTipo = query({
  args: { chanceTipo: tipoValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return await ctx.db
      .query("cardTemplates")
      .withIndex("by_user_and_tipo", (q) => q.eq("userId", user._id).eq("chanceTipo", args.chanceTipo))
      .unique();
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];
    return await ctx.db
      .query("cardTemplates")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const save = mutation({
  args: {
    chanceTipo: tipoValidator,
    headerTitle: v.optional(v.string()),
    headerSubtitle: v.optional(v.string()),
    headerSubtitle2: v.optional(v.string()),
    headerBgColor: v.optional(v.string()),
    headerTextColor: v.optional(v.string()),
    headerLogoUrl: v.optional(v.string()),
    headerHeight: v.optional(v.number()),
    gridHeaderBgColor: v.optional(v.string()),
    gridHeaderTextColor: v.optional(v.string()),
    gridCellBgColor: v.optional(v.string()),
    gridCellTextColor: v.optional(v.string()),
    gridFontSize: v.optional(v.number()),
    gridBorderColor: v.optional(v.string()),
    gridBorderWidth: v.optional(v.number()),
    gridCellHeight: v.optional(v.number()),
    gridAltRowEnabled: v.optional(v.boolean()),
    gridAltRowColor: v.optional(v.string()),
    footerText: v.optional(v.string()),
    footerBgColor: v.optional(v.string()),
    footerTextColor: v.optional(v.string()),
    footerHeight: v.optional(v.number()),
    bgColor: v.optional(v.string()),
    bgImageUrl: v.optional(v.string()),
    bgOpacity: v.optional(v.number()),
    qrCodeEnabled: v.optional(v.boolean()),
    qrCodeUrl: v.optional(v.string()),
    qrCodeX: v.optional(v.number()),
    qrCodeY: v.optional(v.number()),
    qrCodeSize: v.optional(v.number()),
    qrCodeSlot: v.optional(v.union(v.literal("none"), v.literal("inline-1"), v.literal("inline-2"), v.literal("inline-3"))),
    grid1X: v.optional(v.number()),
    grid1Y: v.optional(v.number()),
    grid2X: v.optional(v.number()),
    grid2Y: v.optional(v.number()),
    grid3X: v.optional(v.number()),
    grid3Y: v.optional(v.number()),
    prizePatterns: v.optional(v.string()),
    showPrizesBelow: v.optional(v.boolean()),
    prizeNumberLayouts: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Não autenticado", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "Usuário não encontrado", code: "NOT_FOUND" });

    const existing = await ctx.db
      .query("cardTemplates")
      .withIndex("by_user_and_tipo", (q) => q.eq("userId", user._id).eq("chanceTipo", args.chanceTipo))
      .unique();

    const data = {
      userId: user._id,
      chanceTipo: args.chanceTipo,
      headerTitle: args.headerTitle,
      headerSubtitle: args.headerSubtitle,
      headerSubtitle2: args.headerSubtitle2,
      headerBgColor: args.headerBgColor,
      headerTextColor: args.headerTextColor,
      headerLogoUrl: args.headerLogoUrl,
      headerHeight: args.headerHeight,
      gridHeaderBgColor: args.gridHeaderBgColor,
      gridHeaderTextColor: args.gridHeaderTextColor,
      gridCellBgColor: args.gridCellBgColor,
      gridCellTextColor: args.gridCellTextColor,
      gridFontSize: args.gridFontSize,
      gridBorderColor: args.gridBorderColor,
      gridBorderWidth: args.gridBorderWidth,
      gridCellHeight: args.gridCellHeight,
      gridAltRowEnabled: args.gridAltRowEnabled,
      gridAltRowColor: args.gridAltRowColor,
      footerText: args.footerText,
      footerBgColor: args.footerBgColor,
      footerTextColor: args.footerTextColor,
      footerHeight: args.footerHeight,
      bgColor: args.bgColor,
      bgImageUrl: args.bgImageUrl,
      bgOpacity: args.bgOpacity,
      qrCodeEnabled: args.qrCodeEnabled,
      qrCodeUrl: args.qrCodeUrl,
      qrCodeX: args.qrCodeX,
      qrCodeY: args.qrCodeY,
      qrCodeSize: args.qrCodeSize,
      qrCodeSlot: args.qrCodeSlot,
      grid1X: args.grid1X,
      grid1Y: args.grid1Y,
      grid2X: args.grid2X,
      grid2Y: args.grid2Y,
      grid3X: args.grid3X,
      grid3Y: args.grid3Y,
      prizePatterns: args.prizePatterns,
      showPrizesBelow: args.showPrizesBelow,
      prizeNumberLayouts: args.prizeNumberLayouts,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await ctx.db.replace(existing._id, data);
      return existing._id;
    } else {
      return await ctx.db.insert("cardTemplates", data);
    }
  },
});
