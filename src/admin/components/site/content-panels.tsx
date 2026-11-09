"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/session";

// site_content rows (seeded by src/lib/db/seed.js) hold JSON read by the public pages.
async function readContent<T>(key: string, fallback: T): Promise<T> {
  const { data } = await api<{ data: { value: string | null } }>(`/api/admin/content?key=${encodeURIComponent(key)}`);
  try {
    return data.value ? { ...fallback, ...JSON.parse(data.value) } : fallback;
  } catch {
    return fallback;
  }
}
async function writeContent(key: string, value: unknown) {
  await api("/api/admin/content", { method: "PUT", json: { key, value } });
}

function useContent<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per key
  useEffect(() => {
    readContent(key, fallback).then(setValue).catch((e) => toast.error(e.message));
  }, [key]);
  return [value, setValue] as const;
}

const SLOT_GROUPS = [
  {
    key: "images_home",
    title: "Page d'accueil",
    description: "Bannière de l'accueil. Pour modifier une tuile, son titre ou sa photo, ouvrez l'onglet Tuiles de l'accueil.",
    slots: [
      { key: "univers_1", label: "Bannière « Organisation sur mesure »" },
    ],
  },
  { key: "images_contact", title: "Page Contact", description: "Bannière en haut de la page.", slots: [{ key: "page_header", label: "Bannière de page" }] },
];

export function ImagesPanel() {
  return (
    <div className="space-y-5">
      {SLOT_GROUPS.map((g) => (
        <SlotGroup key={g.key} group={g} />
      ))}
      <CategoryColors />
    </div>
  );
}

function SlotGroup({ group }: { group: (typeof SLOT_GROUPS)[number] }) {
  const [value, setValue] = useContent<Record<string, string | null>>(group.key, {});
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!value) return;
    setSaving(true);
    try {
      await writeContent(group.key, value);
      toast.success("Images enregistrées");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{group.title}</CardTitle>
        <CardDescription>{group.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!value ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.slots.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <Label>{s.label}</Label>
                <ImageField value={value[s.key] || ""} onChange={(url) => setValue({ ...value, [s.key]: url || null })} prefix="site" />
              </div>
            ))}
          </div>
        )}
        <Button onClick={save} disabled={saving || !value}>
          {saving && <Spinner />} Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}

const COLOR_DEFAULTS = { textColor: "#000000", hoverColor: "#b38d47" };

function CategoryColors() {
  const [value, setValue] = useContent("home_categories_style", COLOR_DEFAULTS);
  const [saving, setSaving] = useState(false);
  async function save(next: typeof COLOR_DEFAULTS) {
    setSaving(true);
    try {
      await writeContent("home_categories_style", next);
      setValue(next);
      toast.success("Couleurs enregistrées");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Couleurs des vignettes de l'accueil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {value && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["textColor", "Titres"],
                ["hoverColor", "Titres au survol"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex items-center gap-3 rounded-lg border p-3">
                <input type="color" value={value[k]} onChange={(e) => setValue({ ...value, [k]: e.target.value })} className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent" />
                <span>
                  <span className="block text-sm font-medium">{l}</span>
                  <span className="font-mono text-xs text-muted-foreground">{value[k]}</span>
                </span>
                <span className="ml-auto font-heading font-bold uppercase" style={{ color: value[k] }}>
                  Aperçu
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={() => value && save(value)} disabled={saving || !value}>
            {saving && <Spinner />} Enregistrer
          </Button>
          <Button variant="outline" onClick={() => save(COLOR_DEFAULTS)} disabled={saving}>
            Couleurs par défaut
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type About = {
  headline: string;
  story: string;
  photoUrl: string | null;
  headerImg: string | null;
  counters: { count: string; label: string }[];
  values: { title: string; text: string }[];
};

const ABOUT_DEFAULT: About = {
  headline: "",
  story: "",
  photoUrl: null,
  headerImg: null,
  counters: [
    { count: "", label: "" },
    { count: "", label: "" },
  ],
  values: Array.from({ length: 4 }, () => ({ title: "", text: "" })),
};

export function AboutPanel() {
  const [value, setValue] = useContent<About>("about_page", ABOUT_DEFAULT);
  const [saving, setSaving] = useState(false);
  if (!value) return <Skeleton className="h-96 rounded-xl" />;
  const counters = value.counters?.length === 2 ? value.counters : ABOUT_DEFAULT.counters;
  const values = value.values?.length === 4 ? value.values : ABOUT_DEFAULT.values;

  async function save() {
    if (!value) return;
    if (!value.headline.trim() || !value.story.trim()) return toast.error("Le titre et la présentation sont obligatoires.");
    setSaving(true);
    try {
      await writeContent("about_page", { ...value, counters, values });
      toast.success("Page À propos enregistrée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle className="font-heading">Page À propos</CardTitle>
        <CardDescription>
          Texte et photos de la page{" "}
          <a href="/a-propos" target="_blank" rel="noreferrer" className="underline underline-offset-4">
            /a-propos
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ab-h">Titre</Label>
          <Input id="ab-h" value={value.headline} onChange={(e) => setValue({ ...value, headline: e.target.value })} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ab-s">Présentation de l'entreprise</Label>
          <Textarea id="ab-s" value={value.story} rows={7} onChange={(e) => setValue({ ...value, story: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Photo (sinon le logo)</Label>
            <ImageField value={value.photoUrl || ""} onChange={(url) => setValue({ ...value, photoUrl: url || null })} prefix="about" />
          </div>
          <div className="space-y-1.5">
            <Label>Bannière de page (facultatif)</Label>
            <ImageField value={value.headerImg || ""} onChange={(url) => setValue({ ...value, headerImg: url || null })} prefix="about" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Chiffres clés</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {counters.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input value={c.count} placeholder="ex : 2026" className="w-28" onChange={(e) => setValue({ ...value, counters: counters.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)) })} />
                <Input value={c.label} placeholder="Légende" onChange={(e) => setValue({ ...value, counters: counters.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Nos valeurs</Label>
          {values.map((v, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
              <Input value={v.title} placeholder={`Titre ${i + 1}`} onChange={(e) => setValue({ ...value, values: values.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
              <Input value={v.text} placeholder="Description" onChange={(e) => setValue({ ...value, values: values.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
            </div>
          ))}
        </div>
        <Button size="lg" onClick={save} disabled={saving}>
          {saving && <Spinner />} Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}

export { readContent, writeContent };
