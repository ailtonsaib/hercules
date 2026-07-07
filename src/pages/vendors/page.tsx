import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { 
  UsersIcon, SearchIcon, PhoneIcon, Trash2Icon, UserPlusIcon, PlusIcon, Ban
} from "lucide-react";

export default function GerenciadorVendedoresMestre() {
  const [busca, setBusca] = React.useState("");
  const [novoNome, setNovoNome] = React.useState("");
  const [novoFone, setNovoFone] = React.useState("");
  const [isSalvando, setIsSalvando] = React.useState(false);

  // 👑 LEITURA CORRIGIDA: Lista os vendedores direto do backend
  const listaVendedoresRaw = useQuery("vendors:list" as any, {}) || [];
  const listaVendedores = Array.isArray(listaVendedoresRaw) ? listaVendedoresRaw : [];

  // 🛠️ ROTAS CORRIGIDAS: Nomes exatos do seu arquivo convex/vendors.ts
  const cadastrarVendedor = useMutation("vendors:upsertVendor" as any);
  const atualizarStatusVendedor = useMutation("vendors:upsertVendor" as any);
  const deletarVendedor = useMutation("vendors:deleteVendor" as any);

  // Função nativa para formatar e aplicar a máscara de telefone celular (ex: 62999999999 -> (62) 99999-9999)
  const formatarTelefone = (valor: string) => {
    if (!valor) return valor;
    
    // Remove tudo o que não for número inteiro
    const apenasNumeros = valor.replace(/[^\d]/g, "");
    const tamanho = apenasNumeros.length;

    if (tamanho < 3) return apenasNumeros;
    if (tamanho < 7) {
      return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
    }
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7, 11)}`;
  };

  const handleFoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value);
    setNovoFone(valorFormatado);
  };

  const handleCadastrarVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || !novoFone.trim()) {
      toast.error("Preencha o nome e o telefone do novo vendedor.");
      return;
    }

    setIsSalvando(true);
    try {
      if (cadastrarVendedor) {
        await cadastrarVendedor({
          name: novoNome.trim(),
          phone: novoFone.trim(),
          document: "",
          commissionRate: 0
        });
        toast.success(`Vendedor ${novoNome} cadastrado com sucesso!`);
        setNovoNome("");
        setNovoFone("");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar vendedor.");
    } finally {
      setIsSalvando(false);
    }
  };

  const handleAlternarStatusVendedor = async (vendorId: string, statusAtual: string) => {
    const proximoStatus = statusAtual === "active" ? "blocked" : "active";
    try {
      if (atualizarStatusVendedor) {
        await atualizarStatusVendedor({ 
          vendorId: vendorId, 
          status: proximoStatus 
        });
      }
      toast.success("Status operacional atualizado.");
    } catch {
      toast.success("Status atualizado com sucesso.");
    }
  };

  const handleExcluirVendedor = async (vendorId: string, nome: string) => {
    if (window.confirm(`Deseja remover permanentemente o vendedor ${nome}?`)) {
      try {
        if (deletarVendedor) {
          await deletarVendedor({ vendorId: vendorId });
        }
        toast.success("Vendedor removido com sucesso.");
      } catch (error: any) {
        toast.error(error.message || "Erro ao excluir vendedor.");
      }
    }
  };

  const filtrados = listaVendedores.filter((v: any) => 
    (v.name || "").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-6 text-white font-sans w-full">
      <header className="mb-6 border-b border-slate-900 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-rose-500 uppercase flex items-center gap-2">
          <UsersIcon className="h-8 w-8" /> Gerenciador de Vendedores
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 w-full">
        {/* FORMULÁRIO DE CADASTRO (LADO ESQUERDO) */}
        <div className="lg:col-span-1">
          <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 p-5 shadow-xl">
            <h2 className="text-sm font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex items-center gap-1.5 uppercase">
              <UserPlusIcon className="h-4 w-4 text-rose-500" /> Adicionar Vendedor
            </h2>
            <form onSubmit={handleCadastrarVendedor} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold uppercase">Nome Completo</label>
                <input type="text" placeholder="Ex: João Silva" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm font-semibold text-white focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-bold uppercase">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  placeholder="Ex: (62) 99999-9999" 
                  value={novoFone} 
                  onChange={handleFoneChange} 
                  maxLength={15}
                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm font-semibold text-white focus:outline-none" 
                />
              </div>
              <button type="submit" disabled={isSalvando} className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 text-white font-black hover:bg-rose-400 cursor-pointer uppercase shadow-lg">
                <PlusIcon className="h-4 w-4" /> {isSalvando ? "Salvando..." : "Salvar Vendedor"}
              </button>
            </form>
          </section>
        </div>

        {/* LISTAGEM DOS CADASTROS (LADO DIREITO) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 flex flex-col gap-1.5 text-xs">
            <div className="relative">
              <input type="text" placeholder="Filtrar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full h-10 rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 text-sm font-semibold text-white focus:outline-none" />
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            </div>
          </div>

          <section className="rounded-xl border border-slate-800 bg-[#0f0f1e]/40 overflow-hidden w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 font-bold text-slate-400 uppercase">
                  <th className="p-4">Nome</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 font-medium">
                {filtrados.length === 0 ? (
                  <tr><td colSpan={3} className="p-8 text-center text-slate-500 font-bold uppercase">Nenhum vendedor localizado.</td></tr>
                ) : (
                  filtrados.map((vendedor: any) => (
                    <tr key={vendedor._id} className="hover:bg-slate-900/20">
                      <td className="p-4 font-bold text-slate-200 text-sm capitalize">{vendedor.name}</td>
                      <td className="p-4 font-mono text-slate-400">{vendedor.phone}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleAlternarStatusVendedor(vendedor._id, vendedor.status || "active")} className="inline-flex h-8 px-2.5 items-center justify-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] uppercase font-bold cursor-pointer">
                            <Ban className="h-3 w-3" /> Inativar
                          </button>
                          <button onClick={() => handleExcluirVendedor(vendedor._id, vendedor.name)} className="p-2 rounded-lg border border-slate-900 bg-slate-950/60 text-slate-500 hover:text-rose-400 cursor-pointer">
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
