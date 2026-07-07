import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * 📋 QUERY: Listar todos os lotes de cartelas gerados
 */
export const list = query({
  args: {},
  handler: async (ctx: any) => {
    return await ctx.db
      .query("batches" as any)
      .order("desc")
      .collect();
  },
});

/**
 * 🚀 MUTATION: Fabricar Cartelas em Massa direto para o Estoque Central
 */
export const createBatch = mutation({
  args: v.any(),
  handler: async (ctx: any, args: any) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError("O sorteio mestre selecionado não foi localizado.");
    }

    const startNum = Number(args.startNumber);
    const endNum = Number(args.endNumber);

    const existingBatches = await ctx.db
      .query("batches" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .collect();

    for (const b of existingBatches) {
      const conflitoInicio = startNum >= b.startNumber && startNum <= b.endNumber;
      const conflitoFim = endNum >= b.startNumber && endNum <= b.endNumber;
      const conflitoEnvolve = startNum <= b.startNumber && endNum >= b.endNumber;

      if (conflitoInicio || conflitoFim || conflitoEnvolve) {
        throw new ConvexError(
          `Intervalo Inválido! A sequência de #${startNum} a #${endNum} conflita com um lote existente.`
        );
      }
    }

    const batchId = await ctx.db.insert("batches" as any, {
      eventId: args.eventId,
      startNumber: startNum,
      endNumber: endNum,
      vendorId: null,
      vendorName: "Estoque Central",
      createdAt: Date.now(),
    });

    const totalEmitir = endNum - startNum + 1;
    for (let i = 0; i < totalEmitir; i++) {
      const numeroSequencial = startNum + i;
      const dezenasCartela = generateBingoMatrix();

      await ctx.db.insert("cards" as any, {
        eventId: args.eventId,
        batchId: batchId,
        userId: "ESTOQUE-CENTRAL", 
        numbers: dezenasCartela,
        serialNumber: `CRT-${numeroSequencial.toString().padStart(4, "0")}`,
        createdAt: Date.now(),
      });
    }

    return batchId;
  },
});

/**
 * 📦 MUTATION: Transferir com Movimentação Limpa (Suma da Origem e Vai Pro Destino)
 * Divide e atualiza o card de histórico original para refletir a nova posse real
 */
export const transferToVendor = mutation({
  args: {
    eventId: v.string(),
    startNumber: v.number(),
    endNumber: v.number(),
    vendorId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) {
      throw new ConvexError("O cambista destinatário não foi localizado no servidor.");
    }

    // 1. Busca todas as cartelas desse evento
    const cartelasDoEvento = await ctx.db
      .query("cards" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .collect();

    // 2. Filtra as cartelas do intervalo pedido
    const selecionadas = cartelasDoEvento.filter((c: any) => {
      const numeroRef = Number(c.serialNumber.replace("CRT-", ""));
      return numeroRef >= args.startNumber && numeroRef <= args.endNumber;
    });

    if (selecionadas.length === 0) {
      throw new ConvexError(`Nenhuma cartela localizada no intervalo de #${args.startNumber} a #${args.endNumber}.`);
    }

    // 3. Atualiza o dono de cada cartela individual para o ID do cambista
    for (const card of selecionadas) {
      await ctx.db.patch(card._id, { userId: args.vendorId });
    }

    // 4. 🧮 ENGENHARIA DE ATUALIZAÇÃO DO HISTÓRICO VISUAL
    // Localiza os lotes de histórico cadastrados para o evento
    const todosLotes = await ctx.db
      .query("batches" as any)
      .filter((q: any) => q.eq(q.field("eventId"), args.eventId))
      .collect();

    // Encontra o lote do Estoque Central que engloba esse intervalo que você está transferindo
    const loteOrigem = todosLotes.find((l: any) => 
      l.vendorId === null && 
      args.startNumber >= l.startNumber && 
      args.endNumber <= l.endNumber
    );

    if (loteOrigem) {
      // Se você transferiu o lote inteiro perfeitamente (Ex: gerou 1 a 100 e transferiu 1 a 100)
      if (args.startNumber === loteOrigem.startNumber && args.endNumber === loteOrigem.endNumber) {
        // Apenas muda o nome do portador no card existente! (Ela some do Estoque Central na hora)
        await ctx.db.patch(loteOrigem._id, {
          vendorId: args.vendorId,
          vendorName: `Transf: ${vendor.name}`
        });
      } else {
        // Se foi uma transferência parcial (Ex: gerou 1 a 500, e transferiu 1 a 200)
        // Reduz o tamanho do lote que sobrou no Estoque Central
        await ctx.db.patch(loteOrigem._id, {
          startNumber: args.endNumber + 1 // O Estoque Central agora começará de 201 a 500
        });

        // E cria um card limpo apenas para a fração que foi para o vendedor
        await ctx.db.insert("batches" as any, {
          eventId: args.eventId,
          startNumber: args.startNumber,
          endNumber: args.endNumber,
          vendorId: args.vendorId,
          vendorName: `Transf: ${vendor.name}`,
          createdAt: Date.now(),
        });
      }
    } else {
      // Caso não ache o lote mestre, cria o registro isolado por contingência
      await ctx.db.insert("batches" as any, {
        eventId: args.eventId,
        startNumber: args.startNumber,
        endNumber: args.endNumber,
        vendorId: args.vendorId,
        vendorName: `Transf: ${vendor.name}`,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * 🗑️ MUTATION: Excluir Lote Comercial
 */
export const deleteBatch = mutation({
  args: { batchId: v.id("batches" as any) },
  handler: async (ctx: any, args: any) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) throw new ConvexError("Lote não localizado.");
    
    const cardsDoLote = await ctx.db
      .query("cards" as any)
      .filter((q: any) => q.eq(q.field("batchId"), args.batchId))
      .collect();

    for (const card of cardsDoLote) {
      await ctx.db.delete(card._id);
    }
    await ctx.db.delete(args.batchId);
    return { success: true };
  },
});

function generateBingoMatrix(): number[] {
  const matrix: number[] = [];
  const ranges = [{ min: 1, max: 15 }, { min: 16, max: 30 }, { min: 31, max: 45 }, { min: 46, max: 60 }, { min: 61, max: 75 }];
  for (let col = 0; col < 5; col++) {
    const range = ranges[col]; const colNumbers: number[] = []; const countNeeded = col === 2 ? 4 : 5;
    while (colNumbers.length < countNeeded) {
      const num = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      if (!colNumbers.includes(num)) colNumbers.push(num);
    }
    matrix.push(...colNumbers.sort((a, b) => a - b));
  }
  return matrix;
}
