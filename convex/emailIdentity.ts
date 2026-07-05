"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import Hercules from "@usehercules/sdk";

// Register (or re-trigger verification for) an email identity
export const registerSenderEmail = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ status: "pending" | "verified" | "failed"; identityId: string; alreadyExists: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });

    const hercules = new Hercules({
      apiVersion: "2025-12-09",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const email = args.email.trim().toLowerCase();

    // Check if identity already exists
    const existing = await hercules.email.identities.list({ limit: 100 });
    for await (const id of existing) {
      if (id.type === "email" && id.value.toLowerCase() === email) {
        if (id.status === "pending") {
          // Resend verification email
          await hercules.email.identities.verify(id.id, { resend: true });
        }
        return { status: id.status as "pending" | "verified" | "failed", identityId: id.id, alreadyExists: true };
      }
    }

    // Create new identity
    const created = await hercules.email.identities.create({ type: "email", value: email });
    return { status: created.status as "pending" | "verified" | "failed", identityId: created.id, alreadyExists: false };
  },
});

// Check current status of an email identity
export const checkSenderEmailStatus = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ status: "pending" | "verified" | "failed" | "not_found" }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Não autenticado" });

    const hercules = new Hercules({
      apiVersion: "2025-12-09",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const email = args.email.trim().toLowerCase();

    for await (const id of await hercules.email.identities.list({ limit: 100 })) {
      if (id.type === "email" && id.value.toLowerCase() === email) {
        return { status: id.status as "pending" | "verified" | "failed" };
      }
    }

    return { status: "not_found" };
  },
});
