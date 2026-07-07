import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * MUTATION: Cadastro de Usuários Comuns
 */
export const register = mutation({
  args: {
    name: v.string(),
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Verifica se o nome de usuário já existe no banco
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingUser) {
      throw new ConvexError("Este nome de usuário já está em uso.");
    }

    // Cria o usuário padrão (sempre com a role "user")
    const userId = await ctx.db.insert("users", {
      name: args.name,
      username: args.username.toLowerCase().trim(),
      password: args.password, // Em produção real, recomenda-se aplicar hash
      role: "user",
      createdAt: Date.now(),
    });

    return userId;
  },
});

/**
 * MUTATION: Login de Usuário (Valida comuns e Administrador)
 */
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const usernameClean = args.username.toLowerCase().trim();

    // 1. Regra de Ouro: Validação do Administrador Supremo via Código
    // Se o usuário digitar as credenciais mestre abaixo, ele ganha acesso admin absoluto
    if (usernameClean === "admin" && args.password === "admin123") {
      // Procura se o admin já existe no banco para não duplicar ID
      let adminUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", "admin"))
        .first();

      if (!adminUser) {
        const adminId = await ctx.db.insert("users", {
          name: "Administrador Geral",
          username: "admin",
          password: "admin123",
          role: "admin", // Liberará todas as travas do site
          createdAt: Date.now(),
        });
        adminUser = await ctx.db.get(adminId);
      }

      // Gera um token de sessão mestre para o Admin
      const token = "session_admin_" + Math.random().toString(36).substring(2);
      await ctx.db.insert("sessions", {
        userId: adminUser!._id,
        token,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // Expira em 7 dias
      });

      return { token, user: adminUser };
    }

    // 2. Fluxo de Validação de Usuários Comuns cadastrados
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameClean))
      .first();

    if (!user || user.password !== args.password) {
      throw new ConvexError("Usuário ou senha incorretos.");
    }

    // Gera um token de sessão para o usuário comum
    const token = "session_user_" + Math.random().toString(36).substring(2);
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    return { token, user };
  },
});

/**
 * QUERY: Obter o Usuário Logado Atual (Usado pelo frontend para manter a sessão ativa)
 */
export const getCurrentUser = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return null;

   const session = await ctx.db
  .query("sessions")
  .withIndex("by_token", (q) => q.eq("token", args.token!)) // O caractere '!' avisa o TS que o token não é nulo
  .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    return await ctx.db.get(session.userId);
  },
});
