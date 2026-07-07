import React from "react";

interface CartelaPrintProps {
  evento: {
    title: string;
    localName?: string;
    address?: string;
    city?: string;
    eventDate?: string;
    eventTime?: string;
    cardValue: number;
    chanceType: string; // "unica", "dupla" ou "tripla"
    prizes: string[];
  };
  cartela: {
    serialNumber: string;
    numbersChance1: number[];
    numbersChance2?: number[];
    numbersChance3?: number[];
  };
}

export default function ModeloCartelaImpressao({ evento, cartela }: CartelaPrintProps) {
  const valorFormatado = ((evento.cardValue || 0) / 100).toFixed(2);
  const numeroCartela = cartela.serialNumber.replace("CRT-", "").padStart(6, "0");
  
  const isChanceMaior = evento.chanceType === "dupla" || evento.chanceType === "tripla";
  const listaPremios = Array.isArray(evento.prizes) ? evento.prizes : [];

  const renderGradeNumeros = (numeros: number[]) => {
    if (!numeros || numeros.length < 20) return null;
    
    const linhas = [];
    for (let i = 0; i < 4; i++) {
      linhas.push(numeros.slice(i * 5, i * 5 + 5));
    }

    return (
      <div className="border-[1.5px] border-black bg-white select-none shadow-sm rounded-xl overflow-hidden box-border max-w-[165px] w-full">
        {/* Cabeçalho S O R T E */}
        <div className="grid grid-cols-5 border-b border-black bg-gray-50 text-center font-black tracking-widest text-black text-[11px] py-1">
          <span>S</span><span>O</span><span>R</span><span>T</span><span>E</span>
        </div>
        {/* Corpo dos Números */}
        <div className="flex flex-col">
          {linhas.map((linha, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-5 border-b last:border-b-0 border-black text-center">
              {linha.map((num, colIdx) => (
                <div 
                  key={colIdx} 
                  /* 👑 AMPLIAÇÃO ESTÉTICA DAS GRADES: Ajustado para 33px para ocupar melhor os espaços verticais da folha */
                  className="border-r last:border-r-0 border-black font-black text-black flex items-center justify-center h-[33px] w-full text-base box-border"
                >
                  {String(num).padStart(2, "0")}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0mm !important;
        }
        @media print {
          header, aside, nav, .no-print, [class*="sidebar"], [class*="Sidebar"] {
            display: none !important;
            width: 0px !important;
            height: 0px !important;
          }
          
          body, html {
            background: white !important;
            color: black !important;
            margin: 0mm !important;
            padding: 0mm !important;
          }

          .folha-a4 {
            display: flex !important;
            visibility: visible !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            margin: 0mm auto !important;
            padding: 10mm 12mm 12mm 12mm !important; 
            box-sizing: border-box !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Container da Folha Física A4 */}
      <div className="folha-a4 w-[210mm] h-[297mm] max-h-[297mm] bg-white text-black p-[10mm] px-[12mm] flex flex-col justify-between box-border mx-auto shadow-2xl border border-gray-200 print:border-0">
        
        {/* 1. CABEÇALHO DA CARTELA REAJUSTADO */}
        <div className="border-2 border-black rounded-xl p-3 bg-white w-full box-border relative flex items-center min-h-[85px]">
          <div className="w-[100px] shrink-0 no-print" aria-hidden="true"></div>
          
          <div className="flex-1 text-center px-2">
            <h1 className="text-xl font-black uppercase tracking-tight text-blue-900 leading-tight break-words">
              {evento.title || "Ação entre Amigos"}
            </h1>
            <p className="text-[10px] font-bold text-gray-700 mt-1 leading-relaxed break-words">
              Local: {evento.localName} • End.: {evento.address} - {evento.city} <br />
              Data: {evento.eventDate} às {evento.eventTime}
            </p>
          </div>
          
          {/* Quadro de valor à direita com margem interna de segurança */}
          <div className="border border-black p-1.5 text-center rounded-lg bg-gray-50 shrink-0 min-w-[95px] h-fit box-border mr-4">
            <span className="text-[9px] font-black uppercase text-gray-500 block tracking-wider">Valor</span>
            <span className="text-base font-black text-black block mt-0.5">R$ {valorFormatado}</span>
          </div>
        </div>

        {/* IDENTIFICADOR CENTRALIZADO */}
        <div className="flex justify-center items-center border-b border-dashed border-gray-400 pb-1.5">
          <span className="text-sm font-black text-black tracking-wide bg-gray-100/60 px-4 py-0.5 rounded-md border border-gray-200">
            Cartela Nº {numeroCartela}
          </span>
        </div>

        {/* 2. GRADES CENTRALIZADAS E ESTICADAS ESTETICAMENTE ENTRE CABEÇALHO E RODAPÉ */}
        <div className="flex-1 flex flex-col justify-center gap-[20px] box-border">
          
          {/* SEÇÃO PRINCIPAL: PRIMEIRA CHANCE */}
          <div className="space-y-1.5 flex flex-col items-center w-full box-border">
            <h2 className="text-xs font-black uppercase tracking-wider text-blue-950 border-b-2 border-blue-900 pb-0.5 text-center px-4 mb-1">
              Primeira Chance
            </h2>
            
            {/* 📱 GRADES E PRÊMIOS ACOPLADOS EM COLUNAS INDEPENDENTES */}
            <div className="grid grid-cols-3 gap-6 w-full justify-items-center">
              {/* GRADE 1 + PRÊMIO 1 */}
              <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                {renderGradeNumeros(cartela.numbersChance1)}
                <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                  1º Prê.: {listaPremios[0] || "Não Informado"}
                </span>
              </div>

              {/* GRADE 2 + PRÊMIO 2 */}
              <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                {renderGradeNumeros(cartela.numbersChance1)}
                <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                  2º Prê.: {listaPremios[1] || "Não Informado"}
                </span>
              </div>

              {/* GRADE 3 + PRÊMIO 3 */}
              <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                {renderGradeNumeros(cartela.numbersChance1)}
                <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                  3º Prê.: {listaPremios[2] || "Não Informado"}
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO OPCIONAL: SEGUNDA CHANCE */}
          {isChanceMaior && (
            <div className="space-y-1.5 pt-3.5 border-t border-dashed border-gray-300 flex flex-col items-center w-full box-border">
              <h2 className="text-xs font-black uppercase tracking-wider text-blue-950 border-b-2 border-blue-900 pb-0.5 text-center px-4 mb-1">
                Segunda Chance
              </h2>
              
              <div className="grid grid-cols-3 gap-6 w-full justify-items-center">
                {/* GRADE 1 + PRÊMIO 1 */}
                <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                  {renderGradeNumeros(cartela.numbersChance2 || cartela.numbersChance1)}
                  <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                    1º Prê.: {listaPremios[0] || "Não Informado"}
                  </span>
                </div>

                {/* GRADE 2 + PRÊMIO 2 */}
                <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                  {renderGradeNumeros(cartela.numbersChance2 || cartela.numbersChance1)}
                  <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                    2º Prê.: {listaPremios[1] || "Não Informado"}
                  </span>
                </div>

                {/* GRADE 3 + PRÊMIO 3 */}
                <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                  {renderGradeNumeros(cartela.numbersChance2 || cartela.numbersChance1)}
                  <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                    3º Prê.: {listaPremios[2] || "Não Informado"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SEÇÃO OPCIONAL: TERCEIRA CHANCE */}
          {evento.chanceType === "tripla" && (
            <div className="space-y-1.5 pt-3.5 border-t border-dashed border-gray-300 flex flex-col items-center w-full box-border">
              <h2 className="text-xs font-black uppercase tracking-wider text-blue-950 border-b-2 border-blue-900 pb-0.5 text-center px-4 mb-1">
                Terceira Chance
              </h2>
              
              <div className="grid grid-cols-3 gap-6 w-full justify-items-center">
                {/* GRADE 1 + PRÊMIO 1 */}
                <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                  {renderGradeNumeros(cartela.numbersChance3 || cartela.numbersChance1)}
                  <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                    1º Prê.: {listaPremios[0] || "Não Informado"}
                  </span>
                </div>

                {/* GRADE 2 + PRÊMIO 2 */}
                <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                  {renderGradeNumeros(cartela.numbersChance3 || cartela.numbersChance1)}
                  <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                    2º Prê.: {listaPremios[1] || "Não Informado"}
                  </span>
                </div>

                {/* GRADE 3 + PRÊMIO 3 */}
                <div className="flex flex-col items-center gap-1.5 w-full max-w-[165px]">
                  {renderGradeNumeros(cartela.numbersChance3 || cartela.numbersChance1)}
                  <span className="text-[9px] font-bold text-gray-900 text-center leading-tight break-words w-full">
                    3º Prê.: {listaPremios[2] || "Não Informado"}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 3. RODAPÉ / CANHOTO DO COMPRADOR - PERFEITAMENTE ACOMODADO E TRAVADO NA BASE */}
        <div className="border-t-2 border-black pt-3 mt-1 bg-white w-full box-border">
          <div className="flex flex-col gap-2.5 text-xs text-black w-full">
            <div className="flex gap-4 w-full">
              <div className="flex-1 flex items-center gap-1.5">
                <span className="font-bold text-gray-600 uppercase text-[9px] tracking-wider shrink-0">Comprador:</span>
                <div className="flex-1 border-b border-black h-4"></div>
              </div>
              <div className="w-1/3 flex items-center gap-1.5">
                <span className="font-bold text-gray-600 uppercase text-[9px] tracking-wider shrink-0">Fone:</span>
                <div className="flex-1 border-b border-black h-4"></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center gap-4 w-full">
              <div className="flex-1 flex items-center gap-1.5">
                <span className="font-bold text-gray-600 uppercase text-[9px] tracking-wider shrink-0">Endereço:</span>
                <div className="flex-1 border-b border-black h-4"></div>
              </div>
              <div className="shrink-0 text-right font-black text-sm text-black tracking-wide">
                Cartela Nº {numeroCartela}
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
