"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { Film, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/db";
import { ApiError, api } from "@/lib/session";

// biome-ignore lint: plain JS module shared with the public site
import { slugify } from "../../../lib/slug.js";

/** Fired after a réalisation is published, so open lists can reload. */
export const REALISATIONS_CHANGED = "oa-realisations-changed";

type Media = { type: "image" | "video"; src: string; caption: string };
type Draft = { title: string; summary: string; body: string; cover: string; media: Media[] };
const EMPTY: Draft = { title: "", summary: "", body: "", cover: "", media: [] };

const Ctx = createContext<() => void>(() => {});

/** `const open = useQuickRealisation(); <Button onClick={open}>` */
export const useQuickRealisation = () => useContext(Ctx);

/** "Nouvelle réalisation rapide": title, cover, a few lines and photos →
 *  published in one step. The full editor stays in Site > Réalisations. */
export function QuickRealisationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaInput = useRef<HTMLInputElement>(null);

  const start = useCallback(() => {
    setDraft(EMPTY);
    setOpen(true);
  }, []);

  async function addMedia(files: FileList | null) {
    if (!files?.length) return;
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
      // The first photo becomes the cover when none was chosen.
      setDraft((d) => {
        const firstImage = added.find((m) => m.type === "image");
        return { ...d, cover: d.cover || firstImage?.src || "", media: [...d.media, ...added].slice(0, 40) };
      });
      setUploading(false);
      if (mediaInput.current) mediaInput.current.value = "";
    }
  }

  async function publish() {
    const title = draft.title.trim();
    const summary = draft.summary.trim();
    if (!title) return toast.error("Donnez un titre à la réalisation.");
    if (!draft.cover) return toast.error("Ajoutez une photo de couverture.");
    if (!summary) return toast.error("Ajoutez une courte description.");
    setSaving(true);
    const base = slugify(title) || "realisation";
    try {
      // The page address comes from the title; a number is added if taken.
      for (let n = 1; n <= 20; n++) {
        const slug = n === 1 ? base : `${base}-${n}`;
        try {
          const res = await api<{ data: { slug: string } }>("/api/realisations", {
            method: "POST",
            json: { title, slug, summary, body: draft.body.trim() || summary, cover: draft.cover, media: draft.media },
          });
          window.dispatchEvent(new Event(REALISATIONS_CHANGED));
          setOpen(false);
          toast.success("Réalisation publiée sur le site", {
            action: { label: "Voir", onClick: () => window.open(`/nos-realisations/${res.data.slug}`, "_blank", "noopener") },
          });
          return;
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 409)) throw e;
        }
      }
      throw new Error("Cette adresse existe déjà. Changez le titre.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publication impossible.");
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || uploading;

  return (
    <Ctx.Provider value={start}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Nouvelle réalisation</DialogTitle>
            <DialogDescription>Publiée tout de suite sur la page Nos réalisations et sur l'accueil. Vous pourrez la compléter ensuite dans Site › Réalisations.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[1fr_15rem]">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="qr-title">Titre</Label>
                <Input id="qr-title" autoFocus value={draft.title} maxLength={150} placeholder="ex : Mariage de Sarah & Karim" className="h-10" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                {draft.title.trim() && <p className="text-xs text-muted-foreground">Adresse : /nos-realisations/{slugify(draft.title)}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qr-summary">Courte description</Label>
                <Textarea id="qr-summary" value={draft.summary} maxLength={400} rows={3} placeholder="Le lieu, l'ambiance, le matériel installé…" onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qr-body">
                  Récit <span className="font-normal text-muted-foreground">(facultatif)</span>
                </Label>
                <Textarea id="qr-body" value={draft.body} maxLength={20000} rows={4} placeholder="Sinon, la courte description est reprise." onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Photo de couverture</Label>
              <ImageField value={draft.cover} onChange={(cover) => setDraft((d) => ({ ...d, cover }))} prefix="realisation" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Photos et vidéos <span className="font-normal text-muted-foreground">({draft.media.length}/40)</span>
            </Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {draft.media.map((m, i) => (
                <div key={m.src + i} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  {m.type === "video" ? (
                    <span className="flex size-full items-center justify-center text-muted-foreground">
                      <Film className="size-6" />
                    </span>
                  ) : (
                    // biome-ignore lint/performance/noImgElement: uploaded images
                    <img src={m.src} alt="" className="size-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, media: d.media.filter((_, j) => j !== i) }))}
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 shadow"
                    aria-label="Retirer"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => mediaInput.current?.click()}
                disabled={uploading || draft.media.length >= 40}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-gold disabled:opacity-50"
              >
                {uploading ? <Spinner /> : <ImagePlus className="size-5" />} Ajouter
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Sélection multiple possible · JPG, PNG, WebP, MP4 ou WebM · 10 Mo maximum par fichier.</p>
            <input ref={mediaInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm" className="hidden" onChange={(e) => addMedia(e.target.files)} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Annuler
            </Button>
            <Button onClick={publish} disabled={busy}>
              {saving && <Spinner />} Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}
