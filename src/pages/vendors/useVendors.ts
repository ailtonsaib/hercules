import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export function useVendors() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [document, setDocument] = React.useState("");
  const [commissionRate, setCommissionRate] = React.useState("10");
  const [phone, setPhone] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Escuta os vendedores salvos na nuvem Convex
  const listaVendedores = useQuery((api as any).vendors.list) || [];
  
  // Mutações do backend
  const salvarVendedor = useMutation((api as any).vendors.upsertVendor);
  const removerVendedor = useMutation((api as any).vendors.deleteVendor);

  // 🎭 MÁSCARA INTELIGENTE EM TEMPO REAL: DETECTA CPF OU CNPJ
  const handleDocumentChange = (val: string) => {
    const clean = val.replace(/\D/g, ""); // Remove tudo que não for número
    
    if (clean.length <= 11) {
      // Formatação Padrão CPF: 000.000.000-00
      let masked = clean;
      if (clean.length > 3) masked = `${clean.substring(0, 3)}.${clean.substring(3)}`;
      if (clean.length > 6) masked = `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6)}`;
      if (clean.length > 9) masked = `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-${clean.substring(9, 11)}`;
      setDocument(masked);
    } else if (clean.length <= 14) {
      // Transforma em CNPJ se passar de 11 dígitos: 00.000.000/0000-00
      let masked = `${clean.substring(0, 2)}.${clean.substring(2, 5)}.${clean.substring(5, 8)}/${clean.substring(8, 12)}-${clean.substring(12, 14)}`;
      setDocument(masked);
    }
  };

  // Aplica máscara de telefone (XX) XXXXX-XXXX em tempo real
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      let masked = clean;
      if (clean.length > 2) masked = `(${clean.substring(0, 2)}) ${clean.substring(2)}`;
      if (clean.length > 7) masked = `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7, 11)}`;
      setPhone(masked);
    }
  };

  const handleSalvarVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome do cambista é obrigatório.");
      return;
    }

    setIsLoading(true);
    try {
      await salvarVendedor({
        vendorId: selectedId || undefined,
        name: name.trim(),
        document: document.trim() || undefined,
        commissionRate: Number(commissionRate) || 0,
        phone: phone.trim() || undefined,
      });

      toast.success(selectedId ? "Cambista alterado com sucesso!" : "Cambista incluído com sucesso!");
      handleLimpar();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao processar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCarregarParaEditar = (vendedor: any) => {
    setSelectedId(vendedor._id);
    setName(vendedor.name);
    setDocument(vendedor.document || "");
    setCommissionRate(String(vendedor.commissionRate));
    setPhone(vendedor.phone || "");
  };

  const handleLimpar = () => {
    setSelectedId(null);
    setName("");
    setDocument("");
    setCommissionRate("10");
    setPhone("");
  };

  const handleExcluirVendedor = async (vendorId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Impede o card de abrir para edição ao clicar na lixeira
    if (!window.confirm("Deseja realmente remover este cambista do sistema?")) return;

    try {
      await removerVendedor({ vendorId });
      toast.success("Cambista excluído com sucesso!");
      if (selectedId === vendorId) handleLimpar();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao tentar excluir.");
    }
  };

  return {
    selectedId, name, setName, document, handleDocumentChange, commissionRate, setCommissionRate,
    phone, handlePhoneChange, isLoading, handleSalvarVendedor, handleExcluirVendedor,
    handleCarregarParaEditar, handleLimpar, listaVendedores
  };
}
