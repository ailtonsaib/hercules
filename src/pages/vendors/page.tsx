import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { UserPlus, Pencil, Trash2, Users, Phone } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";

type Vendor = Doc<"vendors">;

type FormState = { name: string; phone: string; notes: string };
const emptyForm: FormState = { name: "", phone: "", notes: "" };

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function VendorsPage() {
  const vendors = useQuery(api.vendors.list, {});
  const createVendor = useMutation(api.vendors.create);
  const updateVendor = useMutation(api.vendors.update);
  const removeVendor = useMutation(api.vendors.remove);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Id<"vendors"> | null>(null);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (v: Vendor) => { setEditing(v); setForm({ name: v.name, phone: v.phone ?? "", notes: v.notes ?? "" }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await updateVendor({ vendorId: editing._id, name: form.name, phone: form.phone || undefined, notes: form.notes || undefined });
        toast.success("Vendedor atualizado");
      } else {
        await createVendor({ name: form.name, phone: form.phone || undefined, notes: form.notes || undefined });
        toast.success("Vendedor cadastrado");
      }
      setShowForm(false);
    } catch (e) {
      if (e instanceof ConvexError) {
        const d = e.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: Id<"vendors">) => {
    try {
      await removeVendor({ vendorId: id });
      toast.success("Vendedor removido");
    } catch {
      toast.error("Erro ao remover vendedor");
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black text-foreground">Vendedores</h2>
          <p className="text-muted-foreground font-medium mt-1">Cadastro de vendedores de cartelas</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Novo Vendedor
        </Button>
      </div>

      {vendors === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : vendors.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>Nenhum vendedor cadastrado</EmptyTitle>
            <EmptyDescription>Cadastre vendedores para associar aos lotes de cartelas</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Cadastrar Vendedor
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {vendors.map((v) => (
            <div key={v._id} className="flex items-center gap-4 bg-card border rounded-xl px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{v.name}</p>
                {v.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {v.phone}
                  </p>
                )}
                {v.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => openEdit(v)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(v._id)} className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) setShowForm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Vendedor" : "Novo Vendedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: João Silva" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: applyPhoneMask(e.target.value) }))}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={() => void handleSave()} disabled={saving || !form.name.trim()}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover vendedor?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita. Os lotes já gerados para este vendedor não serão afetados.</p>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmDelete && void handleDelete(confirmDelete)}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
