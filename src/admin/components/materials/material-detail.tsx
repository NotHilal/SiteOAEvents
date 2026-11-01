"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ArrowLeft, ExternalLink, ImageOff } from "lucide-react";

import { Pill } from "@/components/badges";
import { useBookingsChanged } from "@/components/booking/booking-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/use-fetch";
import { ttcFromHt } from "@/lib/catalog";
import { money } from "@/lib/format";
import { api } from "@/lib/session";
import { cn } from "@/lib/utils";

import { AvailabilityTab } from "./availability-tab";
import { DetailsTab } from "./details-tab";
import { PricingTab } from "./pricing-tab";
import { StockTab } from "./stock-tab";
import type { MaterialDetail } from "./types";

const TABS = [
  { key: "dispo", label: "Disponibilités" },
  { key: "stock", label: "Stock" },
  { key: "prix", label: "Prix" },
  { key: "fiche", label: "Fiche & photos" },
] as const;

export function MaterialDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params?.get("tab") || "";
  const tab = TABS.some((t) => t.key === requested) ? requested : "dispo";
  const [selected, setSelected] = useState(id);

  const { data, error, loading, reload } = useFetch(() => api<{ data: MaterialDetail }>(`/api/admin/material?id=${encodeURIComponent(id)}`).then((r) => r.data), [id]);
  useBookingsChanged(reload);
  useEffect(() => setSelected(id), [id]);

  if (error)
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="rounded-lg bg-danger-soft p-4 text-destructive">{error}</p>
      </div>
    );
  if (loading && !data)
    return (
      <div className="space-y-4">
        <BackLink />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  if (!data) return null;

  const variant = data.variants.find((v) => v.id === selected) || data.variants.find((v) => v.id === data.selectedId) || data.variants[0];
  const title = data.product ? data.product.name : variant.name;
  const slug = data.product?.slug || variant.slug;
  const minPrice = variant.tiers.length ? ttcFromHt(Math.min(...variant.tiers.map((t) => t.weekday))) : null;

  const setTab = (t: string) => router.replace(`${pathname}?tab=${t}`, { scroll: false });
  const changed = (selectId?: string) => {
    if (selectId) setSelected(selectId);
    reload();
  };

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex flex-wrap items-start gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-xl border bg-muted sm:size-24">
          {variant.image ? (
            // biome-ignore lint/performance/noImgElement: uploaded images
            <img src={variant.image} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{variant.category || "Sans catégorie"}</p>
          <h1 className="text-2xl font-bold md:text-[1.7rem]">{title}</h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill t={variant.online ? "green" : "gray"}>{variant.online ? "En ligne" : "Hors ligne"}</Pill>
            <Pill>Stock {variant.stock}</Pill>
            <Pill t={minPrice ? "gold" : "red"}>{minPrice ? `dès ${money(minPrice)}` : "Prix manquant"}</Pill>
          </div>
        </div>
        {slug && variant.online && (
          <Button variant="outline" asChild>
            <a href={`/catalogue/${slug}`} target="_blank" rel="noreferrer">
              <ExternalLink /> Voir sur le site
            </a>
          </Button>
        )}
      </div>

      {data.product && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Option :</span>
          {data.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelected(v.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                v.id === variant.id ? "border-foreground bg-foreground text-background" : "bg-card hover:border-gold",
              )}
            >
              {v.label || "Sans libellé"} <span className="opacity-60">· {v.stock}</span>
            </button>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="px-4">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="dispo" className="mt-4">
          <AvailabilityTab detail={data} variant={variant} />
        </TabsContent>
        <TabsContent value="stock" className="mt-4">
          <StockTab detail={data} variant={variant} onChanged={reload} />
        </TabsContent>
        <TabsContent value="prix" className="mt-4">
          <PricingTab variant={variant} onChanged={reload} />
        </TabsContent>
        <TabsContent value="fiche" className="mt-4">
          <DetailsTab detail={data} variant={variant} onChanged={changed} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/materiel" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" /> Tout le matériel
    </Link>
  );
}
