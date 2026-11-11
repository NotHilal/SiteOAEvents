"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ChevronRight, Eye, ExternalLink, Monitor, MousePointerClick, PencilLine, RefreshCw, RotateCcw, Smartphone, Tablet, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { useConfirm } from "@/components/confirm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fmt } from "@/lib/format";
import { api } from "@/lib/session";
import { cn } from "@/lib/utils";

// biome-ignore lint: plain JS modules shared with the public site
import { CMS_PAGES, cmsPageForPath } from "../../../lib/cms/schema.js";
// biome-ignore lint: plain JS modules shared with the public site
import { sectionDefaults } from "../../../lib/cms/resolve.js";

import { type CmsPage, type CmsSection, type Content, EditorUi, FieldEditor, fieldDomId } from "./field-editor";

const PAGES = CMS_PAGES as unknown as CmsPage[];
const pageById = (id: string) => PAGES.find((p) => p.id === id);

// Must match src/lib/cms/client.js (public side of the preview).
const FROM_SITE = "oa-cms";
const TO_SITE = "oa-cms-admin";

const DEVICES = {
  desktop: { width: 1440, label: "Ordinateur", icon: Monitor },
  tablet: { width: 834, label: "Tablette", icon: Tablet },
  mobile: { width: 390, label: "Mobile", icon: Smartphone },
} as const;
type Device = keyof typeof DEVICES;

type PageState = { saved: Content; draft: Content; updatedAt: string | null };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Contenu des pages: every editable text / photo / colour of the public
 *  pages, with the real site live-previewed next to the form. */
export function ContentEditor() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const confirm = useConfirm();
  const pageId = pageById(params?.get("page") || "")?.id || "home";
  const page = pageById(pageId) as CmsPage;

  const [pages, setPages] = useState<Record<string, PageState>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [previewPath, setPreviewPath] = useState(page.path);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [open, setOpenState] = useState<Record<string, boolean>>({});
  const iframe = useRef<HTMLIFrameElement>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const initialSrc = useRef(page.path);

  // ---- Loading ------------------------------------------------------------
  const load = useCallback(async (id: string) => {
    if (pagesRef.current[id]) return;
    try {
      const { data } = await api<{ data: { content: Content; updatedAt: string | null } }>(`/api/admin/pages?page=${id}`);
      setPages((p) => (p[id] ? p : { ...p, [id]: { saved: data.content, draft: data.content, updatedAt: data.updatedAt } }));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, []);

  useEffect(() => {
    load("global");
    load(pageId);
  }, [load, pageId]);

  const current = pages[pageId];
  const dirtyIds = useMemo(() => Object.keys(pages).filter((id) => !same(pages[id].saved, pages[id].draft)), [pages]);
  const dirty = dirtyIds.length > 0;

  // ---- Preview bridge ------------------------------------------------------
  const send = useCallback((message: Record<string, unknown>) => {
    iframe.current?.contentWindow?.postMessage({ source: TO_SITE, ...message }, window.location.origin);
  }, []);

  const sendDrafts = useCallback(() => {
    for (const [id, state] of Object.entries(pagesRef.current)) send({ type: "content", page: id, content: state.draft });
  }, [send]);

  // Every draft change is mirrored in the preview right away.
  useEffect(() => {
    sendDrafts();
  }, [pages, sendDrafts]);

  const navigatePreview = useCallback((path: string) => {
    setPreviewPath(path);
    setPreviewLoading(true);
    try {
      iframe.current?.contentWindow?.location.assign(path);
    } catch {
      if (iframe.current) iframe.current.src = path;
    }
  }, []);

  const selectPage = useCallback(
    (id: string, opts: { navigate?: boolean } = {}) => {
      const target = pageById(id);
      if (!target) return;
      router.replace(`${pathname}?page=${id}`, { scroll: false });
      if (opts.navigate !== false && id !== "global") navigatePreview(target.path);
    },
    [navigatePreview, pathname, router],
  );

  const setOpen = useCallback((path: string, value: boolean) => setOpenState((o) => ({ ...o, [path]: value })), []);

  // A click on the preview opens the matching field in the form.
  const revealField = useCallback(
    (targetPage: string, path: string) => {
      const parts = path.split(".");
      setOpenState((o) => {
        const next = { ...o, [`section:${parts[0]}`]: true };
        for (let i = 3; i <= parts.length; i += 1) if (/^\d+$/.test(parts[i - 1])) next[parts.slice(0, i).join(".")] = true;
        return next;
      });
      setMobileView("edit");
      // Wait for the sections to open, then go to the deepest existing field.
      setTimeout(() => {
        for (let n = parts.length; n > 0; n -= 1) {
          const el = document.getElementById(fieldDomId(parts.slice(0, n).join(".")));
          if (!el) continue;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.remove("cms-flash");
          void el.offsetWidth;
          el.classList.add("cms-flash");
          el.querySelector<HTMLElement>("input:not([type=file]):not([type=color]), textarea")?.focus({ preventScroll: true });
          break;
        }
      }, 80);
      if (targetPage !== pageId) selectPage(targetPage, { navigate: false });
    },
    [pageId, selectPage],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.source !== FROM_SITE) return;
      if (event.data.type === "ready") {
        setPreviewLoading(false);
        const path = String(event.data.path || "/");
        setPreviewPath(path);
        sendDrafts();
        // Browsing to another editable page in the preview switches the form too.
        const shown = cmsPageForPath(path) as CmsPage | null;
        if (shown && shown.id !== pageId && pageId !== "global") selectPage(shown.id, { navigate: false });
      }
      if (event.data.type === "focus" && typeof event.data.target === "string") {
        const [target, path] = event.data.target.split(":");
        if (pageById(target) && path) {
          load(target);
          revealField(target, path);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [load, pageId, revealField, selectPage, sendDrafts]);

  const onFocusPath = useCallback((path: string) => send({ type: "highlight", target: `${pageId}:${path}` }), [pageId, send]);

  // ---- Editing ---------------------------------------------------------------
  const setDraft = (id: string, updater: (c: Content) => Content) =>
    setPages((p) => (p[id] ? { ...p, [id]: { ...p[id], draft: updater(p[id].draft) } } : p));

  const setField = (sectionId: string, fieldId: string, value: unknown) =>
    setDraft(pageId, (c) => ({ ...c, [sectionId]: { ...c[sectionId], [fieldId]: value } }));

  async function resetSection(section: CmsSection) {
    const ok = await confirm({
      title: `Remettre « ${section.label} » d'origine ?`,
      description: "Les textes et photos d'origine de cette partie reviennent dans le formulaire. Rien n'est publié avant de cliquer sur Publier.",
      confirm: "Remettre d'origine",
    });
    if (ok) setDraft(pageId, (c) => ({ ...c, [section.id]: sectionDefaults(pageId, section.id) as Record<string, unknown> }));
  }

  function discard() {
    setPages((p) => Object.fromEntries(Object.entries(p).map(([id, s]) => [id, { ...s, draft: s.saved }])));
    toast("Modifications annulées");
  }

  const publish = useCallback(async () => {
    const ids = Object.keys(pagesRef.current).filter((id) => !same(pagesRef.current[id].saved, pagesRef.current[id].draft));
    if (!ids.length || saving) return;
    setSaving(true);
    try {
      for (const id of ids) {
        const { data } = await api<{ data: { content: Content; updatedAt: string | null } }>("/api/admin/pages", {
          method: "PUT",
          json: { page: id, content: pagesRef.current[id].draft },
        });
        setPages((p) => ({ ...p, [id]: { saved: data.content, draft: data.content, updatedAt: data.updatedAt } }));
      }
      toast.success(ids.length > 1 ? `${ids.length} pages publiées sur le site` : "Publié sur le site");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publication impossible.");
    } finally {
      setSaving(false);
    }
  }, [saving]);

  // Ctrl/Cmd + S publishes; leaving with unpublished changes asks first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        publish();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [dirty, publish]);

  // Small screens preview the site at phone size.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setDevice("mobile");
  }, []);

  // ---- Preview scaling -------------------------------------------------------
  const stage = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setStageSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const deviceWidth = DEVICES[device].width;
  const pad = device === "desktop" ? 0 : 24;
  const scale = stageSize.w ? Math.min(1, (stageSize.w - pad * 2) / deviceWidth) : 1;
  const frameHeight = Math.max(200, (stageSize.h - pad * 2) / scale);

  const isOpen = useCallback((path: string, fallback: boolean) => open[path] ?? fallback, [open]);
  const ui = useMemo(() => ({ isOpen, setOpen, onFocusPath }), [isOpen, setOpen, onFocusPath]);

  return (
    <div className="-m-4 flex h-[calc(100svh-3.5rem)] min-h-0 flex-col md:-m-6 lg:-m-8 lg:flex-row">
      {/* Small screens: switch between the form and the preview. */}
      <div className="flex shrink-0 gap-1 border-b bg-background p-2 lg:hidden">
        <Button size="sm" variant={mobileView === "edit" ? "secondary" : "ghost"} className="flex-1" onClick={() => setMobileView("edit")}>
          <PencilLine /> Modifier
        </Button>
        <Button size="sm" variant={mobileView === "preview" ? "secondary" : "ghost"} className="flex-1" onClick={() => setMobileView("preview")}>
          <Eye /> Aperçu
        </Button>
      </div>

      {/* ---- Form ---- */}
      <aside className={cn("flex min-h-0 w-full flex-1 flex-col border-r bg-background lg:flex lg:flex-none lg:shrink-0 lg:w-[26rem] xl:w-[29rem]", mobileView === "preview" && "hidden")}>
        <div className="space-y-3 border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-heading text-lg font-bold">Contenu des pages</h1>
            {dirty ? (
              <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
                Non publié
              </Badge>
            ) : (
              current && <Badge variant="outline" className="text-muted-foreground">À jour</Badge>
            )}
          </div>
          <Select value={pageId} onValueChange={(id) => selectPage(id)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Pages</SelectLabel>
                {PAGES.filter((p) => p.id !== "global").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                    {dirtyIds.includes(p.id) && " •"}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Toutes les pages</SelectLabel>
                <SelectItem value="global">
                  {pageById("global")?.label}
                  {dirtyIds.includes("global") && " •"}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MousePointerClick className="size-3.5 shrink-0" /> Cliquez sur un texte dans l'aperçu pour le modifier.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/30 p-3">
          {loadError && <p className="m-1 rounded-lg bg-danger-soft p-3 text-sm text-destructive">{loadError}</p>}
          {!current ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : (
            <EditorUi.Provider value={ui}>
              <div className="space-y-2">
                {page.sections.map((section) => {
                  const key = `section:${section.id}`;
                  // The first section after "Référencement" starts open.
                  const isSectionOpen = open[key] ?? section === page.sections.find((s) => s.id !== "seo");
                  const changed = !same(current.draft[section.id], current.saved[section.id]);
                  return (
                    <section key={section.id} className="overflow-hidden rounded-xl border bg-background shadow-xs">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-3 text-left"
                        aria-expanded={isSectionOpen}
                        onClick={() => {
                          setOpen(key, !isSectionOpen);
                          if (!isSectionOpen) onFocusPath(section.id);
                        }}
                      >
                        <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isSectionOpen && "rotate-90")} />
                        <span className="flex-1 font-heading text-sm font-semibold">{section.label}</span>
                        {changed && <span className="size-2 rounded-full bg-gold" title="Modifié" />}
                      </button>
                      {isSectionOpen && (
                        <div className="space-y-4 border-t px-4 pt-3 pb-4">
                          {section.description && <p className="text-xs text-muted-foreground">{section.description}</p>}
                          {section.fields.map((field) => (
                            <FieldEditor
                              key={field.id}
                              field={field}
                              value={current.draft[section.id]?.[field.id]}
                              path={`${section.id}.${field.id}`}
                              onChange={(v) => setField(section.id, field.id, v)}
                            />
                          ))}
                          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => resetSection(section)}>
                            <RotateCcw /> Remettre d'origine
                          </Button>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </EditorUi.Provider>
          )}
        </div>

        <div className="flex items-center gap-2 border-t bg-background p-3">
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {dirty
              ? `${dirtyIds.length > 1 ? `${dirtyIds.length} pages modifiées` : "Modifications en cours"} · Ctrl+S`
              : current?.updatedAt
                ? `Publié le ${fmt(current.updatedAt.slice(0, 10), "d MMM yyyy")}`
                : "Textes d'origine"}
          </p>
          <Button variant="ghost" size="sm" onClick={discard} disabled={!dirty || saving}>
            <Undo2 /> Annuler
          </Button>
          <Button onClick={publish} disabled={!dirty || saving}>
            {saving && <Spinner />} Publier
          </Button>
        </div>
      </aside>

      {/* ---- Live preview ---- */}
      <main className={cn("flex min-h-0 min-w-0 flex-1 flex-col bg-muted/60", mobileView === "edit" && "hidden lg:flex")}>
        <div className="flex shrink-0 items-center gap-2 border-b bg-background px-3 py-2">
          <ToggleGroup type="single" value={device} onValueChange={(v) => v && setDevice(v as Device)} variant="outline" size="sm">
            {(Object.keys(DEVICES) as Device[]).map((d) => {
              const Icon = DEVICES[d].icon;
              return (
                <Tooltip key={d}>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem value={d} aria-label={DEVICES[d].label}>
                      <Icon />
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>{DEVICES[d].label}</TooltipContent>
                </Tooltip>
              );
            })}
          </ToggleGroup>
          <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/50 px-3 text-xs text-muted-foreground">
            {previewLoading ? <Spinner className="size-3.5" /> : <span className="size-2 shrink-0 rounded-full bg-success" />}
            <span className="truncate font-mono">{previewPath}</span>
            {dirty && <span className="ml-auto shrink-0 rounded bg-warning/15 px-1.5 py-0.5 font-sans font-medium text-warning">Brouillon</span>}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Recharger l'aperçu"
                onClick={() => {
                  setPreviewLoading(true);
                  iframe.current?.contentWindow?.location.reload();
                }}
              >
                <RefreshCw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Recharger</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" asChild>
                <a href={previewPath} target="_blank" rel="noreferrer" aria-label="Ouvrir la page publiée">
                  <ExternalLink />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ouvrir la page publiée</TooltipContent>
          </Tooltip>
        </div>

        <div ref={stage} className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className={cn("absolute top-0 left-1/2 origin-top -translate-x-1/2", device !== "desktop" && "top-6")}
            style={{ width: deviceWidth * scale, height: frameHeight * scale }}
          >
            <iframe
              ref={iframe}
              title="Aperçu du site"
              src={initialSrc.current}
              onLoad={() => {
                setPreviewLoading(false);
                sendDrafts();
              }}
              className={cn("block origin-top-left border-0 bg-white", device !== "desktop" && "rounded-[18px] shadow-2xl ring-8 ring-foreground/85")}
              style={{ width: deviceWidth, height: frameHeight, transform: `scale(${scale})` }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
