import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";

// SORTE columns: S(1-15) O(16-30) R(31-45) T(46-60) E(61-75)
// Each column provides 4 numbers (no FREE space in this model)
const SORTE_COLS = [
  { min: 1, max: 15 },  // S
  { min: 16, max: 30 }, // O
  { min: 31, max: 45 }, // R
  { min: 46, max: 60 }, // T
  { min: 61, max: 75 }, // E
];

// Generate one S-O-R-T-E grid (5 cols × 4 rows = 20 numbers)
function generateGrid(): number[] {
  const grid: number[] = [];
  for (let col = 0; col < 5; col++) {
    const { min, max } = SORTE_COLS[col];
    const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    // Shuffle
    for (let i = range.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [range[i], range[j]] = [range[j], range[i]];
    }
    // Take first 4
    for (let row = 0; row < 4; row++) {
      grid.push(range[row]);
    }
  }
  // grid stored column-major: grid[col*4 + row]
  return grid;
}

// Full card: 1 grid (única=20), 2 grids (dupla=40), or 3 grids (tripla=60)
function generateCard(numChances: 1 | 2 | 3 = 2): number[] {
  const grids: number[][] = [];
  for (let i = 0; i < numChances; i++) grids.push(generateGrid());
  return grids.flat();
}

export const getCount = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    return cards.length;
  },
});

// Total cards generated across ALL events by the current user
export const getTotalCountByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const events = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let total = 0;
    for (const event of events) {
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      total += cards.length;
    }

    return {
      generated: total,
      limit: user.cardLimit ?? 70,
      plan: user.plan ?? "free",
    };
  },
});

export const listPaginated = query({
  args: {
    eventId: v.id("events"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .paginate(args.paginationOpts);
  },
});

// Filtered list (no pagination) — used when a filter other than "all" is active
export const listFiltered = query({
  args: {
    eventId: v.id("events"),
    filter: v.union(
      v.literal("assigned"),
      v.literal("unassigned"),
      v.literal("paid"),
      v.literal("unpaid"),
    ),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return all.filter((c) => {
      if (args.filter === "assigned") return !!c.buyerName;
      if (args.filter === "unassigned") return !c.buyerName;
      if (args.filter === "paid") return c.paid === true;
      if (args.filter === "unpaid") return !!c.buyerName && c.paid !== true;
      return true;
    });
  },
});

export const getByNumber = query({
  args: { eventId: v.id("events"), cardNumber: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_event_and_number", (q) =>
        q.eq("eventId", args.eventId).eq("cardNumber", args.cardNumber)
      )
      .unique();
  },
});

export const generate = mutation({
  args: { eventId: v.id("events"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError({ message: "Evento não encontrado", code: "NOT_FOUND" });

    const existing = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    if (existing.length >= event.totalCards) {
      throw new ConvexError({ message: "Cartelas já foram geradas para este evento", code: "CONFLICT" });
    }

    const batchSize = Math.min(args.limit ?? 500, 500);
    const start = existing.length + 1;
    const end = Math.min(event.totalCards, start + batchSize - 1);

    const tipo = event.chanceTipo ?? "dupla";
    const numChances: 1 | 2 | 3 = tipo === "unica" ? 1 : tipo === "tripla" ? 3 : 2;

    for (let i = start; i <= end; i++) {
      const numbers = generateCard(numChances);
      await ctx.db.insert("cards", {
        eventId: args.eventId,
        cardNumber: i,
        numbers,
      });
    }

    return { generated: end - start + 1, total: end, remaining: event.totalCards - end };
  },
});

export const deleteAll = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    // Delete cards (up to 500 per call — caller re-runs until done)
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(500);
    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Also remove all vendor batches for this event
    const batches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    for (const batch of batches) {
      await ctx.db.delete(batch._id);
    }

    return { deleted: cards.length, batchesDeleted: batches.length };
  },
});

export const assignBuyer = mutation({
  args: {
    cardId: v.id("cards"),
    buyerName: v.string(),
    buyerPhone: v.optional(v.string()),
    buyerEmail: v.optional(v.string()),
    paid: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();

    // Check if sales are blocked for this card's event
    const card = await ctx.db.get(args.cardId);
    if (card) {
      const draw = await ctx.db
        .query("draws")
        .withIndex("by_event", (q) => q.eq("eventId", card.eventId))
        .unique();
      // Block only new assignments, not edits to existing buyers or payment status changes
      if (draw?.salesBlocked && !card.buyerName) {
        throw new ConvexError({ message: "Vendas bloqueadas pelo organizador do evento", code: "FORBIDDEN" });
      }
    }

    await ctx.db.patch(args.cardId, {
      buyerName: args.buyerName,
      buyerPhone: args.buyerPhone,
      buyerEmail: args.buyerEmail,
      paid: args.paid,
    });
    // Notification: venda registrada
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      if (user) {
        await ctx.scheduler.runAfter(0, internal.notifications.create, {
          userId: user._id,
          title: "Venda registrada",
          message: `Cartela #${String(card?.cardNumber ?? "?").padStart(3, "0")} atribuída a ${args.buyerName}${args.paid ? " (paga)" : ""}`,
          type: "success",
          link: "/validar",
        });
      }
    }
  },
});

export const setPaid = mutation({
  args: { cardId: v.id("cards"), paid: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cardId, { paid: args.paid });
  },
});

export const markBatchPaid = mutation({
  args: {
    eventId: v.id("events"),
    cardNumbers: v.array(v.number()),
    paid: v.boolean(),
  },
  handler: async (ctx, args): Promise<number> => {
    // Check if sales are blocked
    const draw = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (draw?.salesBlocked) {
      throw new ConvexError({ message: "Vendas bloqueadas pelo organizador do evento", code: "FORBIDDEN" });
    }

    let count = 0;
    for (const cardNumber of args.cardNumbers) {
      const card = await ctx.db
        .query("cards")
        .withIndex("by_event_and_number", (q) =>
          q.eq("eventId", args.eventId).eq("cardNumber", cardNumber)
        )
        .unique();
      if (card) {
        await ctx.db.patch(card._id, { paid: args.paid });
        count++;
      }
    }
    return count;
  },
});

export const cancelBatchSales = mutation({
  args: {
    eventId: v.id("events"),
    cardNumbers: v.array(v.number()),
  },
  handler: async (ctx, args): Promise<number> => {
    let count = 0;
    for (const cardNumber of args.cardNumbers) {
      const card = await ctx.db
        .query("cards")
        .withIndex("by_event_and_number", (q) =>
          q.eq("eventId", args.eventId).eq("cardNumber", cardNumber)
        )
        .unique();
      if (card) {
        await ctx.db.patch(card._id, {
          buyerName: undefined,
          buyerPhone: undefined,
          buyerEmail: undefined,
          paid: false,
        });
        count++;
      }
    }
    return count;
  },
});

export const setValidated = mutation({
  args: { cardId: v.id("cards"), validated: v.boolean() },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity();
    await ctx.db.patch(args.cardId, { validated: args.validated });
    // Notification: cartela validada
    if (args.validated && identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
        .unique();
      if (user) {
        const card = await ctx.db.get(args.cardId);
        await ctx.scheduler.runAfter(0, internal.notifications.create, {
          userId: user._id,
          title: "Cartela validada",
          message: `Cartela #${String(card?.cardNumber ?? "?").padStart(3, "0")}${card?.buyerName ? ` (${card.buyerName})` : ""} foi validada`,
          type: "success",
          link: "/validar",
        });
      }
    }
  },
});

export const clearBuyer = mutation({
  args: { cardId: v.id("cards") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cardId, { buyerName: undefined, buyerPhone: undefined, buyerEmail: undefined, paid: undefined });
  },
});

// Returns all cards with buyer info for CSV export (no pagination limit)
export const listForExport = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
  },
});

// Returns only paid + validated cards eligible for Giro da Sorte
export const listEligibleForGiro = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    return cards.filter((c) => c.paid === true && c.validated === true);
  },
});

// Returns cards filtered by range and/or paid status for batch PDF export
export const listForBatchExport = query({
  args: {
    eventId: v.id("events"),
    fromNumber: v.number(),
    toNumber: v.number(),
    onlyPaid: v.boolean(),
  },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return cards.filter((c) => {
      const inRange = c.cardNumber >= args.fromNumber && c.cardNumber <= args.toNumber;
      const paidOk = !args.onlyPaid || c.paid === true;
      return inRange && paidOk;
    });
  },
});

// Search cards by buyer name (full-text search)
export const searchByBuyer = query({
  args: { eventId: v.id("events"), query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) return [];
    return await ctx.db
      .query("cards")
      .withSearchIndex("search_buyer", (q) =>
        q.search("buyerName", args.query).eq("eventId", args.eventId)
      )
      .take(20);
  },
});

export const getTopScores = query({
  args: { eventId: v.id("events"), drawnNumbers: v.array(v.number()) },
  handler: async (ctx, args) => {
    if (args.drawnNumbers.length === 0) {
      return { winners: [], top: [], maxScore: 0, totalEligible: 0 };
    }
    const drawn = new Set(args.drawnNumbers);
    const event = await ctx.db.get(args.eventId);
    const tipo = event?.chanceTipo ?? "dupla";
    const numChances = tipo === "unica" ? 1 : tipo === "tripla" ? 3 : 2;

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    type CardScore = {
      cardNumber: number;
      score: number;
      score1: number; // primeira chance
      score2: number; // segunda chance
      score3: number; // terceira chance (tripla)
      buyerName?: string;
    };

    // Apenas cartelas pagas E validadas concorrem ao sorteio
    const eligible = cards.filter((c) => c.paid === true && c.validated === true);

    const scored: CardScore[] = eligible.map((card) => {
      const chanceScores = Array.from({ length: numChances }, (_, i) =>
        card.numbers.slice(i * 20, (i + 1) * 20).filter((n) => drawn.has(n)).length
      );
      return {
        cardNumber: card.cardNumber,
        score: Math.max(...chanceScores),
        score1: chanceScores[0] ?? 0,
        score2: chanceScores[1] ?? 0,
        score3: chanceScores[2] ?? 0,
        buyerName: card.buyerName,
      };
    });

    const maxScore = scored.reduce((m, c) => Math.max(m, c.score), 0);
    const winners = scored.filter((c) => c.score >= 20);
    const top = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    return { winners, top, maxScore, totalEligible: eligible.length };
  },
});

// Public query: buyer looks up their cards by phone number
export const getCardsByPhone = query({
  args: {
    phone: v.string(),
    eventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    // Normalize phone: keep digits only for matching
    const normalize = (p: string) => p.replace(/\D/g, "");
    const phoneDigits = normalize(args.phone);
    if (phoneDigits.length < 8) return [];

    // Get all events visible (no auth required – public portal)
    let events: { _id: Id<"events">; name: string; date: string; status: string; chanceTipo?: string; prizes?: { position: number; description: string }[] }[] = [];
    if (args.eventId) {
      const ev = await ctx.db.get(args.eventId);
      if (ev) events = [{ _id: ev._id, name: ev.name, date: ev.date, status: ev.status, chanceTipo: ev.chanceTipo ?? undefined, prizes: ev.prizes ?? [] }];
    } else {
      const allEvents = await ctx.db.query("events").collect();
      events = allEvents
        .map((e) => ({ _id: e._id, name: e.name, date: e.date, status: e.status, chanceTipo: e.chanceTipo ?? undefined, prizes: e.prizes ?? [] }));
    }

    const results: {
      cardNumber: number;
      numbers: number[];
      buyerName: string;
      paid: boolean;
      validated: boolean;
      eventId: string;
      eventName: string;
      eventDate: string;
      eventStatus: string;
      chanceTipo: string;
      prizes: { position: number; description: string }[];
      prizeWinners: Record<number, number>;
    }[] = [];

    for (const ev of events) {
      // Get prize awards for this event
      const prizeAwards = await ctx.db
        .query("prizeAwards")
        .withIndex("by_event", (q) => q.eq("eventId", ev._id as Id<"events">))
        .collect();
      // Map prizePosition -> winnerCardNumber
      const prizeWinners: Record<number, number> = {};
      for (const pa of prizeAwards) {
        prizeWinners[pa.prizePosition] = pa.winnerCardNumber;
      }

      const cards = await ctx.db
        .query("cards")
        .withIndex("by_event", (q) => q.eq("eventId", ev._id as Id<"events">))
        .collect();

      for (const card of cards) {
        if (!card.buyerPhone) continue;
        const cardPhoneDigits = normalize(card.buyerPhone);
        if (cardPhoneDigits.endsWith(phoneDigits) || phoneDigits.endsWith(cardPhoneDigits)) {
          results.push({
            cardNumber: card.cardNumber,
            numbers: card.numbers,
            buyerName: card.buyerName ?? "",
            paid: card.paid ?? false,
            validated: card.validated ?? false,
            eventId: ev._id,
            eventName: ev.name,
            eventDate: ev.date,
            eventStatus: ev.status,
            chanceTipo: ev.chanceTipo ?? "dupla",
            prizes: ev.prizes ?? [],
            prizeWinners,
          });
        }
      }
    }

    return results;
  },
});

// Public: get drawn numbers for an event (for buyer tracking)
export const getDrawnNumbersPublic = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const draw = await ctx.db
      .query("draws")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .first();
    return draw ? draw.drawnNumbers : [];
  },
});

export const getSalesSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();
    const total = cards.length;
    const assigned = cards.filter((c) => c.buyerName).length;
    const paid = cards.filter((c) => c.paid).length;
    return { total, assigned, unassigned: total - assigned, paid, unpaid: assigned - paid };
  },
});

// Detailed summary including validated count and vendor-pending count
export const getDetailedSummary = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const batches = await ctx.db
      .query("vendorBatches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Build set of card numbers with a vendor
    const vendorCardNums = new Set<number>();
    for (const batch of batches) {
      for (const num of batch.cardNumbers) vendorCardNums.add(num);
    }

    const total = cards.length;
    const assigned = cards.filter((c) => !!c.buyerName).length;
    const paid = cards.filter((c) => c.paid === true).length;
    const validated = cards.filter((c) => c.validated === true).length;
    // Cards sent to a vendor but not yet paid
    const atVendorPending = cards.filter(
      (c) => vendorCardNums.has(c.cardNumber) && !c.paid
    ).length;
    const unassigned = total - assigned;

    return {
      total,
      assigned,
      unassigned,
      paid,
      unpaid: assigned - paid,
      validated,
      atVendorPending,
    };
  },
});

// Sales by day: count of cards assigned per calendar day (UTC)
export const getSalesByDay = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const dayMap: Record<string, { sold: number; paid: number; validated: number }> = {};

    for (const card of cards) {
      if (!card.buyerName) continue;
      const day = new Date(card._creationTime).toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { sold: 0, paid: 0, validated: 0 };
      dayMap[day].sold++;
      if (card.paid) dayMap[day].paid++;
      if (card.validated) dayMap[day].validated++;
    }

    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, counts]) => ({ day, ...counts }));
  },
});
