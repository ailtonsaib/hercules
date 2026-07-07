import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📋 QUERY: Listar todos os templates de cartela cadastrados
 */
export const list = query({
  args: {},
  handler: async (ctx: any) => {
    // Busca os templates usando coerção de tipo para ignorar travas do schema
    return await ctx.db
      .query("cardTemplates" as any)
      .order("desc")
      .collect();
  },
});

/**
 * 🎨 MUTATION: Criar uma nova matriz/template de cartela
 * Gera as combinações numéricas do Bingo (Geralmente 24 números + centro livre)
 */
export const create = mutation({
  args: {
    name: v.string(),
    numbers: v.array(v.number()), // Lista contendo os números da cartela
  },
  handler: async (ctx: any, args) => {
    // Validação de segurança simples para o tamanho da matriz (ex: 24 ou 25 números)
    if (args.numbers.length < 24) {
      throw new ConvexError("Uma cartela de bingo válida precisa de pelo menos 24 dezenas.");
    }

    // Insere a nova matriz dinamicamente na tabela
    const templateId = await ctx.db.insert("cardTemplates" as any, {
      name: args.name,
      numbers: args.numbers,
      createdAt: Date.now(),
    });

    return templateId;
  },
});

/**
 * 🔍 QUERY: Buscar um template específico por ID
 */
export const getById = query({
  args: { templateId: v.id("cardTemplates" as any) },
  handler: async (ctx: any, args) => {
    return await ctx.db.get(args.templateId);
  },
});
