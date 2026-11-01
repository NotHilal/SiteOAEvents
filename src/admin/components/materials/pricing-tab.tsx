"use client";

import { useEffect, useState } from "react";

import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { fromTtc, replaceTiers, ttcFromHt } from "@/lib/catalog";
import { money } from "@/lib/format";

import type { Variant } from "./types";

// Prices are typed TTC (what the customer pays) and stored HT, as before.
type Row = { minQty: string; maxQty: string; weekday: string; weekend: string };

const toRow = (t: Variant["tiers"][number]): Row => ({
  minQty: String(t.minQty),
  maxQty: t.maxQty == null ? "" : String(t.maxQty),
  weekday: euros(ttcFromHt(t.weekday)),
  weekend: euros(ttcFromHt(t.weekend)),
});
const num = (s: string) => Number.parseFloat(String(s).replace(",", "."));
const euros = (n: number) => n.toFixed(2).replace(".", ",");

export function PricingTab({ variant, onChanged }: { variant: Variant; onChanged: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [tiered, setTiered] = useState(false);
  const [weekend, setWeekend] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const r = variant.tiers.length ? variant.tiers.map(toRow) : [{ minQty: "1", maxQty: "", weekday: "", weekend: "" }];
    setRows(r);
    setTiered(r.length > 1);
    setWeekend(variant.tiers.some((t) => t.weekday !== t.weekend));
    setError("");
  }, [variant]);

  const set = (i: number, patch: Partial<Row>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save() {
    setError("");
    const list = (tiered ? rows : rows.slice(0, 1)).map((r) => ({
      minQty: tiered ? Number.parseInt(r.minQty, 10) : 1,
      maxQty: tiered && r.maxQty.trim() ? Number.parseInt(r.maxQty, 10) : null,
      weekday: num(r.weekday),
      weekend: weekend ? num(r.weekend) : num(r.weekday),
    }));
    for (const t of list) {
      if (!t.minQty || t.minQty < 1) return setError("Quantité minimale invalide.");
      if (t.maxQty != null && t.maxQty < t.minQty) return setError("La quantité maximale doit être ≥ au minimum.");
      if (!Number.isFinite(t.weekday) || t.weekday < 0 || !Number.isFinite(t.weekend) || t.weekend < 0) return setError("Indiquez des prix valides.");
    }
    // Untouched prices keep their exact stored HT value.
    const original = new Map(variant.tiers.flatMap((t) => [[ttcFromHt(t.weekday).toFixed(2), t.weekday] as const, [ttcFromHt(t.weekend).toFixed(2), t.weekend] as const]));
    const ht = (ttc: number) => original.get(ttc.toFixed(2)) ?? fromTtc(ttc);
    setSaving(true);
    try {
      await replaceTiers(
        variant.id,
        list.sort((a, b) => a.minQty - b.minQty).map((t) => ({ ...t, weekday: ht(t.weekday), weekend: ht(t.weekend) })),
      );
      toast.success("Prix enregistrés");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const shown = tiered ? rows : rows.slice(0, 1);
  const exampleQty = Math.max(10, Number.parseInt(shown[0]?.minQty || "1", 10) || 1);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="font-heading">Prix de location{variant.label ? ` — ${variant.label}` : ""}</CardTitle>
        <CardDescription>Prix TTC par unité, pour la durée de location. Appliqués automatiquement sur le site.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <label className="flex items-start gap-3">
            <Switch
              checked={tiered}
              onCheckedChange={(v) => {
                setTiered(v);
                if (!v) setRows((r) => [{ ...r[0], minQty: "1", maxQty: "" }]);
              }}
            />
            <span>
              <span className="block font-medium">Prix dégressif selon la quantité</span>
              <span className="text-sm text-muted-foreground">ex : moins cher à partir de 50 chaises. La 1ʳᵉ ligne fixe aussi la quantité minimum.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <Switch checked={weekend} onCheckedChange={setWeekend} />
            <span>
              <span className="block font-medium">Prix différent le week-end</span>
              <span className="text-sm text-muted-foreground">Vendredi, samedi, dimanche et jours fériés.</span>
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <div className="hidden gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid" style={{ gridTemplateColumns: tiered ? "1fr 1fr 1.3fr 1.3fr 40px" : "1.3fr 1.3fr" }}>
            {tiered && <span>De (qté)</span>}
            {tiered && <span>À (qté)</span>}
            <span>{weekend ? "Semaine (lun-jeu)" : "Prix TTC"}</span>
            {weekend && <span>Week-end / férié</span>}
          </div>
          {shown.map((r, i) => (
            <div key={i} className="grid items-center gap-2" style={{ gridTemplateColumns: tiered ? "1fr 1fr 1.3fr 1.3fr 40px" : weekend ? "1fr 1fr" : "minmax(0, 16rem)" }}>
              {tiered && <Input inputMode="numeric" value={r.minQty} onChange={(e) => set(i, { minQty: e.target.value })} aria-label="Quantité minimum" />}
              {tiered && <Input inputMode="numeric" value={r.maxQty} onChange={(e) => set(i, { maxQty: e.target.value })} placeholder="et plus" aria-label="Quantité maximum" />}
              <PriceInput value={r.weekday} onChange={(v) => set(i, { weekday: v })} label="Prix semaine" />
              {weekend && <PriceInput value={r.weekend} onChange={(v) => set(i, { weekend: v })} label="Prix week-end" />}
              {tiered && (
                <Button variant="ghost" size="icon" disabled={rows.length < 2} onClick={() => setRows((list) => list.filter((_, j) => j !== i))} aria-label="Supprimer ce palier">
                  <Trash2 className="text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          {tiered && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const last = rows[rows.length - 1];
                const nextMin = last?.maxQty ? String(Number.parseInt(last.maxQty, 10) + 1) : "";
                setRows((list) => [...list, { minQty: nextMin, maxQty: "", weekday: "", weekend: "" }]);
              }}
            >
              <Plus /> Ajouter un palier
            </Button>
          )}
        </div>

        {shown[0] && Number.isFinite(num(shown[0].weekday)) && (
          <p className="text-sm text-muted-foreground">
            Exemple : {exampleQty} unités {weekend ? "en semaine" : ""} = <strong className="text-foreground">{money(num(priceFor(shown, exampleQty, tiered).weekday) * exampleQty)}</strong>
            {weekend && (
              <>
                {" "}
                · le week-end = <strong className="text-foreground">{money(num(priceFor(shown, exampleQty, tiered).weekend) * exampleQty)}</strong>
              </>
            )}
          </p>
        )}

        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button size="lg" onClick={save} disabled={saving}>
          {saving && <Spinner />} Enregistrer les prix
        </Button>
      </CardContent>
    </Card>
  );
}

function priceFor(rows: Row[], qty: number, tiered: boolean) {
  if (!tiered) return rows[0];
  return rows.find((r) => qty >= Number(r.minQty) && (!r.maxQty || qty <= Number(r.maxQty))) || rows[0];
}

function PriceInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="relative">
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="pr-8 text-right tabular-nums" aria-label={label} placeholder="0,00" />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">€</span>
    </div>
  );
}

