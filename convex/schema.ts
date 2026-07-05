import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("admin"), v.literal("vendor"))),
    linkedVendorId: v.optional(v.id("vendors")), // for vendor-role users
    // Card generation limits
    cardLimit: v.optional(v.number()), // default 70 for new users
    plan: v.optional(v.union(
      v.literal("free"),        // 70 cards
      v.literal("basic"),       // 2000 cards
      v.literal("pro"),         // 4000 cards
      v.literal("max"),         // 8000 cards
      v.literal("ultra"),       // 12000 cards
      v.literal("enterprise"),  // 15000 cards
      v.literal("mega"),        // 50000 cards
    )),
    isBlocked: v.optional(v.boolean()),
    // Device lock
    deviceFingerprint: v.optional(v.string()),
    deviceLabel: v.optional(v.string()), // human-readable e.g. "Chrome / Windows"
    devicePendingApproval: v.optional(v.boolean()),
    newDeviceFingerprint: v.optional(v.string()), // pending new device waiting admin approval
    newDeviceLabel: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  // Upgrade and device approval requests
  accessRequests: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("upgrade"), v.literal("device")),
    requestedPlan: v.optional(v.union(
      v.literal("basic"),
      v.literal("pro"),
      v.literal("max"),
    )),
    newDeviceFingerprint: v.optional(v.string()),
    newDeviceLabel: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.string(),
    resolvedAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  events: defineTable({
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
    prizes: v.optional(v.array(v.object({
      position: v.number(),
      description: v.string(),
    }))),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("finished")),
    createdBy: v.optional(v.string()),
    userId: v.optional(v.id("users")), // owner
    chanceTipo: v.optional(v.union(v.literal("unica"), v.literal("dupla"), v.literal("tripla"))),
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),

  cards: defineTable({
    eventId: v.id("events"),
    cardNumber: v.number(),
    numbers: v.array(v.number()),
    buyerName: v.optional(v.string()),
    buyerPhone: v.optional(v.string()),
    buyerEmail: v.optional(v.string()),
    paid: v.optional(v.boolean()),
    validated: v.optional(v.boolean()),
    paymentProofStorageId: v.optional(v.id("_storage")),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_number", ["eventId", "cardNumber"])
    .searchIndex("search_buyer", { searchField: "buyerName", filterFields: ["eventId"] }),

  draws: defineTable({
    eventId: v.id("events"),
    drawnNumbers: v.array(v.number()),
    lastDrawn: v.optional(v.number()),
    salesBlocked: v.optional(v.boolean()),
  }).index("by_event", ["eventId"]),

  vendorBatches: defineTable({
    eventId: v.id("events"),
    vendorId: v.optional(v.id("vendors")),
    vendorName: v.optional(v.string()),
    cardNumbers: v.array(v.number()),
    accessCode: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_code", ["accessCode"]),

  vendors: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    userId: v.optional(v.id("users")), // owner
  })
    .index("by_name", ["name"])
    .index("by_user", ["userId"]),

  prizeAwards: defineTable({
    eventId: v.id("events"),
    prizePosition: v.number(),
    prizeDescription: v.string(),
    winnerCardNumber: v.number(),
    winnerName: v.optional(v.string()),
    awardedAt: v.string(),
  }).index("by_event", ["eventId"]),

  regulations: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    content: v.string(), // plain text with line breaks
    updatedAt: v.string(),
  }).index("by_event", ["eventId"]),

  // ─── Rifas ───────────────────────────────────────────────────────────────
  rifas: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    time: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    totalNumbers: v.number(),      // e.g. 100, 200, 500
    ticketPrice: v.optional(v.number()),
    prizes: v.optional(v.array(v.object({
      position: v.number(),
      description: v.string(),
    }))),
    status: v.union(v.literal("active"), v.literal("finished")),
    planRequired: v.optional(v.union(
      v.literal("free"),
      v.literal("basic"),
      v.literal("pro"),
      v.literal("max"),
    )),
    imageStorageId: v.optional(v.id("_storage")),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("info"), v.literal("success"), v.literal("warning")),
    read: v.boolean(),
    createdAt: v.string(),
    link: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"]),

  // Configurable plan settings (editable by admin)
  planConfigs: defineTable({
    key: v.union(v.literal("free"), v.literal("basic"), v.literal("pro"), v.literal("max"), v.literal("ultra"), v.literal("enterprise"), v.literal("mega")),
    label: v.string(),
    price: v.string(),         // Display text e.g. "R$ 400,00"
    cardLimit: v.number(),     // Actual card limit enforced
    description: v.string(),   // Short tagline
    reinstallFee: v.optional(v.string()), // Only used for the "reinstall fee" config (key="free" as global)
  }).index("by_key", ["key"]),

  // Global app settings (key-value, managed by admin)
  appSettings: defineTable({
    key: v.string(),   // e.g. "rifas_min_plan"
    value: v.string(), // e.g. "pro"
  }).index("by_key", ["key"]),

  // Card template designs (per user, one per chanceTipo)
  cardTemplates: defineTable({
    userId: v.id("users"),
    chanceTipo: v.union(v.literal("unica"), v.literal("dupla"), v.literal("tripla")),
    // Header
    headerTitle: v.optional(v.string()),
    headerSubtitle: v.optional(v.string()),
    headerSubtitle2: v.optional(v.string()),
    headerBgColor: v.optional(v.string()),     // hex
    headerTextColor: v.optional(v.string()),   // hex
    headerLogoUrl: v.optional(v.string()),     // CDN URL
    headerHeight: v.optional(v.number()),      // mm
    // Grid
    gridHeaderBgColor: v.optional(v.string()), // hex
    gridHeaderTextColor: v.optional(v.string()),
    gridCellBgColor: v.optional(v.string()),
    gridCellTextColor: v.optional(v.string()),
    gridFontSize: v.optional(v.number()),      // pt
    gridBorderColor: v.optional(v.string()),   // hex
    gridBorderWidth: v.optional(v.number()),   // pt 0-3
    gridCellHeight: v.optional(v.number()),    // mm
    gridAltRowEnabled: v.optional(v.boolean()),
    gridAltRowColor: v.optional(v.string()),   // hex
    // Footer
    footerText: v.optional(v.string()),
    footerBgColor: v.optional(v.string()),
    footerTextColor: v.optional(v.string()),
    footerHeight: v.optional(v.number()),
    // Background
    bgColor: v.optional(v.string()),
    bgImageUrl: v.optional(v.string()),
    bgOpacity: v.optional(v.number()),         // 0-1
    // QR Code
    qrCodeEnabled: v.optional(v.boolean()),
    qrCodeUrl: v.optional(v.string()),
    qrCodeX: v.optional(v.number()),      // mm from left margin
    qrCodeY: v.optional(v.number()),      // mm from top margin
    qrCodeSize: v.optional(v.number()),   // mm
    qrCodeSlot: v.optional(v.union(v.literal("none"), v.literal("inline-1"), v.literal("inline-2"), v.literal("inline-3"))),
    // Grid positions (mm from page margin; null = auto flow)
    grid1X: v.optional(v.number()),
    grid1Y: v.optional(v.number()),
    grid2X: v.optional(v.number()),
    grid2Y: v.optional(v.number()),
    grid3X: v.optional(v.number()),
    grid3Y: v.optional(v.number()),
    prizePatterns: v.optional(v.string()), // JSON-serialized PrizePattern[]
    showPrizesBelow: v.optional(v.boolean()), // show prize description below each grid
    prizeNumberLayouts: v.optional(v.string()), // JSON-serialized PrizeNumberLayout[]
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_tipo", ["userId", "chanceTipo"]),
});
