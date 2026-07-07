import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📲 QUERY: Efetuar Login do Cambista via Número de Celular
 */
export const loginVendorByPhone = mutation({
  args: { phone: v.string() },
  handler: async (ctx: any, args: any) => {
    const digitadoApenasNumeros = args.phone.replace(/\D/g, "");
    const vendors = await ctx.db.query("vendors" as any).collect();
    
    const vendorLocalizado = vendors.find((v: any) => {
      const bancoApenasNumeros = String(v.phone || "").replace(/\D/g, "");
      return bancoApenasNumeros === digitadoApenasNumeros;
    });

    if (!vendorLocalizado) {
      throw new ConvexError("Telefone não cadastrado na rede de vendedores oficial.");
    }
    
    return vendorLocalizado;
  },
});

/**
 * 🎫 QUERY: Listar Cartelas do Cambista (Ordenação Inteligente)
 */
export const getVendorInventory = query({
  args: { vendorId: v.string() },
  handler: async (ctx: any, args: any) => {
    const allCards = await ctx.db.query("cards" as any).collect();
    const inventory = allCards.filter((c: any) => c.userId === args.vendorId);

    return inventory.sort((a: any, b: any) => {
      const soldA = a.isSold ? 1 : 0;
      const soldB = b.isSold ? 1 : 0;
      return soldA - soldB;
    });
  },
});

/**
 * 🤝 MUTATION: Confirmar e Selar a Venda das Cartelas em Lote
 */
export const executeSale = mutation({
  args: v.any(), 
  handler: async (ctx: any, args: any) => {
    const cardIds = args.cardIds || [];
    if (cardIds.length === 0) {
      throw new ConvexError("Nenhuma cartela selecionada para efetivar a venda.");
    }

    for (const id of cardIds) {
      const card = await ctx.db.get(id as any);
      if (!card) continue;

      if (card.isSold) {
        throw new ConvexError(`Atenção! A cartela ${card.serialNumber} já consta como vendida.`);
      }

      let safeAttachmentUrl = "";
      if (args.attachmentUrl && typeof args.attachmentUrl === "string") {
        safeAttachmentUrl = args.attachmentUrl.trim();
      }

      const updateData: any = {
        isSold: true,
        buyerName: String(args.buyerName || "Comprador").trim(),
        buyerPhone: String(args.buyerPhone || "").trim(),
        attachmentUrl: safeAttachmentUrl, 
        soldAt: Date.now(),
      };

      await ctx.db.patch(card._id, updateData);
    }

    return { success: true, count: cardIds.length };
  },
});
