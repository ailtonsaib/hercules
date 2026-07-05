"use client";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileDown, Ticket, Trophy, CheckCircle, XCircle, ImageIcon, Upload } from "lucide-react";
import { gerarBilhetesPDF as generateRifaPDF } from "./_lib/generate-rifa-pdf.ts";
import type { Id } from "@/convex/_generated/dataModel.js";
import { ConvexError } from "convex/values";
import { cn } from "@/lib/utils.ts";

type Prize = { position: number; description: string };
type PlanKey = "free" | "basic" | "pro" | "max";

const PLAN_LABELS: Record<PlanKey, string> = {
  free: "Gratuito",
  basic: "BASIC",
  pro: "PRO",
  max: "MAX",
};

const PRIZE_EMOJI = ["🥇", "🥈", "🥉", "4º", "5º"];

const TICKETS_OPTIONS = [4, 6, 10] as const;

type TicketsPerPage = (typeof TICKETS_OPTIONS)[number];

type RifaDoc = {
  _id: Id<"rifas">;
  name: string;
  description?: string;
  date: string;
  time?: string;
  location?: string;
  address?: string;
  phone?: string;
  totalNumbers: number;
  ticketPrice?: number;
  prizes?: Prize[];
  status: "active" | "finished";
  planRequired?: PlanKey;
  imageStorageId?: string;
  createdAt: string;
};

const EMPTY_FORM = {
  name: "",
  description: "",
  date: "",
  time: "",
  location: "",
  address: "",
  phone: "",
  totalNumbers: 100,
  ticketPrice: "",
  planRequired: "free" as PlanKey,
  status: "active" as "active" | "finished",
};

function RifaImage({ storageId }: { storageId: string }) {
  const url = useQuery(api.rifas.getImageUrl, { storageId: storageId as Id<"_storage"> });
  if (!url) return null;
  return <img src={url} alt="Rifa" className="w-full h-36 object-cover" />;
}

function RifasPageInner() {
  const rifas = useQuery(api.rifas.list, {});
  const hasAccess = useQuery(api.appSettings.checkModuleAccess, { moduleKey: "rifas" });
  const createRifa = useMutation(api.rifas.create);
  const updateRifa = useMutation(api.rifas.update);
  const removeRifa = useMutation(api.rifas.remove);
  const generateUploadUrl = useMutation(api.rifas.generateUploadUrl);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RifaDoc | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageId, setExistingImageId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Id<"rifas"> | null>(null);

  const [showPrint, setShowPrint] = useState(false);
  const [printTarget, setPrintTarget] = useState<RifaDoc | null>(null);
  const [ticketsPerPage, setTicketsPerPage] = useState<TicketsPerPage>(4);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(100);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPrizes([]);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageId(null);
    setShowForm(true);
  }

  function openEdit(r: RifaDoc) {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description ?? "",
      date: r.date,
      time: r.time ?? "",
      location: r.location ?? "",
      address: r.address ?? "",
      phone: r.phone ?? "",
      totalNumbers: r.totalNumbers,
      ticketPrice: r.ticketPrice !== undefined ? String(r.ticketPrice) : "",
      planRequired: r.planRequired ?? "free",
      status: r.status,
    });
    setPrizes(r.prizes ?? []);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageId(r.imageStorageId ?? null);
    setShowForm(true);
  }

  function addPrize() {
    if (prizes.length >= 5) return;
    setPrizes([...prizes, { position: prizes.length + 1, description: "" }]);
  }

  function removePrize(idx: number) {
    setPrizes(prizes.filter((_, i) => i !== idx).map((p, i) => ({ ...p, position: i + 1 })));
  }

  function updatePrizeDesc(idx: number, desc: string) {
    setPrizes(prizes.map((p, i) => (i === idx ? { ...p, description: desc } : p)));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.date) {
      toast.error("Preencha nome e data da rifa");
      return;
    }
    if (form.totalNumbers < 1 || form.totalNumbers > 9999) {
      toast.error("Quantidade de números deve ser entre 1 e 9999");
      return;
    }
    setSaving(true);
    try {
      // Upload new image if selected
      let imageStorageId: string | undefined = existingImageId ?? undefined;
      if (imageFile) {
        const uploadUrl = await generateUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": imageFile.type },
          body: imageFile,
        });
        if (!res.ok) throw new Error("Falha ao enviar imagem");
        const { storageId } = await res.json() as { storageId: string };
        imageStorageId = storageId;
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        date: form.date,
        time: form.time.trim() || undefined,
        location: form.location.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        totalNumbers: Number(form.totalNumbers),
        ticketPrice: form.ticketPrice !== "" ? Number(form.ticketPrice) : undefined,
        prizes: prizes.filter((p) => p.description.trim()),
        planRequired: form.planRequired,
        imageStorageId: imageStorageId as Parameters<typeof createRifa>[0]["imageStorageId"],
      };
      if (editing) {
        await updateRifa({ id: editing._id, ...payload, status: form.status });
        toast.success("Rifa atualizada!");
      } else {
        await createRifa(payload);
        toast.success("Rifa criada!");
      }
      setShowForm(false);
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("Erro ao salvar rifa");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await removeRifa({ id: deleteTarget });
      toast.success("Rifa excluída");
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setShowDelete(false);
      setDeleteTarget(null);
    }
  }

  function handlePrint(r: RifaDoc) {
    setPrintTarget(r);
    setTicketsPerPage(4);
    setRangeStart(1);
    setRangeEnd(r.totalNumbers);
    setShowPrint(true);
  }

  function doGeneratePDF() {
    if (!printTarget) return;
    const start = Math.max(1, Math.min(rangeStart, printTarget.totalNumbers));
    const end = Math.max(start, Math.min(rangeEnd, printTarget.totalNumbers));
    generateRifaPDF(
      {
        name: printTarget.name,
        date: printTarget.date,
        time: printTarget.time,
        location: printTarget.location,
        address: printTarget.address,
        phone: printTarget.phone,
        ticketPrice: printTarget.ticketPrice,
        prizes: printTarget.prizes,
        totalNumbers: printTarget.totalNumbers,
      },
      ticketsPerPage,
      { startNumber: start, endNumber: end }
    );
    setShowPrint(false);
  }

  if (rifas === undefined || hasAccess === undefined) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Ticket className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Módulo não disponível</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          O módulo de Rifas não está disponível no seu plano atual. Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            Rifas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie e gerencie suas rifas, defina prêmios e gere os bilhetes em PDF.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Rifa
        </Button>
      </div>

      {/* List */}
      {rifas.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Ticket /></EmptyMedia>
            <EmptyTitle>Nenhuma rifa cadastrada</EmptyTitle>
            <EmptyDescription>Crie sua primeira rifa para começar a gerar bilhetes.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openCreate} size="sm">Criar Rifa</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(rifas as RifaDoc[]).map((r) => (
            <Card key={r._id} className={r.imageStorageId ? "pt-0" : ""}>
              {r.imageStorageId && (
                <div className="rounded-t-xl overflow-hidden">
                  <RifaImage storageId={r.imageStorageId} />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{r.name}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    {r.status === "finished" ? (
                      <Badge variant="secondary" className="gap-1 text-xs"><XCircle className="w-3 h-3" />Encerrada</Badge>
                    ) : (
                      <Badge className="gap-1 text-xs bg-green-600 text-white"><CheckCircle className="w-3 h-3" />Ativa</Badge>
                    )}
                    {r.planRequired && r.planRequired !== "free" && (
                      <Badge variant="outline" className="text-xs">{PLAN_LABELS[r.planRequired]}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <div className="flex flex-wrap gap-3">
                  <span>📅 {r.date}</span>
                  {r.time && <span>🕐 {r.time}</span>}
                  <span>🎟️ {r.totalNumbers} números</span>
                  {r.ticketPrice !== undefined && (
                    <span>💰 R$ {r.ticketPrice.toFixed(2).replace(".", ",")}</span>
                  )}
                </div>
                {r.location && <div className="truncate">📍 {r.location}</div>}
                {(r.prizes ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(r.prizes ?? []).slice(0, 3).map((p) => (
                      <span key={p.position} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {PRIZE_EMOJI[p.position - 1]} {p.description}
                      </span>
                    ))}
                    {(r.prizes ?? []).length > 3 && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        +{(r.prizes ?? []).length - 3} prêmios
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => handlePrint(r)}>
                    <FileDown className="w-3 h-3" />PDF
                  </Button>
                  <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => openEdit(r)}>
                    <Pencil className="w-3 h-3" />Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1 h-7 text-xs"
                    onClick={() => { setDeleteTarget(r._id); setShowDelete(true); }}
                  >
                    <Trash2 className="w-3 h-3" />Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Rifa" : "Nova Rifa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nome da Rifa *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Rifa Beneficente 2026" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Descrição opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Salão Paroquial" />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Qtd. de Números *</Label>
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={form.totalNumbers}
                  onChange={(e) => setForm({ ...form, totalNumbers: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Valor do Bilhete (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.ticketPrice}
                  onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Plan */}
            <div>
              <Label>Plano necessário</Label>
              <Select value={form.planRequired} onValueChange={(v) => setForm({ ...form, planRequired: v as PlanKey })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito (todos os planos)</SelectItem>
                  <SelectItem value="basic">BASIC ou superior</SelectItem>
                  <SelectItem value="pro">PRO ou superior</SelectItem>
                  <SelectItem value="max">MAX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status (only when editing) */}
            {editing && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "finished" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="finished">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Image upload */}
            <div>
              <Label className="flex items-center gap-1 mb-2"><ImageIcon className="w-4 h-4" />Imagem da Rifa</Label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }}
              />
              {(imagePreview ?? (existingImageId ? "existing" : null)) ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-muted flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="w-5 h-5" /> Imagem salva
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs gap-1"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <Upload className="w-3 h-3" />Trocar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => { setImageFile(null); setImagePreview(null); setExistingImageId(null); }}
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Clique para adicionar uma imagem</span>
                </button>
              )}
            </div>

            {/* Prizes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-1"><Trophy className="w-4 h-4" />Prêmios</Label>
                {prizes.length < 5 && (
                  <Button type="button" size="sm" variant="secondary" onClick={addPrize} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" />Adicionar
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {prizes.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-base w-7 text-center shrink-0">{PRIZE_EMOJI[idx]}</span>
                    <Input
                      value={p.description}
                      onChange={(e) => updatePrizeDesc(idx, e.target.value)}
                      placeholder={`Descrição do ${idx + 1}º prêmio`}
                      className="text-sm"
                    />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removePrize(idx)}>
                      <XCircle className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrint} onOpenChange={setShowPrint}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5 text-primary" />
              Gerar PDF dos Bilhetes
            </DialogTitle>
          </DialogHeader>
          {printTarget && (
            <div className="space-y-5 py-2">
              {/* Rifa info summary */}
              <div className="bg-muted/60 rounded-lg px-4 py-3 text-sm space-y-1">
                <div className="font-bold text-foreground">{printTarget.name}</div>
                <div className="text-muted-foreground">
                  {printTarget.totalNumbers} números no total &bull; Data: {printTarget.date}
                </div>
              </div>

              {/* Range */}
              <div className="space-y-3">
                <Label className="font-semibold">Intervalo de números</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">De</Label>
                    <Input
                      type="number"
                      min={1}
                      max={printTarget.totalNumbers}
                      value={rangeStart}
                      onChange={(e) => setRangeStart(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Até</Label>
                    <Input
                      type="number"
                      min={1}
                      max={printTarget.totalNumbers}
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                    onClick={() => { setRangeStart(1); setRangeEnd(printTarget.totalNumbers); }}
                  >Todos</button>
                  <button
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                    onClick={() => { setRangeStart(1); setRangeEnd(Math.ceil(printTarget.totalNumbers / 2)); }}
                  >1ª metade</button>
                  <button
                    className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
                    onClick={() => { setRangeStart(Math.ceil(printTarget.totalNumbers / 2) + 1); setRangeEnd(printTarget.totalNumbers); }}
                  >2ª metade</button>
                </div>
              </div>

              {/* Layout */}
              <div className="space-y-2">
                <Label className="font-semibold">Layout da página</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TICKETS_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setTicketsPerPage(n as TicketsPerPage)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors cursor-pointer",
                        ticketsPerPage === n
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        {Array.from({ length: Math.min(n, 4) }).map((_, i) => (
                          <div key={i} className="w-8 h-2 rounded-sm bg-current opacity-60" />
                        ))}
                        {n > 4 && <div className="text-[9px] opacity-60">+{n - 4}</div>}
                      </div>
                      <span className="text-xs font-bold">{n} por página</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 space-y-0.5">
                <div>
                  Bilhetes: <strong>{Math.max(0, Math.min(rangeEnd, printTarget.totalNumbers) - Math.max(1, rangeStart) + 1)}</strong>
                  {" "}(números {Math.max(1, rangeStart)} a {Math.min(rangeEnd, printTarget.totalNumbers)})
                </div>
                <div>
                  Páginas estimadas: <strong>{Math.ceil(Math.max(0, Math.min(rangeEnd, printTarget.totalNumbers) - Math.max(1, rangeStart) + 1) / ticketsPerPage)}</strong>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPrint(false)}>Cancelar</Button>
            <Button onClick={doGeneratePDF} className="gap-2">
              <FileDown className="w-4 h-4" />Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Rifa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Tem certeza que deseja excluir esta rifa? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RifasPage() {
  return (
    <>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <Ticket className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Faça login para acessar suas rifas.</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </AuthLoading>
      <Authenticated>
        <RifasPageInner />
      </Authenticated>
    </>
  );
}
