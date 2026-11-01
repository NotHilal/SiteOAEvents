"use client";

import { useRef, useState } from "react";

import { ArrowLeft, ExternalLink, Film, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/confirm";
import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useFetch } from "@/hooks/use-fetch";
import { uploadFile } from "@/lib/db";
import { api } from "@/lib/session";

// biome-ignore lint: plain JS module shared with the public site
import { slugify } from "../../../lib/slug.js";

type Media = { type: "image" | "video"; src: string; caption: string };
type Realisation = { id?: string; title: string; slug: string; summary: string; body: string; cover: string; media: Media[] };

const empty = (): Realisation => ({ title: "", slug: "", summary: "", body: "", cover: "", media: [] });

export function RealisationsPanel() {
  const confirm = useConfirm();
  const { data, loading, reload, setData } = useFetch(() => api<{ data: Realisation[] }>("/api/realisations").then((r) => r.data), []);
  const [draft, setDraft] = useState<Realisation | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaInput = useRef<HTMLInputElement>(null);

  async function addMedia(files: FileList | null) {
    if (!files?.length || !draft) return;
    setUploading(true);
    const added: Media[] = [];
    try {
      for (const f of Array.from(files)) {
        const video = ["video/mp4", "video/webm"].includes(f.type);
        added.push({ type: video ? "video" : "image", src: await uploadFile(f, "realisation"), caption: "" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setDraft((d) => (d ? { ...d, media: [...d.media, ...added] } : d));
      setUploading(false);
      if (mediaInput.current) mediaInput.current.value = "";
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await api("/api/realisations", { method: draft.id ? "PUT" : "POST", json: draft });
      toast.success("Réalisation publiée sur le site");
      setDraft(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Realisation) {
    if (!(await confirm({ title: `Supprimer « ${r.title} » ?`, description: "La fiche disparaît du site.", confirm: "Supprimer", destructive: true }))) return;
    try {
      await api("/api/realisations", { method: "DELETE", json: { id: r.id } });
      setData((data || []).filter((x) => x.id !== r.id));
      toast.success("Réalisation supprimée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  if (loading && !data) return <Skeleton className="h-80 rounded-xl" />;

  if (draft)
    return (
      <Card className="max-w-3xl">
        <CardContent className="space-y-4 pt-1">
          <Button variant="ghost" size="sm" onClick={() => setDraft(null)} disabled={saving}>
            <ArrowLeft /> Retour à la liste
          </Button>
          <h3 className="font-heading text-lg font-semibold">{draft.id ? "Modifier la réalisation" : "Nouvelle réalisation"}</h3>
          <div className="space-y-1.5">
            <Label htmlFor="r-title">Titre</Label>
            <Input
              id="r-title"
              value={draft.title}
              maxLength={150}
              className="h-10"
              onChange={(e) => {
                const title = e.target.value;
                setDraft((d) => d && { ...d, title, slug: !d.id && (!d.slug || d.slug === slugify(d.title)) ? slugify(title) : d.slug });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-slug">Adresse de la page</Label>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">/nos-realisations/</span>
              <Input id="r-slug" value={draft.slug} onChange={(e) => setDraft((d) => d && { ...d, slug: slugify(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-sum">Courte description</Label>
            <Textarea id="r-sum" value={draft.summary} maxLength={400} rows={2} onChange={(e) => setDraft((d) => d && { ...d, summary: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-body">Récit de l'événement</Label>
            <Textarea id="r-body" value={draft.body} maxLength={20000} rows={8} onChange={(e) => setDraft((d) => d && { ...d, body: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:max-w-sm">
            <Label>Photo de couverture</Label>
            <ImageField value={draft.cover} onChange={(cover) => setDraft((d) => d && { ...d, cover })} prefix="realisation" />
          </div>
          <div className="space-y-2">
            <Label>Photos et vidéos ({draft.media.length}/40)</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {draft.media.map((m, i) => (
                <div key={m.src + i} className="space-y-1.5 rounded-lg border p-2">
                  <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                    {m.type === "video" ? (
                      // biome-ignore lint/a11y/useMediaCaption: preview
                      <video src={m.src} className="size-full object-cover" preload="metadata" controls />
                    ) : (
                      // biome-ignore lint/performance/noImgElement: uploaded images
                      <img src={m.src} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Input
                      value={m.caption}
                      placeholder="Légende (facultatif)"
                      onChange={(e) => setDraft((d) => d && { ...d, media: d.media.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => setDraft((d) => d && { ...d, media: d.media.filter((_, j) => j !== i) })} aria-label="Retirer">
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={() => mediaInput.current?.click()} disabled={uploading}>
              {uploading ? <Spinner /> : <ImagePlus />} Ajouter des photos / vidéos
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP, MP4 ou WebM · 10 Mo maximum par fichier.</p>
            <input ref={mediaInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm" className="hidden" onChange={(e) => addMedia(e.target.files)} />
          </div>
          <div className="flex gap-2 border-t pt-4">
            <Button size="lg" onClick={save} disabled={saving || uploading}>
              {saving && <Spinner />} Enregistrer et publier
            </Button>
            <Button size="lg" variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Vos événements passés, publiés sur la page Nos réalisations et l'accueil.</p>
        <Button onClick={() => setDraft(empty())}>
          <Plus /> Nouvelle réalisation
        </Button>
      </div>
      {(data || []).length === 0 && <p className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Aucune réalisation publiée.</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(data || []).map((r) => (
          <li key={r.id} className="overflow-hidden rounded-xl border bg-card">
            <div className="aspect-[16/10] bg-muted">
              {/* biome-ignore lint/performance/noImgElement: uploaded images */}
              {r.cover && <img src={r.cover} alt="" className="size-full object-cover" />}
            </div>
            <div className="space-y-1 p-3">
              <p className="font-heading font-semibold">{r.title}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Film className="size-3" /> {r.media.length} média(s)
              </p>
            </div>
            <div className="flex items-center gap-1 border-t p-2">
              <Button variant="ghost" size="sm" asChild>
                <a href={`/nos-realisations/${r.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> Voir
                </a>
              </Button>
              <span className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setDraft({ ...r, media: r.media.map((m) => ({ ...m })) })}>
                <Pencil /> Modifier
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => remove(r)} aria-label="Supprimer">
                <Trash2 className="text-muted-foreground" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
