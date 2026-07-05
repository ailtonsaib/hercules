import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { ScrollText, Save } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  eventId: Id<"events">;
  onClose: () => void;
};

export function RegulationEditorDialog({ eventId, onClose }: Props) {
  const regulation = useQuery(api.regulations.getByEvent, { eventId });
  const upsert = useMutation(api.regulations.upsert);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Populate when loaded
  useEffect(() => {
    if (regulation === undefined) return; // still loading
    if (regulation) {
      setTitle(regulation.title);
      setContent(regulation.content);
    } else {
      setTitle("REGULAMENTO");
      setContent(
        "1. ...\n2. ...\n3. ..."
      );
    }
  }, [regulation]);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Informe um título"); return; }
    setSaving(true);
    try {
      await upsert({ eventId, title: title.trim(), content });
      toast.success("Regulamento salvo!");
      onClose();
    } catch {
      toast.error("Erro ao salvar regulamento");
    } finally {
      setSaving(false);
    }
  };

  const isLoading = regulation === undefined;

  return (
    <Dialog open onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            Editor de Regulamento
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4 py-2 min-h-0">
            <div className="space-y-1">
              <Label className="font-semibold">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: REGULAMENTO DO BINGO"
                disabled={saving}
              />
            </div>

            <div className="flex-1 flex flex-col space-y-1 min-h-0">
              <Label className="font-semibold">Conteúdo</Label>
              <p className="text-xs text-muted-foreground">
                Digite o regulamento. Use Enter para nova linha. O texto será impresso como aparece aqui.
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={saving}
                className="flex-1 min-h-0 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Digite o regulamento aqui..."
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || isLoading} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
