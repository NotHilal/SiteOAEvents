"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/confirm";
import { GalleryField, ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/use-fetch";
import { catalogAction, categoryTitle, loadCatalog, optionName } from "@/lib/catalog";

import type { MaterialDetail, Variant } from "./types";

export function DetailsTab({ detail, variant, onChanged }: { detail: MaterialDetail; variant: Variant; onChanged: (selectId?: string) => void }) {
  const router = useRouter();
  const confirm = useConfirm();
  const product = detail.product;
  const { data: categories } = useFetch(() => loadCatalog().then((c) => c.categories), []);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [label, setLabel] = useState("");
  const [image, setImage] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [online, setOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optionDialog, setOptionDialog] = useState(false);

  useEffect(() => {
    setName(product ? product.name : variant.name);
    setCategory(product ? product.category : variant.category);
    setDescription(product ? product.description : variant.description);
    setLabel(variant.label);
    setImage(variant.image);
    setGallery(variant.gallery);
    setOnline(variant.online);
  }, [product, variant]);

  const upcoming = (ids: string[]) => detail.bookings.filter((b) => b.materials.some((m) => ids.includes(m.id)));

  async function save() {
    if (!name.trim()) return toast.error("Le nom est obligatoire.");
    if (product && !label.trim()) return toast.error("Le libellé de l'option est obligatoire.");
    setSaving(true);
    try {
      await catalogAction("updateArticle", { materialId: variant.id, name, category, description, label, image, gallery, online });
      toast.success("Fiche enregistrée");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOption(v: Variant) {
    if (!product) return;
    const held = upcoming([v.id]);
    if (held.length) return toast.error(`Impossible : « ${v.label} » est réservé dans ${held.length} commande(s) à venir.`);
    const last = detail.variants.length <= 2;
    const ok = await confirm({
      title: `Supprimer l'option « ${v.label} » ?`,
      description: last ? "Il ne restera qu'une version : l'article redeviendra un article simple." : "Son stock, ses prix et ses photos seront supprimés.",
      confirm: "Supprimer",
      destructive: true,
    });
    if (!ok) return;
    try {
      const { keepId } = await catalogAction<{ keepId: string }>("deleteOption", { materialId: v.id });
      const keep = v.id === variant.id ? keepId : variant.id;
      toast.success("Option supprimée");
      if (v.id === variant.id || last) router.replace(`/admin/materiel/${encodeURIComponent(keep)}?tab=fiche`);
      onChanged(keep);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  async function deleteArticle() {
    const ids = detail.variants.map((v) => v.id);
    const held = upcoming(ids);
    if (held.length) return toast.error(`Impossible : l'article est réservé dans ${held.length} commande(s) à venir. Mettez-le plutôt hors ligne.`);
    const ok = await confirm({
      title: `Supprimer « ${name} » ?`,
      description: "L'article disparaît du site et de l'administration, avec ses prix et ses photos. Pour le cacher temporairement, mettez-le plutôt hors ligne.",
      confirm: "Supprimer définitivement",
      destructive: true,
    });
    if (!ok) return;
    try {
      await catalogAction("deleteArticle", { materialId: variant.id });
      toast.success("Article supprimé");
      router.push("/admin/materiel");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Fiche produit</CardTitle>
          <CardDescription>Ce que voient les clients sur le site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
            <span>
              <span className="block font-medium">En ligne{product ? ` (option « ${variant.label} »)` : ""}</span>
              <span className="text-sm text-muted-foreground">{online ? "Visible et réservable sur le site." : "Caché du site. Vous pouvez toujours le bloquer ou le commander ici."}</span>
            </span>
            <Switch checked={online} onCheckedChange={setOnline} />
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="f-name">Nom de l'article</Label>
            <Input id="f-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
          </div>
          {product && (
            <div className="space-y-1.5">
              <Label htmlFor="f-label">Libellé de cette option</Label>
              <Input id="f-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex : 15 kg, Blanc, 3 mètres" className="h-10" />
              <p className="text-xs text-muted-foreground">Nom affiché au client : « {optionName(name, label)} »</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="f-cat">Catégorie</Label>
            <NativeSelect id="f-cat" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10">
              <NativeSelectOption value="">Sans catégorie</NativeSelectOption>
              {(categories || []).map((c) => (
                <NativeSelectOption key={c.id} value={c.name}>
                  {categoryTitle(c)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-desc">Description</Label>
            <Textarea id="f-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Dimensions, matière, coloris, conseils d'utilisation…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
            <div className="space-y-1.5">
              <Label>Photo principale</Label>
              <ImageField value={image} onChange={setImage} prefix="materiel" />
            </div>
            <div className="space-y-1.5">
              <Label>Autres photos</Label>
              <GalleryField value={gallery} onChange={setGallery} prefix="materiel" />
            </div>
          </div>
          <Button size="lg" onClick={save} disabled={saving}>
            {saving && <Spinner />} Enregistrer la fiche
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <Layers className="size-4" /> Options
            </CardTitle>
            <CardDescription>Plusieurs versions du même article (taille, coloris, poids…), chacune avec son stock et ses prix.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {product ? (
              <ul className="divide-y rounded-lg border">
                {detail.variants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <button type="button" className="min-w-0 text-left hover:underline" onClick={() => onChanged(v.id)}>
                      <span className="font-medium">{v.label || "Sans libellé"}</span>
                      <span className="ml-2 text-muted-foreground">stock {v.stock}</span>
                    </button>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteOption(v)} aria-label={`Supprimer l'option ${v.label}`}>
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Cet article n'a qu'une version.</p>
            )}
            <Button variant="outline" className="w-full" onClick={() => setOptionDialog(true)}>
              <Plus /> {product ? "Ajouter une option" : "Proposer plusieurs versions"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="font-heading text-destructive">Supprimer l'article</CardTitle>
            <CardDescription>Définitif. Impossible tant qu'il est réservé sur une date à venir.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={deleteArticle}>
              <Trash2 /> Supprimer l'article
            </Button>
          </CardContent>
        </Card>
      </div>

      <OptionDialog open={optionDialog} onOpenChange={setOptionDialog} detail={detail} variant={variant} onDone={onChanged} />
    </div>
  );
}

function OptionDialog({
  open,
  onOpenChange,
  detail,
  variant,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: MaterialDetail;
  variant: Variant;
  onDone: (selectId?: string) => void;
}) {
  const router = useRouter();
  const product = detail.product;
  const [current, setCurrent] = useState("");
  const [label, setLabel] = useState("");
  const [stock, setStock] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCurrent("");
      setLabel("");
      setStock("1");
      setError("");
    }
  }, [open]);

  async function create() {
    setError("");
    const qty = Number.parseInt(stock, 10);
    if (!product && !current.trim()) return setError("Indiquez le libellé de la version actuelle.");
    if (!label.trim()) return setError("Indiquez le libellé de la nouvelle option.");
    if (!Number.isInteger(qty) || qty < 0) return setError("Stock invalide.");
    const labels = [...detail.variants.map((v) => v.label.toLowerCase()), current.trim().toLowerCase()];
    if (labels.includes(label.trim().toLowerCase())) return setError("Une option porte déjà ce libellé.");
    setSaving(true);
    try {
      const m = await catalogAction<{ id: string }>("addOption", { materialId: variant.id, currentLabel: current, label, stock: qty });
      toast.success("Option ajoutée (hors ligne) — vérifiez ses prix et sa photo, puis mettez-la en ligne.");
      onOpenChange(false);
      router.replace(`/admin/materiel/${encodeURIComponent(m.id)}?tab=fiche`);
      onDone(m.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{product ? "Nouvelle option" : "Plusieurs versions"}</DialogTitle>
          <DialogDescription>La nouvelle option reprend les prix actuels ; vous pourrez les modifier ensuite.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!product && (
            <div className="space-y-1.5">
              <Label htmlFor="o-cur">Libellé de la version actuelle</Label>
              <Input id="o-cur" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="ex : 15 kg" className="h-10" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="o-label">Libellé de la nouvelle option</Label>
            <Input id="o-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex : 30 kg" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-stock">Quantité possédée</Label>
            <Input id="o-stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className="h-10" />
          </div>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={create} disabled={saving}>
            {saving && <Spinner />} Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
