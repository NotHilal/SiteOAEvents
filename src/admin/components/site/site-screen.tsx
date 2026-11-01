"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CategoriesPanel } from "./categories-panel";
import { AboutPanel, ImagesPanel } from "./content-panels";
import { RealisationsPanel } from "./realisations-panel";

const TABS = [
  { key: "catalogue", label: "Catalogue" },
  { key: "realisations", label: "Réalisations" },
  { key: "images", label: "Images & couleurs" },
  { key: "a-propos", label: "À propos" },
];

export function SiteScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params?.get("tab") || "";
  const tab = TABS.some((t) => t.key === requested) ? requested : "catalogue";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Site"
        description="Ce que voient vos clients : catégories du catalogue, réalisations, photos et textes."
        actions={
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noreferrer">
              <ExternalLink /> Ouvrir le site
            </a>
          </Button>
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
        <TabsContent value="realisations" className="mt-4">
          <RealisationsPanel />
        </TabsContent>
        <TabsContent value="images" className="mt-4">
          <ImagesPanel />
        </TabsContent>
        <TabsContent value="a-propos" className="mt-4">
          <AboutPanel />
        </TabsContent>
      </Tabs>
      <p className="text-sm text-muted-foreground">Les photos, prix et descriptions des articles se gèrent dans Matériel.</p>
    </div>
  );
}
