import React from "react";
import { LogOut, Camera, Image, CheckCircle2 } from "lucide-react";
import { useVendorApp } from "./useVendorApp";

export default function VendorDashboard() {
  const {
    isLogged,
    loginPhone,
    setLoginPhone,
    vendorData,
    selectedCards,
    buyerName,
    setBuyerName,
    buyerPhone,
    setBuyerPhone,
    showModal,
    setShowModal,
    isProcessing,
    attachmentFile,      // 📸 Estado de arquivo mapeado do hook
    setAttachmentFile,   // 📸 Modificador mapeado do hook
    formatarTelefone,
    handleVendorLogin,
    toggleSelectCard,
    handleConfirmarVenda,
    buscarEstoque,
  } = useVendorApp();

  // Converte o retorno do Convex em uma array iterável de forma segura
  const listaCartelas = Array.isArray(buscarEstoque) ? buscarEstoque : [];

  // 🔒 FLUXO DE LOGIN: Exibido caso o vendedor não esteja autenticado
  if (!isLogged) {
    return (
      <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col justify-center items-center p-6 font-sans max-w-md mx-auto">
        <div className="w-full bg-gray-950/60 border border-gray-800 p-6 rounded-2xl shadow-xl text-center">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">
            ACESSO RESTRITO
          </p>
          <h2 className="text-xl font-black mb-6 text-gray-100">Painel do Vendedor</h2>
          
          <form onSubmit={handleVendorLogin} className="space-y-4">
            <div className="text-left">
              <label className="text-xs font-bold text-gray-400 block mb-2 uppercase tracking-wide">
                Número de Celular
              </label>
              <input
                type="tel"
                placeholder="(62) 99999-9999"
                value={loginPhone}
                onChange={(e) => setLoginPhone(formatarTelefone(e.target.value))}
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 font-medium transition-colors"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-sm py-3 rounded-xl transition-all shadow-md shadow-amber-500/10"
            >
              Entrar no Estoque
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 🔓 FLUXO DO ESTOQUE MOBILE: Renderizado apenas se estiver logado com sucesso
  return (
    <div className="min-h-screen bg-[#0d0e12] text-white p-4 font-sans max-w-md mx-auto pb-8">
      
      {/* TOPO DO COMPONENTE - IDENTIFICAÇÃO COMO VENDEDOR */}
      <div className="flex justify-between items-center mb-5 border-b border-gray-800 pb-3">
        <div>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
            VENDEDOR AUTORIZADO
          </p>
          <h1 className="text-lg font-extrabold text-gray-100 capitalize">
            {vendorData?.name || "Vendedor"}
          </h1>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="p-2 bg-gray-900/60 hover:bg-red-950/40 text-gray-400 hover:text-red-400 rounded-full transition-colors border border-gray-800/80"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* STATUS DE SELEÇÃO ATUAL */}
      <button
        disabled={selectedCards.length === 0}
        onClick={() => setShowModal(true)}
        className={`w-full border rounded-xl p-3.5 text-center mb-5 text-xs transition-all block ${
          selectedCards.length === 0
            ? "bg-gray-950/40 border-dashed border-gray-800 text-gray-400 cursor-not-allowed"
            : "bg-amber-500 border-solid border-amber-500 text-gray-950 font-bold hover:bg-amber-600 animate-pulse"
        }`}
      >
        {selectedCards.length === 0 ? (
          <span>Nenhuma cartela selecionada para venda</span>
        ) : (
          <span>Registrar Venda de {selectedCards.length} Cartela(s) →</span>
        )}
      </button>

      {/* RÓTULO DA GRADE */}
      <div className="mb-3 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
        <span>Grade de Estoque ({listaCartelas.length})</span>
        <span className="text-amber-500/80">Toque para selecionar</span>
      </div>

      {/* 📱 GRADE COMPACTA EM 5 COLUNAS FIXAS PARA CELULAR */}
      <div className="grid grid-cols-5 gap-1.5 px-0.5 mb-6">
        {listaCartelas.map((card: any) => {
          const numeroPuro = card.serialNumber ? card.serialNumber.replace("CRT-", "").trim() : "";
          
          if (card.isSold) {
            return (
              <div
                key={card._id}
                className="relative bg-red-600/20 border border-red-900/60 rounded-md p-1.5 flex flex-col items-center justify-center aspect-square shadow-sm opacity-60"
              >
                <span className="text-xs font-black text-red-400 tracking-wide line-through">
                  {numeroPuro}
                </span>
                <span className="text-[7px] font-black text-red-500 uppercase tracking-tight mt-0.5">
                  Vendido
                </span>
              </div>
            );
          }

          const isSelected = selectedCards.includes(card._id);

          return (
            <button
              key={card._id}
              onClick={() => toggleSelectCard(card._id, !!card.isSold)}
              className={`border rounded-md p-1.5 flex flex-col items-center justify-center aspect-square transition-all font-bold ${
                isSelected
                  ? "bg-amber-500 border-amber-400 text-gray-950 scale-[1.02] shadow-sm shadow-amber-500/10"
                  : "bg-gray-900/40 border-gray-800/80 text-gray-300 hover:border-gray-700"
              }`}
            >
              <span className="text-xs font-black tracking-wide">
                {numeroPuro}
              </span>
              <span className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-gray-950' : 'bg-gray-600'}`} />
            </button>
          );
        })}
      </div>
      {/* MODAL SIMPLES PARA REGISTRO DE DADOS DO COMPRADOR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-950 border border-gray-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl my-auto">
            <h3 className="text-base font-black text-gray-100 mb-4 border-b border-gray-900 pb-2 uppercase tracking-wide text-center">
              Dados do Comprador
            </h3>
            
            <form onSubmit={handleConfirmarVenda} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">
                  Telefone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(formatarTelefone(e.target.value))}
                  placeholder="(62) 99999-9999"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* 📸 SEÇÃO DE COMPROVANTE / FOTO (OPCIONAL/MANDATÓRIO CONFORME REQUISITADO) */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1.5 uppercase tracking-wider">
                  Anexar Comprovante / Foto da Venda
                </label>
                
                <label className={`w-full h-24 border border-dashed rounded-xl flex flex-col justify-center items-center gap-1 cursor-pointer transition-colors ${
                  attachmentFile 
                    ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-400" 
                    : "bg-gray-900/60 border-gray-800 hover:border-gray-700 text-gray-400"
                }`}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" // Ativa a câmera traseira do celular de forma nativa
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachmentFile(e.target.files[0]);
                      }
                    }}
                    className="hidden" 
                  />
                  {attachmentFile ? (
                    <>
                      <CheckCircle2 size={24} className="text-emerald-400 animate-bounce" />
                      <span className="text-xs font-bold">Foto Carregada com Sucesso!</span>
                      <span className="text-[9px] text-emerald-500/70 truncate max-w-[200px]">{attachmentFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Camera size={22} className="text-gray-500" />
                      <span className="text-xs font-semibold">Tirar Foto ou Escolher Arquivo</span>
                      <span className="text-[9px] text-gray-600">Comprovante de pagamento</span>
                    </>
                  )}
                </label>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentFile(null);
                    setShowModal(false);
                  }}
                  className="flex-1 bg-gray-900 hover:bg-gray-850 text-gray-400 font-bold py-3 rounded-xl text-xs uppercase border border-gray-800/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-gray-950 font-black py-3 rounded-xl text-xs uppercase shadow-lg shadow-amber-500/10 transition-colors"
                >
                  {isProcessing ? "Processando..." : "Finalizar Venda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
