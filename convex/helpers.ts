import { ConvexError } from "convex/values";

/**
 * 🔒 HELPER: Validar Sessão Local e Nível de Acesso (Admin)
 * Substitui as checagens antigas do Clerk e garante auditoria por token local.
 */
export async function validateAdminSession(ctx: any, token: string) {
  if (!token) {
    throw new ConvexError("Sessão inválida ou token não fornecido.");
  }

  // 1. Busca a sessão ativa na tabela local
  const session = await ctx.db
    .query("sessions" as any)
    .filter((q: any) => q.eq(q.field("token"), token))
    .first();

  if (!session || (session as any).expiresAt < Date.now()) {
    throw new ConvexError("Sessão expirada. Por favor, faça login novamente.");
  }

  // 2. Busca o usuário vinculado e valida o privilégio mestre
  const user = await ctx.db.get(session.userId);
  if (!user || (user as any).role !== "admin") {
    throw new ConvexError("Ação restrita. Apenas administradores mestre possuem autorização.");
  }

  return user;
}

/**
 * 🎰 HELPER: Gerar Matriz Aleatória de Bingo (Cartela Padrão 5x5)
 * Cria 24 dezenas numéricas únicas respeitando as colunas clássicas (B-I-N-G-O)
 */
export function generateBingoMatrix(): number[] {
  const matrix: number[] = [];
  
  const ranges = [
    { min: 1, max: 15 },   // B
    { min: 16, max: 30 },  // I
    { min: 31, max: 45 },  // N (terá 4 números devido ao centro livre)
    { min: 46, max: 60 },  // G
    { min: 61, max: 75 }   // O
  ];

  for (let col = 0; col < 5; col++) {
    const range = ranges[col];
    const colNumbers: number[] = [];
    const countNeeded = col === 2 ? 4 : 5; // A coluna N pula o centro (FREE)

    while (colNumbers.length < countNeeded) {
      const num = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      if (!colNumbers.includes(num)) {
        colNumbers.push(num);
      }
    }
    
    matrix.push(...colNumbers.sort((a, b) => a - b));
  }

  return matrix;
}
