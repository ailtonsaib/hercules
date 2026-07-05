import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a random 6-digit numeric code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a vendor batch and return the access code
export const create = mutation({
  args: {
    eventId: v.id("events"),
    vendorId: v.optional(v.id("vendors")),
    vendorName: v.optional(v.string()),
    cardNumbers: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    let code = generateCode();
    let existing = await ctx.db
      .query("vendorBatches")
      .withIndex("by_code", (q) => q.eq("accessCode", code))
      .first();
    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("vendorBatches")
        .withIndex("by_code", (q) => q.eq("accessCode", code))
        .first();
    }
    // Check for duplicate card numbers already assigned to any batch for this event
    const existingBatches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const alreadyAssigned = new Set(existingBatches.flatMap((b) => b.cardNumbers));
    const duplicates = args.cardNumbers.filter((n) => alreadyAssigned.has(n));

    if (duplicates.length > 0) {
      throw new Error(
        `As seguintes cartelas já estão em outro lote: ${duplicates.join(", ")}`
      );
    }

    await ctx.db.insert("vendorBatches", {
      eventId: args.eventId,
      vendorId: args.vendorId,
      vendorName: args.vendorName,
      cardNumbers: args.cardNumbers,
      accessCode: code,
    });
    return code;
  },
});

// Get batch by access code (used by vendor app)
export const getByCode = query({
  args: { accessCode: v.string() },
  handler: async (ctx, args) => {
    if (args.accessCode.length !== 6) return null;
    const batch = await ctx.db
      .query("vendorBatches")
      .withIndex("by_code", (q) => q.eq("accessCode", args.accessCode))
      .first();
    if (!batch) return null;
    const event = await ctx.db.get(batch.eventId);
    return { batch, event };
  },
});

// Get batches by vendor phone number — returns the most recent batch with an active event
export const getBatchesByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    if (!args.phone || args.phone.replace(/\D/g, "").length < 10) return null;
    const normalizedPhone = args.phone.replace(/\D/g, "");
    // Find vendor with this phone (compare digits only)
    const vendors = await ctx.db.query("vendors").collect();
    const vendor = vendors.find(
      (v) => v.phone && v.phone.replace(/\D/g, "") === normalizedPhone
    );
    if (!vendor) return null;
    // Find batches linked to this vendor
    const allBatches = await ctx.db.query("vendorBatches").collect();
    const vendorBatches = allBatches.filter((b) => b.vendorId === vendor._id);
    if (vendorBatches.length === 0) return null;
    // Return list with event info
    const result = await Promise.all(
      vendorBatches.map(async (batch) => {
        const event = await ctx.db.get(batch.eventId);
        return { batch, event };
      })
    );
    return { vendor, batches: result.filter((r) => r.event !== null) };
  },
});

// List all batches for an event
export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
  },
});

// Get a map of cardNumber -> vendorName for all batches in an event
export const cardVendorMap = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args): Promise<Record<number, string>> => {
    const batches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const map: Record<number, string> = {};
    for (const batch of batches) {
      const label = batch.vendorName ?? "Vendedor";
      for (const num of batch.cardNumbers) {
        map[num] = label;
      }
    }
    return map;
  },
});

// Add more card numbers to an existing batch (keeps same access code)
export const addCards = mutation({
  args: {
    batchId: v.id("vendorBatches"),
    cardNumbers: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) throw new Error("Lote não encontrado");

    // Check for duplicates across all batches for this event
    const allBatches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", batch.eventId))
      .collect();

    const alreadyAssigned = new Set(allBatches.flatMap((b) => b.cardNumbers));
    const duplicates = args.cardNumbers.filter((n) => alreadyAssigned.has(n));
    if (duplicates.length > 0) {
      throw new Error(`Cartelas já estão em outro lote: ${duplicates.join(", ")}`);
    }

    const merged = [...new Set([...batch.cardNumbers, ...args.cardNumbers])].sort((a, b) => a - b);
    await ctx.db.patch(args.batchId, { cardNumbers: merged });
    return { code: batch.accessCode, total: merged.length };
  },
});

// Delete a batch
export const remove = mutation({
  args: { batchId: v.id("vendorBatches") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.batchId);
  },
});

// Delete all vendor batches for an event (without deleting cards)
export const deleteAllBatches = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const batches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const batch of batches) {
      await ctx.db.delete(batch._id);
    }
    return { deleted: batches.length };
  },
});
// If targetBatchId is null, removes the cards from their current batch (returns to app)
export const transferCards = mutation({
  args: {
    eventId: v.id("events"),
    cardNumbers: v.array(v.number()),
    targetVendorId: v.optional(v.id("vendors")),
    targetVendorName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ code: string | null; removed: number; added: number }> => {
    const batches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const toMove = new Set(args.cardNumbers);

    // Remove the cards from their current batches
    let removed = 0;
    for (const batch of batches) {
      const before = batch.cardNumbers.length;
      const remaining = batch.cardNumbers.filter((n) => !toMove.has(n));
      if (remaining.length !== before) {
        removed += before - remaining.length;
        if (remaining.length === 0) {
          await ctx.db.delete(batch._id);
        } else {
          await ctx.db.patch(batch._id, { cardNumbers: remaining });
        }
      }
    }

    // If a target vendor was specified, add to their batch (or create a new one)
    let code: string | null = null;
    if (args.targetVendorId !== undefined || args.targetVendorName !== undefined) {
      // Find existing batch for this vendor in this event
      const existingBatch = batches.find(
        (b) =>
          (args.targetVendorId && b.vendorId === args.targetVendorId) ||
          (!args.targetVendorId && args.targetVendorName && b.vendorName === args.targetVendorName)
      );

      if (existingBatch) {
        const merged = [...new Set([...existingBatch.cardNumbers, ...args.cardNumbers])];
        await ctx.db.patch(existingBatch._id, { cardNumbers: merged });
        code = existingBatch.accessCode;
      } else {
        // Create a new batch for this vendor
        let newCode = Math.floor(100000 + Math.random() * 900000).toString();
        let existing = await ctx.db
          .query("vendorBatches")
          .withIndex("by_code", (q) => q.eq("accessCode", newCode))
          .first();
        while (existing) {
          newCode = Math.floor(100000 + Math.random() * 900000).toString();
          existing = await ctx.db
            .query("vendorBatches")
            .withIndex("by_code", (q) => q.eq("accessCode", newCode))
            .first();
        }
        await ctx.db.insert("vendorBatches", {
          eventId: args.eventId,
          vendorId: args.targetVendorId,
          vendorName: args.targetVendorName,
          cardNumbers: args.cardNumbers,
          accessCode: newCode,
        });
        code = newCode;
      }
    }

    return { code, removed, added: args.cardNumbers.length };
  },
});
