import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 🔑 MUTATION: Login de Usuário (Valida comuns e Administrador Mestre)
 */
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const usernameClean = args.username.toLowerCase().trim();

    // 1. Validação Mestre para o Administrador Supremo
    if (usernameClean === "admin" && args.password === "admin123") {
      let adminUser = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", "admin"))
        .first();

      let targetAdminId = adminUser?._id;

      // Se o admin não existir no banco (banco limpo), ele é gerado automaticamente aqui
      if (!adminUser) {
        const adminId = await ctx.db.insert("users", {
          name: "Administrador Geral",
          username: "admin",
          password: "admin123",
          role: "admin", // Define o papel que libera o acesso total
          createdAt: Date.now(),
        });
        adminUser = await ctx.db.get(adminId);
        targetAdminId = adminId;
      }

      // Cria a sessão segura para o Admin com duração de 7 dias
      const token = "session_admin_" + Math.random().toString(36).substring(2);
      await ctx.db.insert("sessions", {
        userId: targetAdminId!,
        token,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });

      return { token, user: adminUser };
    }

    // 2. Fluxo Normal para Usuários Comuns cadastrados
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", usernameClean))
      .first();

    if (!user || user.password !== args.password) {
      throw new ConvexError("Usuário ou senha incorretos.");
    }

    const token = "session_user_" + Math.random().toString(36).substring(2);
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    return { token, user };
  },
});
