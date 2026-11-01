"use client";

import { useRef, useState } from "react";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { uploadFile } from "@/lib/db";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/** One photo: uploaded as soon as it's picked; `onChange(url | "")`. */
export function ImageField({ value, onChange, prefix = "admin", className, aspect = "aspect-[4/3]" }: { value: string; onChange: (url: string) => void; prefix?: string; className?: string; aspect?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadFile(file, prefix));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn("relative flex w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/40 transition hover:border-gold", aspect)}
      >
        {value ? (
          // biome-ignore lint/performance/noImgElement: uploaded images
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
            <ImagePlus className="size-6" /> Ajouter une photo
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Spinner className="size-6" />
          </span>
        )}
      </button>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          <Upload /> {value ? "Remplacer" : "Choisir"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={busy}>
            <Trash2 /> Retirer
          </Button>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

/** Several photos (gallery). */
export function GalleryField({ value, onChange, prefix = "admin" }: { value: string[]; onChange: (urls: string[]) => void; prefix?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (const f of Array.from(files)) added.push(await uploadFile(f, prefix));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      onChange([...value, ...added]);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {value.map((url, i) => (
        <div key={url + i} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
          {/* biome-ignore lint/performance/noImgElement: uploaded images */}
          <img src={url} alt="" className="size-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-background/90 text-destructive opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
            aria-label="Retirer cette photo"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-gold"
      >
        {busy ? <Spinner /> : <ImagePlus className="size-5" />} Ajouter
      </button>
      <input ref={input} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => pick(e.target.files)} />
    </div>
  );
}
