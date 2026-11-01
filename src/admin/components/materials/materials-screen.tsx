"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ImageOff, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Pill } from "@/components/badges";
import { useBookingsChanged } from "@/components/booking/booking-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/hooks/use-fetch";
import { type CategoryRow, catalogAction, categoryTitle, fromTtc, loadCatalog, ttcFromHt } from "@/lib/catalog";
import { addDaysISO, fmt, money, normalize, todayISO } from "@/lib/format";
import { api } from "@/lib/session";
import type { Planning } from "@/lib/types";
import { cn } from "@/lib/utils";

type Article = {
  key: string;
  href: string;
  name: string;
  category: string;
  image: string | null;
  variants: number;
  stock: number;
  outToday: number;
  online: "all" | "some" | "none";
  fromPrice: number | null;
  shortage: string | null;
};

export function MaterialsScreen() {
  const today = todayISO();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, loading, error, reload } = useFetch(async () => {
    const [catalog, planning] = await Promise.all([
      loadCatalog(),
      api<{ data: Planning }>(`/api/admin/planning?from=${today}&to=${addDaysISO(today, 60)}`).then((r) => r.data),
    ]);
    return { ...catalog, planning };
  }, []);
  useBookingsChanged(reload);

  const articles = useMemo<Article[]>(() => {
    if (!data) return [];
    const { materials, products, tiers, planning } = data;
    const productById = Object.fromEntries(products.map((p) => [p.id, p]));
    const groups = new Map<string, typeof materials>();
    for (const m of materials) {
      const key = m.product_id && productById[m.product_id] ? `p:${m.product_id}` : `m:${m.id}`;
      groups.set(key, [...(groups.get(key) || []), m]);
    }
    return [...groups.entries()].map(([key, list]) => {
      const p = key.startsWith("p:") ? productById[key.slice(2)] : null;
      list.sort((a, b) => (a.variant_order ?? 0) - (b.variant_order ?? 0));
      const ids = list.map((m) => String(m.id));
      const prices = tiers.filter((t) => ids.includes(String(t.material_id))).map((t) => Number(t.price_weekday_ht));
      const online = list.filter((m) => m.available).length;
      let shortage: string | null = null;
      for (const [day, slot] of Object.entries(planning.usage).sort()) {
        if (list.some((m) => (slot[String(m.id)] || 0) >= m.max_quantity && (slot[String(m.id)] || 0) > 0)) {
          shortage = day;
          break;
        }
      }
      return {
        key,
        href: `/admin/materiel/${encodeURIComponent(String(list[0].id))}`,
        name: p ? p.name : list[0].name,
        category: (p ? p.category : list[0].category) || "Sans catégorie",
        image: list.find((m) => m.image_url)?.image_url || null,
        variants: p ? list.length : 1,
        stock: list.reduce((s, m) => s + (Number(m.max_quantity) || 0), 0),
        outToday: list.reduce((s, m) => s + (planning.usage[today]?.[String(m.id)] || 0), 0),
        online: online === list.length ? "all" : online ? "some" : "none",
        fromPrice: prices.length ? ttcFromHt(Math.min(...prices)) : null,
        shortage,
      };
    });
  }, [data, today]);

  const categories = useMemo(() => [...new Set(articles.map((a) => a.category))].sort(), [articles]);
  const rows = useMemo(() => {
    const query = normalize(q);
    return articles
      .filter((a) => (!category || a.category === category) && (!query || normalize(a.name).includes(query)))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [articles, q, category]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Matériel"
        description={data ? `${articles.length} articles · cliquez sur un article pour gérer son stock, ses prix et ses disponibilités.` : "Votre catalogue de location."}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nouvel article
          </Button>
        }
        className="mb-2"
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:w-80">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un article…" className="pl-8" />
        </div>
        <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-56" aria-label="Catégorie">
          <NativeSelectOption value="">Toutes les catégories</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c} value={c}>
              {c}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {error && <p className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => {
            const left = a.stock - a.outToday;
            return (
              <li key={a.key}>
                <Link href={a.href} className="group flex gap-3.5 rounded-xl border bg-card p-3 transition hover:border-gold hover:shadow-sm">
                  <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {a.image ? (
                      // biome-ignore lint/performance/noImgElement: uploaded images
                      <img src={a.image} alt="" className="size-full object-cover transition group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate font-heading font-semibold">{a.name}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {a.category}
                      {a.variants > 1 ? ` · ${a.variants} options` : ""}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5">
                      <Pill t={left <= 0 ? "red" : "green"}>
                        {Math.max(0, left)}/{a.stock} dispo
                      </Pill>
                      {left < 0 && <Pill t="red">+{-left} en trop</Pill>}
                      {a.online !== "all" && <Pill t="gray">{a.online === "none" ? "Hors ligne" : "Partiel"}</Pill>}
                      {a.shortage && <Pill t="orange">Épuisé le {fmt(a.shortage, "d MMM")}</Pill>}
                    </div>
                    <p className={cn("text-sm font-semibold", !a.fromPrice && "text-destructive")}>{a.fromPrice ? `dès ${money(a.fromPrice)}` : "Prix manquant"}</p>
                  </div>
                </Link>
              </li>
            );
          })}
          {rows.length === 0 && <li className="col-span-full rounded-xl border bg-card p-8 text-center text-muted-foreground">Aucun article.</li>}
        </ul>
      )}

      <NewArticleDialog open={creating} onOpenChange={setCreating} categories={data?.categories || []} />
    </div>
  );
}

function NewArticleDialog({ open, onOpenChange, categories }: { open: boolean; onOpenChange: (o: boolean) => void; categories: CategoryRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("1");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setError("");
    const qty = Number.parseInt(stock, 10);
    const ttc = Number.parseFloat(price.replace(",", "."));
    if (!name.trim()) return setError("Le nom est obligatoire.");
    if (!category) return setError("Choisissez une catégorie.");
    if (!Number.isInteger(qty) || qty < 0) return setError("Stock invalide.");
    if (!Number.isFinite(ttc) || ttc < 0) return setError("Prix invalide.");
    setSaving(true);
    try {
      const m = await catalogAction<{ id: string }>("createMaterial", { name: name.trim(), category, stock: qty, priceHt: fromTtc(ttc) });
      toast.success("Article créé — complétez sa fiche puis mettez-le en ligne.");
      router.push(`/admin/materiel/${encodeURIComponent(m.id)}?tab=fiche`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Nouvel article</DialogTitle>
          <DialogDescription>L'essentiel pour commencer. Photos, description et options se règlent ensuite sur la fiche.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="na-name">Nom</Label>
            <Input id="na-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex : Chaise Napoléon blanche" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="na-cat">Catégorie</Label>
            <NativeSelect id="na-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10">
              <NativeSelectOption value="">Choisir…</NativeSelectOption>
              {categories.map((c) => (
                <NativeSelectOption key={c.id} value={c.name}>
                  {categoryTitle(c)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="na-stock">Quantité possédée</Label>
              <Input id="na-stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="na-price">Prix / jour TTC</Label>
              <Input id="na-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ex : 4,50" className="h-10" />
            </div>
          </div>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving && <Spinner />} Créer l'article
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
