"use client";

import { useMemo, useState } from "react";

import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, LayoutGrid, Lock, Package, ReceiptText, Search, X } from "lucide-react";

import { useBookings, useBookingsChanged } from "@/components/booking/booking-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFetch } from "@/hooks/use-fetch";
import { addDaysISO, daysBetween, fmt, fromISO, normalize, toISO, todayISO } from "@/lib/format";
import { api } from "@/lib/session";
import type { Planning, PlanningMaterial } from "@/lib/types";
import { cn } from "@/lib/utils";

import { DaySheet } from "./day-sheet";
import { KIND_CHIP, stockTone } from "./stock-cell";

type View = "month" | "timeline";

function monthGrid(cursor: string) {
  const d = fromISO(cursor);
  const from = toISO(startOfWeek(startOfMonth(d), { weekStartsOn: 1 }));
  const to = toISO(endOfWeek(endOfMonth(d), { weekStartsOn: 1 }));
  return { from, to };
}

export function CalendarScreen() {
  const today = todayISO();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(today.slice(0, 8) + "01");
  const [timelineStart, setTimelineStart] = useState(today);
  const [span, setSpan] = useState(14);
  const [category, setCategory] = useState("");
  const [product, setProduct] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [dayMaterial, setDayMaterial] = useState<string | null>(null);
  const { newBooking, openBooking } = useBookings();

  const range = view === "month" ? monthGrid(cursor) : { from: timelineStart, to: addDaysISO(timelineStart, span - 1) };
  const { data: planning, loading, error, reload } = useFetch(
    () => api<{ data: Planning }>(`/api/admin/planning?from=${range.from}&to=${range.to}`).then((r) => r.data),
    [range.from, range.to],
  );
  useBookingsChanged(reload);

  const materials = planning?.materials || [];
  const categories = useMemo(() => [...new Set(materials.map((m) => m.category))], [materials]);
  const productObj = materials.find((m) => m.id === product) || null;

  const visibleMaterials = useMemo(() => {
    const q = normalize(search);
    return materials.filter((m) => (!category || m.category === category) && (!product || m.id === product) && (!q || normalize(m.name).includes(q)));
  }, [materials, category, product, search]);

  function shift(dir: number) {
    if (view === "month") {
      const d = fromISO(cursor);
      d.setMonth(d.getMonth() + dir);
      setCursor(toISO(d).slice(0, 8) + "01");
    } else setTimelineStart(addDaysISO(timelineStart, dir * span));
  }
  function goToday() {
    setCursor(today.slice(0, 8) + "01");
    setTimelineStart(today);
  }

  const title = view === "month" ? fmt(cursor, "MMMM yyyy") : `${fmt(range.from, "d MMM")} → ${fmt(range.to, "d MMM yyyy")}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Calendrier"
        description="Qui a quoi, quand — et ce qu'il reste en stock chaque jour."
        actions={
          <>
            <Button variant="outline" onClick={() => newBooking({ kind: "manual", items: product ? [{ id: product, quantity: 1 }] : [] })}>
              <ReceiptText /> Commande
            </Button>
            <Button onClick={() => newBooking({ kind: "block", items: product ? [{ id: product, quantity: 1 }] : [] })}>
              <Lock /> Bloquer du matériel
            </Button>
          </>
        }
        className="mb-2"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
        <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v as View)}>
          <ToggleGroupItem value="month" className="gap-1.5 px-3">
            <LayoutGrid className="size-4" /> Mois
          </ToggleGroupItem>
          <ToggleGroupItem value="timeline" className="gap-1.5 px-3">
            <CalendarRange className="size-4" /> Planning stock
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Précédent">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Aujourd'hui
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Suivant">
            <ChevronRight />
          </Button>
        </div>
        <span className="min-w-36 font-heading text-base font-semibold capitalize">{title}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {view === "timeline" && (
            <NativeSelect value={String(span)} onChange={(e) => setSpan(Number(e.target.value))} aria-label="Durée affichée" className="w-32">
              <NativeSelectOption value="7">7 jours</NativeSelectOption>
              <NativeSelectOption value="14">14 jours</NativeSelectOption>
              <NativeSelectOption value="31">31 jours</NativeSelectOption>
            </NativeSelect>
          )}
          <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie" className="w-44">
            <NativeSelectOption value="">Toutes catégories</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <ProductFilter materials={category ? materials.filter((m) => m.category === category) : materials} value={productObj} onChange={setProduct} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", KIND_CHIP.site)} /> Commande site</span>
        <span className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", KIND_CHIP.manual)} /> Commande manuelle</span>
        <span className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm", KIND_CHIP.block)} /> Blocage</span>
        <span className="mx-1 h-3 w-px bg-border" />
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-success-soft ring-1 ring-success/30" /> Stock OK</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-warning-soft ring-1 ring-warning/30" /> Bientôt épuisé</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-danger-soft ring-1 ring-destructive/30" /> Épuisé</span>
      </div>

      {error && <p className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
      {loading && !planning ? (
        <Skeleton className="h-[560px] rounded-xl" />
      ) : planning ? (
        view === "month" ? (
          <MonthView
            planning={planning}
            cursor={cursor}
            today={today}
            product={productObj}
            category={category}
            onDay={(d) => {
              setDay(d);
              setDayMaterial(product);
            }}
            onEvent={openBooking}
          />
        ) : (
          <>
            {!product && (
              <div className="relative max-w-xs">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrer les articles…" className="pl-8" />
              </div>
            )}
            <TimelineView
              planning={planning}
              materials={visibleMaterials}
              today={today}
              onCell={(d, m) => {
                setDay(d);
                setDayMaterial(m);
              }}
            />
          </>
        )
      ) : null}

      <DaySheet day={day} planning={planning} materialFilter={dayMaterial} onOpenChange={(o) => !o && setDay(null)} onChanged={reload} />
    </div>
  );
}

function ProductFilter({ materials, value, onChange }: { materials: PlanningMaterial[]; value: PlanningMaterial | null; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={value ? "default" : "outline"} className={cn("max-w-64 justify-start", value && "rounded-r-none")}>
            <Package /> <span className="truncate">{value ? value.name : "Tous les produits"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <Command>
            <CommandInput placeholder="Chercher un produit…" />
            <CommandList className="max-h-80">
              <CommandEmpty>Aucun produit.</CommandEmpty>
              <CommandGroup>
                {materials.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={m.name}
                    onSelect={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                  >
                    {m.name}
                    <span className="ml-auto text-xs text-muted-foreground">stock {m.stock}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button className="rounded-l-none border-l border-background/20" size="icon" onClick={() => onChange(null)} aria-label="Retirer le filtre produit">
          <X />
        </Button>
      )}
    </div>
  );
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function MonthView({
  planning,
  cursor,
  today,
  product,
  category,
  onDay,
  onEvent,
}: {
  planning: Planning;
  cursor: string;
  today: string;
  product: PlanningMaterial | null;
  category: string;
  onDay: (d: string) => void;
  onEvent: (id: string) => void;
}) {
  const days = daysBetween(planning.from, planning.to);
  const month = cursor.slice(0, 7);
  const catIds = category ? new Set(planning.materials.filter((m) => m.category === category).map((m) => m.id)) : null;
  const closures = new Set(planning.closures.map((c) => c.date));

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const inMonth = d.slice(0, 7) === month;
          const events = planning.events.filter(
            (e) => e.days.includes(d) && (!product || e.materials.some((m) => m.id === product.id)) && (!catIds || e.materials.some((m) => catIds.has(m.id))),
          );
          const used = product ? planning.usage[d]?.[product.id] || 0 : 0;
          const left = product ? product.stock - used : 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onDay(d)}
              className={cn(
                "group relative flex min-h-24 flex-col gap-1 border-b p-1.5 text-left transition-colors hover:bg-gold-soft/50 sm:min-h-28 sm:p-2",
                i % 7 !== 6 && "border-r",
                !inMonth && "bg-muted/30 text-muted-foreground/60",
                closures.has(d) && "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,var(--muted)_6px,var(--muted)_8px)]",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                    d === today && "bg-gold text-foreground",
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                {closures.has(d) && <span className="text-[10px] font-semibold uppercase text-muted-foreground">Fermé</span>}
              </div>
              {product && (
                <span className={cn("rounded-md px-1.5 py-0.5 text-center text-xs font-bold tabular-nums sm:text-sm", stockTone(left, product.stock, used))}>
                  {left}
                  <span className="font-normal opacity-70">/{product.stock}</span>
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                {events.slice(0, product ? 2 : 3).map((e) => (
                  <span
                    key={e.id}
                    role="link"
                    tabIndex={-1}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onEvent(e.id);
                    }}
                    className={cn("hidden truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight sm:block", KIND_CHIP[e.kind], e.from === d && "font-semibold")}
                    title={e.materials.map((m) => `${m.quantity} × ${m.name}`).join(", ")}
                  >
                    {e.kind === "block" ? e.title || "Blocage" : e.client.name || e.reference}
                  </span>
                ))}
                {events.length > 0 && (
                  <span className="flex gap-0.5 sm:hidden">
                    {events.slice(0, 4).map((e) => (
                      <span key={e.id} className={cn("size-1.5 rounded-full", KIND_CHIP[e.kind])} />
                    ))}
                  </span>
                )}
                {events.length > (product ? 2 : 3) && (
                  <span className="hidden text-[11px] text-muted-foreground sm:block">+{events.length - (product ? 2 : 3)} autre{events.length - (product ? 2 : 3) > 1 ? "s" : ""}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimelineView({
  planning,
  materials,
  today,
  onCell,
}: {
  planning: Planning;
  materials: PlanningMaterial[];
  today: string;
  onCell: (day: string, materialId: string) => void;
}) {
  const days = daysBetween(planning.from, planning.to);
  const closures = new Set(planning.closures.map((c) => c.date));
  if (!materials.length) return <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Aucun article ne correspond.</p>;

  let lastCategory = "";
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 min-w-48 bg-muted px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:min-w-60">Article</th>
            {days.map((d) => {
              const dow = fromISO(d).getDay();
              return (
                <th
                  key={d}
                  className={cn(
                    "min-w-12 px-1 py-1.5 text-center text-[11px] font-medium leading-tight text-muted-foreground",
                    (dow === 0 || dow === 6) && "bg-muted",
                    d === today && "bg-gold-soft text-gold-ink",
                  )}
                >
                  <div className="uppercase">{fmt(d, "EEE")}</div>
                  <div className="text-sm font-bold text-foreground">{Number(d.slice(8))}</div>
                  {closures.has(d) && <div className="text-[9px] font-semibold uppercase">fermé</div>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => {
            const header = m.category !== lastCategory;
            lastCategory = m.category;
            return [
              header && (
                <tr key={`h-${m.category}`} className="bg-muted/30">
                  <td colSpan={days.length + 1} className="sticky left-0 px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {m.category}
                  </td>
                </tr>
              ),
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="sticky left-0 z-10 border-r bg-card px-3 py-1.5">
                  <div className="truncate font-medium" title={m.name}>
                    {m.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    stock {m.stock}
                    {!m.online && " · hors ligne"}
                  </div>
                </td>
                {days.map((d) => {
                  const used = planning.usage[d]?.[m.id] || 0;
                  const left = m.stock - used;
                  return (
                    <td key={d} className={cn("p-0.5 text-center", d === today && "bg-gold-soft/40")}>
                      <button
                        type="button"
                        onClick={() => onCell(d, m.id)}
                        title={`${fmt(d, "EEE d MMM")} — ${used} réservé${used > 1 ? "s" : ""}, ${left} restant${left > 1 ? "s" : ""}`}
                        className={cn("h-9 w-full rounded-md text-xs font-semibold tabular-nums transition hover:ring-2 hover:ring-gold", stockTone(left, m.stock, used))}
                      >
                        {used === 0 ? "·" : left}
                      </button>
                    </td>
                  );
                })}
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
