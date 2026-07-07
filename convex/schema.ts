import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    username: v.string(), 
    password: v.string(), 
    role: v.string(),     
    address: v.optional(v.string()),   
    phone: v.optional(v.string()),     
    ipAddress: v.optional(v.string()), 
    tokenIdentifier: v.optional(v.string()), 
    createdAt: v.number(),
  })
  .index("by_username", ["username"])
  .index("by_token", ["tokenIdentifier"])
  .index("by_name", ["name"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    localName: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    phone: v.optional(v.string()),
    eventDate: v.optional(v.string()),
    eventTime: v.optional(v.string()),
    totalCards: v.number(),
    chanceType: v.string(), 
    cardValue: v.number(),  
    prizes: v.array(v.string()), 
    creatorId: v.id("users"),
    createdAt: v.number(),
  }).index("by_creator", ["creatorId"]), // 💎 ADICIONE APENAS ESSA LINHA BEM AQUI!

   // 🔴 TABELA DE CARTELAS DESTRAVADA COM V.ANY NO SCHEMA 🔴
  cards: defineTable({
    eventId: v.string(),
    batchId: v.optional(v.string()),
    userId: v.string(), 
    numbers: v.array(v.number()),
    serialNumber: v.string(),
    createdAt: v.number(),
    isSold: v.optional(v.boolean()), 
    buyerName: v.optional(v.string()),
    buyerPhone: v.optional(v.string()),
    attachmentUrl: v.optional(v.union(v.string(), v.null())),
    soldAt: v.optional(v.number()),
  }).index("by_event", ["eventId"]),


  batches: defineTable({
    eventId: v.string(),
    startNumber: v.number(),
    endNumber: v.number(),
    vendorId: v.union(v.string(), v.null()),
    vendorName: v.string(),
    createdAt: v.number(),
  }),

  vendors: defineTable({
    name: v.string(),
    document: v.optional(v.string()), 
    commissionRate: v.number(),
    phone: v.optional(v.string()),    
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_document", ["document"]),

  appSettings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  draws: defineTable({
    eventId: v.string(),
    numbers: v.array(v.number()),
    lastNumber: v.number(),
    isFinished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  prizeAwards: defineTable({
    eventId: v.string(),
    userId: v.string(),
    cardId: v.string(),
    prizeDescription: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  rifas: defineTable({
    eventId: v.string(),
    userId: v.string(),
    number: v.string(),
    status: v.string(), 
    createdAt: v.number(),
  }).index("by_event", ["eventId"]),
});
