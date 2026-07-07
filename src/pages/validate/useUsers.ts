import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";

export function useUsers() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Escuta os usuários cadastrados (comunidade de jogadores)
  const todosUsuarios = useQuery((api as any).users.listUsers) || [];
  const salvarUsuario = useMutation((api as any).users.upsertCommonUser);
  const removerUsuario = useMutation((api as any).users.deleteCommonUser);

  // Máscara de telefone síncrona
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      let masked = clean;
      if (clean.length > 2) masked = `(${clean.substring(0, 2)}) ${clean.substring(2)}`;
      if (clean.length > 7) masked = `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7, 11)}`;
      setPhone(masked);
    }
  };

  const handleSalvarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome do usuário é obrigatório.");
      return;
    }

    setIsLoading(true);
    try {
      await salvarUsuario({
        userId: selectedId || undefined,
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        // O IP agora é omitido aqui porque o backend mestre vai capturar sozinho!
      });

      toast.success(selectedId ? "Usuário alterado com sucesso!" : "Usuário incluído com sucesso!");
      handleLimpar();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao processar dados.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCarregarParaEditar = (usuario: any) => {
    setSelectedId(usuario._id);
    setName(usuario.name);
    setAddress(usuario.address || "");
    setPhone(usuario.phone || "");
  };

  const handleLimpar = () => {
    setSelectedId(null);
    setName("");
    setAddress("");
    setPhone("");
  };

  const handleExcluirUsuario = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Deseja realmente remover este usuário jogador do sistema?")) return;

    try {
      await removerUsuario({ userId });
      toast.success("Usuário removido com sucesso!");
      if (selectedId === userId) handleLimpar();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao tentar excluir.");
    }
  };

  return {
    selectedId, name, setName, address, setAddress, phone, handlePhoneChange,
    isLoading, handleSalvarUsuario, handleExcluirUsuario,
    handleCarregarParaEditar, handleLimpar, todosUsuarios
  };
}
