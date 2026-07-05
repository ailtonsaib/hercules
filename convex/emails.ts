"use node";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Hercules from "@usehercules/sdk";
import type { Id } from "./_generated/dataModel.js";

// Internal action: send upgrade request confirmation email
export const sendUpgradeRequestEmail = internalAction({
  args: {
    to: v.string(),
    userName: v.string(),
    requestedPlan: v.string(),
    from: v.string(),
  },
  handler: async (_ctx, args): Promise<void> => {
    const hercules = new Hercules({
      apiVersion: "2025-12-09",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Solicitação de Upgrade Recebida</h2>
        <p>Olá, <strong>${args.userName}</strong>!</p>
        <p>Recebemos sua solicitação para upgrade para o plano <strong>${args.requestedPlan.toUpperCase()}</strong>.</p>
        <p>Nossa equipe irá analisar e entrar em contato em breve.</p>
        <p>Obrigado!</p>
      </div>
    `;

    try {
      await hercules.email.send({
        from: args.from,
        to: args.to,
        subject: `Solicitação de Upgrade para ${args.requestedPlan.toUpperCase()} recebida`,
        html,
        text: `Olá ${args.userName}! Recebemos sua solicitação de upgrade para o plano ${args.requestedPlan.toUpperCase()}. Nossa equipe entrará em contato em breve.`,
      });
    } catch {
      // Silently fail — email is optional
    }
  },
});

// Action: send tracking link to all buyers with email for an event
export const sendTrackingEmails = action({
  args: {
    eventId: v.id("events"),
    senderEmail: v.string(),
    appUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ sent: number; failed: number; skipped: number }> => {
    const cards = await ctx.runQuery(internal.emailQueries.getCardsWithEmail, { eventId: args.eventId as Id<"events"> });
    const eventName = await ctx.runQuery(internal.emailQueries.getEventName, { eventId: args.eventId as Id<"events"> });

    if (cards.length === 0) {
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const hercules = new Hercules({
      apiVersion: "2025-12-09",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const trackingUrl = `${args.appUrl}/minhas-cartelas`;
    let sent = 0;
    let failed = 0;

    // Group by email to avoid duplicates
    const emailMap = new Map<string, { name: string; cardNumbers: number[] }>();
    for (const card of cards) {
      if (!card.buyerEmail) continue;
      const email = card.buyerEmail.toLowerCase().trim();
      const existing = emailMap.get(email);
      if (existing) {
        existing.cardNumbers.push(card.cardNumber);
      } else {
        emailMap.set(email, {
          name: card.buyerName ?? "Comprador",
          cardNumbers: [card.cardNumber],
        });
      }
    }

    for (const [email, { name, cardNumbers }] of emailMap.entries()) {
      const cardList = cardNumbers
        .sort((a, b) => a - b)
        .map((n) => `#${String(n).padStart(6, "0")}`)
        .join(", ");

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f7ff; padding: 24px; border-radius: 12px;">
          <div style="background: #1e1b4b; padding: 20px 24px; border-radius: 8px 8px 0 0; border-bottom: 3px solid #facc15;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${eventName}</h1>
            <p style="color: #c4b5fd; margin: 6px 0 0; font-size: 14px;">Acompanhe o sorteio em tempo real</p>
          </div>
          <div style="background: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
            <p style="font-size: 15px; color: #1e293b;">Olá, <strong>${name}</strong>!</p>
            <p style="font-size: 14px; color: #475569;">O sorteio do evento <strong>${eventName}</strong> está acontecendo. Acompanhe seus números em tempo real!</p>
            <p style="font-size: 13px; color: #64748b;">Suas cartelas: <strong>${cardList}</strong></p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${trackingUrl}"
                 style="background: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
                Acompanhar Sorteio
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              Ou acesse: <a href="${trackingUrl}" style="color: #7c3aed;">${trackingUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              Você está recebendo este e-mail porque comprou cartelas para o evento ${eventName}.<br/>
              Digite seu telefone no site para encontrar suas cartelas.
            </p>
          </div>
        </div>
      `;

      try {
        await hercules.email.send({
          from: args.senderEmail,
          to: email,
          subject: `O sorteio de ${eventName} começou! Acompanhe seus números`,
          html,
          text: `Olá ${name}! O sorteio de ${eventName} está acontecendo. Suas cartelas: ${cardList}. Acesse: ${trackingUrl}`,
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed, skipped: cards.length - emailMap.size };
  },
});
