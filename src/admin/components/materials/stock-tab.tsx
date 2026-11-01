"use client";

import { useState } from "react";

import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fmtDateTime } from "@/lib/format";
import { api } from "@/lib/session";
import { cn } from "@/lib/utils";

import type { MaterialDetail, Variant } from "./types";

const IN_REASONS = ["Achat", "Retour de réparation", "Correction d'inventaire"];
const OUT_REASONS = ["Casse", "Perte / vol", "Vente", "Correction d'inventaire"];

export function StockTab({ detail, variant, onChanged }: { detail: MaterialDetail; variant: Variant; onChanged: () => void }) {
  const [dir, setDir] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState(IN_REASONS[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const movements = detail.movements.filter((m) => m.materialId === variant.id);
  const n = Number.parseInt(qty, 10) || 0;
  const next = variant.stock + (dir === "in" ? n : -n);

  async function save() {
    if (n <= 0) return toast.error("Indiquez une quantité.");
    setSaving(true);
    try {
      await api("/api/admin/stock", {
        method: "POST",
        json: { materialId: variant.id, delta: dir === "in" ? n : -n, reason: [reason, note.trim()].filter(Boolean).join(" — ") },
      });
      toast.success(`Stock mis à jour : ${next} ${variant.label || ""}`.trim());
      setQty("1");
      setNote("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Modifier le stock</CardTitle>
          <CardDescription>Quantité possédée aujourd'hui : <strong className="text-foreground">{variant.stock}</strong></CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleGroup
            type="single"
            variant="outline"
            value={dir}
            onValueChange={(v) => {
              if (!v) return;
              setDir(v as "in" | "out");
              setReason(v === "in" ? IN_REASONS[0] : OUT_REASONS[0]);
            }}
            className="grid w-full grid-cols-2"
          >
            <ToggleGroupItem value="in" className="gap-2 data-[state=on]:border-success data-[state=on]:bg-success-soft data-[state=on]:text-success">
              <Plus className="size-4" /> Ajouter
            </ToggleGroupItem>
            <ToggleGroupItem value="out" className="gap-2 data-[state=on]:border-destructive data-[state=on]:bg-danger-soft data-[state=on]:text-destructive">
              <Minus className="size-4" /> Retirer
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="space-y-1.5">
            <Label htmlFor="st-qty">Quantité</Label>
            <Input id="st-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} className="h-11 text-lg tabular-nums" />
          </div>
          <div className="space-y-1.5">
            <Label>Motif</Label>
            <div className="flex flex-wrap gap-1.5">
              {(dir === "in" ? IN_REASONS : OUT_REASONS).map((r) => (
                <Button key={r} type="button" size="sm" variant={reason === r ? "default" : "outline"} onClick={() => setReason(r)}>
                  {r}
                </Button>
              ))}
            </div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Précision (facultatif)" />
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            Nouveau stock : <strong className={cn("tabular-nums", next < 0 && "text-destructive")}>{next}</strong>
          </div>
          <Button size="lg" className="w-full" onClick={save} disabled={saving || n <= 0 || next < 0}>
            {saving && <Spinner />} Enregistrer
          </Button>
          <p className="text-xs text-muted-foreground">On ne peut pas descendre sous ce qui est déjà réservé sur une date à venir.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun mouvement enregistré.</p>
          ) : (
            <ul className="divide-y">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className={cn("w-14 shrink-0 rounded-md py-1 text-center font-bold tabular-nums", m.delta > 0 ? "bg-success-soft text-success" : "bg-danger-soft text-destructive")}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{m.reason || "—"}</span>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(m.createdAt)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">→ {m.stockAfter}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
