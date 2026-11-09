"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/hooks/use-fetch";
import { type CategoryRow, catalogAction, categoryTitle } from "@/lib/catalog";
import { api } from "@/lib/session";

type Tile = CategoryRow & { categoryId: string; title: string | null };
type LayoutTile = { categoryId: string; title: string | null };
async function loadTiles() {
  return (await api<{ data: { categories: CategoryRow[]; tiles: Tile[] } }>("/api/admin/home-tiles")).data;
}

export function HomeTilesPanel() {
  const { data, loading, error, reload } = useFetch(loadTiles, []);
  const [editing, setEditing] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState(false);
  const tiles = data?.tiles || [];
  const categories = data?.categories || [];
  const layout = tiles.map(t => ({ categoryId: t.categoryId, title: t.title }));
  const selected = categories.find(c => c.id === categoryId);

  function edit(index: number) {
    const tile = tiles[index];
    setEditing(index);
    setCategoryId(tile?.categoryId || categories.find(c => !tiles.some(t => t.categoryId === c.id))?.id || "");
    setTitle(tile?.title || "");
    const category = tile || categories.find(c => !tiles.some(t => t.categoryId === c.id));
    setImage(category?.image_url || "");
  }

  async function persist(next: LayoutTile[], photo?: { categoryId: string; image: string }) {
    setBusy(true);
    try {
      await catalogAction("saveHomeTiles", { tiles: next, ...(photo ? { photo } : {}) });
      await reload();
      toast.success("Tuiles de l'accueil enregistrées");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (editing === null || !selected) return;
    const next = [...layout];
    next[editing] = { categoryId, title: title.trim() || null };
    const changedPhoto = image !== (selected.image_url || "");
    if (changedPhoto && !image) return toast.error("Choisissez une photo pour cette catégorie.");
    if (await persist(next, changedPhoto ? { categoryId, image } : undefined)) setEditing(null);
  }

  function move(index: number, direction: number) {
    const next = [...layout];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    void persist(next);
  }

  if (loading && !data) return <Skeleton className="h-80 rounded-xl" />;
  if (error) return <div role="alert" className="space-y-3"><p>{error}</p><Button onClick={reload}>Réessayer</Button></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Choisissez les catégories affichées sur l'accueil et personnalisez leurs titres. Les photos restent communes avec le catalogue.
        </p>
        <Button variant="outline" asChild><a href="/#oa-home-cats-title" target="_blank" rel="noreferrer"><ExternalLink /> Voir l'accueil</a></Button>
      </div>
      {!tiles.length && <p className="text-sm text-muted-foreground">Aucune tuile sur l'accueil. Ajoutez une catégorie pour commencer.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((tile, index) => (
          <li key={tile.categoryId} className="overflow-hidden rounded-xl border bg-card">
            <div className="flex aspect-[16/9] items-center justify-center bg-muted">
              {tile.image_url ? <img src={tile.image_url} alt="" className="size-full object-cover" /> : <ImageOff className="text-muted-foreground" />}
            </div>
            <div className="space-y-1 p-3">
              <p className="font-heading font-semibold">Tuile {categoryTitle(tile)}</p>
              <p className="text-sm text-muted-foreground">Catégorie : {categoryTitle(categories.find(c => c.id === tile.categoryId) || tile)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1 border-t p-2">
              <Button variant="ghost" size="icon-sm" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={`Avancer ${categoryTitle(tile)}`}><ArrowLeft /></Button>
              <Button variant="ghost" size="icon-sm" disabled={busy || index === tiles.length - 1} onClick={() => move(index, 1)} aria-label={`Reculer ${categoryTitle(tile)}`}><ArrowRight /></Button>
              <span className="flex-1" />
              <Button variant="outline" size="sm" disabled={busy} onClick={() => edit(index)} aria-label={`Modifier la tuile ${categoryTitle(tile)}`}><Pencil /> Modifier</Button>
              <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => void persist(layout.filter((_, i) => i !== index))} aria-label={`Retirer la tuile ${categoryTitle(tile)} de l'accueil`}><Trash2 /></Button>
            </div>
          </li>
        ))}
      </ul>
      <Button disabled={busy || tiles.length >= Math.min(12, categories.length)} onClick={() => edit(tiles.length)}><Plus /> Ajouter une tuile</Button>
      <p className="text-sm text-muted-foreground">Retirer une tuile conserve la catégorie dans le catalogue. Actualisez l'accueil après vos modifications.</p>

      <Dialog open={editing !== null} onOpenChange={open => { if (!open && !busy) setEditing(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing === tiles.length ? "Ajouter une tuile" : "Modifier la tuile"}</DialogTitle>
            <DialogDescription>Le titre personnalisé concerne uniquement l'accueil. Changer la photo la met aussi à jour dans le catalogue.</DialogDescription>
          </DialogHeader>
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="home-tile-category">Catégorie et lien de la tuile</Label>
              <NativeSelect id="home-tile-category" className="w-full" value={categoryId} onChange={e => {
                setCategoryId(e.target.value);
                setTitle("");
                setImage(categories.find(c => c.id === e.target.value)?.image_url || "");
              }}>
                {categories.filter(c => c.id === tiles[editing ?? -1]?.categoryId || !tiles.some(t => t.categoryId === c.id)).map(c => <option key={c.id} value={c.id}>{categoryTitle(c)}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="home-tile-title">Titre sur l'accueil (facultatif)</Label>
              <Input id="home-tile-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={60} placeholder={selected ? categoryTitle(selected) : "Titre de la catégorie"} />
              <p className="text-xs text-muted-foreground">Laissez vide pour reprendre le titre de la catégorie.</p>
            </div>
            <div className="space-y-1.5"><Label>Photo commune avec le catalogue</Label><ImageField value={image} onChange={setImage} prefix="catalogue" aspect="aspect-[16/9]" /></div>
          </fieldset>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setEditing(null)}>Annuler</Button>
            <Button disabled={busy || !selected} onClick={save}>{busy && <Spinner />} Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
