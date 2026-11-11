"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ExternalLink, PanelsTopLeft, Zap } from "lucide-react";

import { useQuickRealisation } from "@/components/realisations/quick-realisation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CategoriesPanel } from "./categories-panel";
import { HomeTilesPanel } from "./home-tiles-panel";
import { RealisationsPanel } from "./realisations-panel";

const TABS = [
  { key: "tuiles", label: "Tuiles de l'accueil" },
  { key: "catalogue", label: "Catégories" },
  { key: "realisations", label: "Réalisations" },
];

export function SiteScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params?.get("tab") || "";
  const tab = TABS.some((t) => t.key === requested) ? requested : "catalogue";
  const quick = useQuickRealisation();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Site"
        description="Catégories du catalogue, tuiles de l'accueil et réalisations."
        actions={
          <>
            <Button variant="outline" asChild>
              <a href="/" target="_blank" rel="noreferrer">
                <ExternalLink /> Ouvrir le site
              </a>
            </Button>
            <Button variant="outline" onClick={quick}>
              <Zap /> Nouvelle réalisation rapide
            </Button>
            <Button asChild>
              <Link href="/admin/contenu">
                <PanelsTopLeft /> Modifier les pages
              </Link>
            </Button>
          </>
        }
        className="mb-2"
      />
      <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })}>
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="px-4">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="catalogue" className="mt-4">
          <CategoriesPanel />
        </TabsContent>
        <TabsContent value="tuiles" className="mt-4">
          <HomeTilesPanel />
        </TabsContent>
        <TabsContent value="realisations" className="mt-4">
          <RealisationsPanel />
        </TabsContent>
      </Tabs>
      <p className="text-sm text-muted-foreground">
        Les textes, photos et couleurs des pages (accueil, à propos, contact, FAQ…) se modifient dans{" "}
        <Link href="/admin/contenu" className="underline underline-offset-4">
          Contenu des pages
        </Link>
        . Les photos, prix et descriptions des articles se gèrent dans Matériel.
      </p>
    </div>
  );
}
