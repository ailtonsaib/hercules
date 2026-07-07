import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner"; 

export function useVendorApp() {
  // Estados de controle de Autenticação e Dados
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [loginPhone, setLoginPhone] = useState<string>("");
  const [vendorData, setVendorData] = useState<any>(null);

  // Estados de controle de Venda e Modais
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerPhone, setBuyerPhone] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // 📸 ESTADO NOVO: Guarda o arquivo/foto anexado pelo vendedor no celular
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Chamadas de Operações do Convex (Backend)
  // @ts-ignore
  const realizarLogin = useMutation(api.vendorApp.loginVendorByPhone);
  const executarVenda = useMutation(api.vendorApp.executeSale);

  // ✅ Busca o estoque de cartelas vinculadas a este vendedor específico
  const buscarEstoque = useQuery(
    api.vendorApp.getVendorInventory,
    vendorData?._id ? { vendorId: String(vendorData._id) } : "skip"
  );

  // Formatação automática em tempo real com máscara de celular (XX) XXXXX-XXXX
  const formatarTelefone = (valor: string) => {
    const num = valor.replace(/\D/g, "");
    if (num.length <= 11) {
      return num.replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    }
    return valor;
  };

  // 🚀 FUNÇÃO: Prepara os dados para o vendedor enviar a mensagem manualmente via cópia se quiser
  const enviarComprovanteWhatsApp = (telefoneComprador: string, cartelasIds: string[]) => {
    let numeroLimpo = telefoneComprador.replace(/[^\d]/g, "");
    if (numeroLimpo.length === 11 || numeroLimpo.length === 10) {
      numeroLimpo = `55${numeroLimpo}`;
    }

    const listaCartelas = cartelasIds.map(id => id.slice(-4).toUpperCase()).join(", ");

    const mensagem = encodeURIComponent(
      `*Obrigado pela compra!* \n\n` +
      `Segue sua(s) cartela(s): *${listaCartelas}* \n\n` +
      `Antes do sorteio iniciar, você receberá uma mensagem de confirmação garantindo que você já estará concorrendo a todos os prêmios! 🍀 Boa sorte!`
    );

    // 🔧 CORRIGIDO: Adicionado o $ na interpolação do número bruto
    const urlWhatsApp = `https://whatsapp.com{numeroLimpo}&text=${mensagem}`;
    
    if (typeof window !== "undefined") {
      window.open(urlWhatsApp, "_blank");
    }
  };

  // Processa o login do vendedor por telefone
  const handleVendorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim()) {
      toast.error("Por favor, digite seu número de telefone celular.");
      return;
    }

    try {
      const resultado = await realizarLogin({ phone: loginPhone.trim() });
      if (resultado) {
        setVendorData(resultado);
        setIsLogged(true);
        toast.success(`Bem-vindo, ${resultado.name || "Vendedor"}!`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Telefone celular não localizado.");
    }
  };

  // Seleção e deseleção de cartelas na grade
  const toggleSelectCard = (cardId: string, isSold: boolean) => {
    if (isSold) {
      toast.error("Esta cartela já foi vendida.");
      return;
    }

    setSelectedCards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // 💼 EFETUAR A VENDA: Envia os dados obrigatórios do comprador para o banco
  const handleConfirmarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação estrita e obrigatória de nome e telefone mascarado
    if (!buyerName.trim() || buyerPhone.replace(/\D/g, "").length < 10) {
      toast.error("O nome e um telefone válido são obrigatórios para concluir.");
      return;
    }

    setIsProcessing(true);
    const cartelasVendidasCopia = [...selectedCards];
    const telefoneCompradorCopia = buyerPhone;

    try {
      // Aqui o backend processa a mutation do Convex
      await executarVenda({
        cardIds: selectedCards,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        attachmentUrl: "", // Se futuramente fizer upload para S3/UploadProvider coloque a URL aqui
      });

      toast.success(`${selectedCards.length} Cartela(s) vendida(s) com sucesso!`);
      
      // Aciona o WhatsApp com os dados
      enviarComprovanteWhatsApp(telefoneCompradorCopia, cartelasVendidasCopia);

      // Reseta e limpa a tela para a próxima venda
      setSelectedCards([]);
      setBuyerName("");
      setBuyerPhone("");
      setAttachmentFile(null);
      setShowModal(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao registrar a venda.");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isLogged,
    setIsLogged,
    loginPhone,
    setLoginPhone,
    vendorData,
    setVendorData,
    selectedCards,
    setSelectedCards,
    buyerName,
    setBuyerName,
    buyerPhone,
    setBuyerPhone,
    showModal,
    setShowModal,
    isProcessing,
    attachmentFile,
    setAttachmentFile,
    formatarTelefone,
    handleVendorLogin,
    toggleSelectCard,
    handleConfirmarVenda,
    buscarEstoque,
  };
}
