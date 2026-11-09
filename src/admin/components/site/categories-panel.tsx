"use client";

import { useEffect, useState } from "react";

import { ArrowLeft, ArrowRight, ExternalLink, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/confirm";
import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/use-fetch";
import { type CategoryRow, catalogAction, categoryTitle, loadCatalog } from "@/lib/catalog";

// biome-ignore lint: plain JS module shared with the public site
import { normalizeCategoryTitle } from "../../../lib/catalogue-pages.js";

export function CategoriesPanel() {
  const confirm = useConfirm();
  const { data, loading, reload } = useFetch(loadCatalog, []);
  const [editing, setEditing] = useState<CategoryRow | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const categories = data?.categories || [];
  const count = (c: CategoryRow) => {
    if (!data) return 0;
    const productIds = new Set(data.products.filter((p) => p.category === c.name).map((p) => p.id));
    const keys = new Set<string>();
    for (const m of data.materials) {
      if (m.product_id && productIds.has(m.product_id)) keys.add(`p:${m.product_id}`);
      else if (!m.product_id && m.category === c.name) keys.add(`m:${m.id}`);
    }
    return keys.size;
  };

  async function move(i: number, d: number) {
    const order = categories.map((c) => c.id);
    [order[i], order[i + d]] = [order[i + d], order[i]];
    setBusy(true);
    try {
      await catalogAction("reorderCategories", { ids: order });
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: CategoryRow) {
    const n = count(c);
    if (n) return toast.error(`« ${categoryTitle(c)} » contient ${n} article(s) : changez-les de catégorie avant de la supprimer.`);
    if (!(await confirm({ title: `Supprimer « ${categoryTitle(c)} » ?`, description: "La vignette disparaît de l'accueil et du catalogue.", confirm: "Supprimer", destructive: true }))) return;
    try {
      await catalogAction("deleteCategory", { id: c.id });
      toast.success("Catégorie supprimée");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  if (loading && !data) return <Skeleton className="h-80 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Photos communes avec les tuiles de l'{" "}
          <a href="/#oa-home-cats-title" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">
            accueil <ExternalLink className="size-3" />
          </a>
          {" "}et au{" "}
          <a href="/catalogue" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">
            Catalogue <ExternalLink className="size-3" />
          </a>
          . Le choix, les titres personnalisés et l'ordre des tuiles se gèrent dans « Tuiles de l'accueil ».
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus /> Nouvelle catégorie
        </Button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c, i) => (
          <li key={c.id} className="overflow-hidden rounded-xl border bg-card">
            <div className="relative aspect-[16/9] bg-muted">
              {c.image_url ? (
                // biome-ignore lint/performance/noImgElement: uploaded images
                <img src={c.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageOff />
                </div>
              )}
              <span className="absolute top-2 left-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-sm font-bold">{i + 1}</span>
            </div>
            <div className="space-y-1 p-3">
              <p className="font-heading font-semibold">{categoryTitle(c)}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{c.description || "Pas de description"}</p>
              <p className="text-xs text-muted-foreground">{count(c)} article(s)</p>
            </div>
            <div className="flex items-center gap-1 border-t p-2">
              <Button variant="ghost" size="icon-sm" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Avancer">
                <ArrowLeft />
              </Button>
              <Button variant="ghost" size="icon-sm" disabled={busy || i === categories.length - 1} onClick={() => move(i, 1)} aria-label="Reculer">
                <ArrowRight />
              </Button>
              <span className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                <Pencil /> Modifier
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => remove(c)} aria-label="Supprimer">
                <Trash2 className="text-muted-foreground" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <CategoryDialog category={editing} categories={categories} onClose={() => setEditing(null)} onSaved={reload} />
    </div>
  );
}

function CategoryDialog({ category, categories, onClose, onSaved }: { category: CategoryRow | "new" | null; categories: CategoryRow[]; onClose: () => void; onSaved: () => void }) {
  const isEdit = category && category !== "new";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!category) return;
    setTitle(isEdit ? categoryTitle(category) : "");
    setDescription(isEdit ? category.description || "" : "");
    setImage(isEdit ? category.image_url || "" : "");
    setError("");
  }, [category, isEdit]);

  async function save() {
    setError("");
    const label = title.replace(/\s+/g, " ").trim();
    if (!label) return setError("Le titre est obligatoire.");
    if (!description.trim()) return setError("La description est obligatoire.");
    if (!image) return setError("La photo est obligatoire.");
    const wanted = normalizeCategoryTitle(label);
    if (categories.some((c) => c.id !== (isEdit ? category.id : null) && [c.name, c.label].filter(Boolean).map(normalizeCategoryTitle).includes(wanted)))
      return setError("Ce titre est déjà utilisé.");
    setSaving(true);
    try {
      await catalogAction("saveCategory", { id: isEdit ? category.id : undefined, title: label, description, image });
      toast.success("Catégorie enregistrée");
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          <DialogDescription>La photo est commune avec l'accueil. Le titre est repris sur l'accueil sauf si un titre de tuile a été personnalisé.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-title">Titre</Label>
            <Input id="cat-title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="ex : Art de la table" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea id="cat-desc" value={description} maxLength={220} rows={3} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Photo</Label>
            <ImageField value={image} onChange={setImage} prefix="catalogue" aspect="aspect-[16/9]" />
          </div>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Spinner />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
