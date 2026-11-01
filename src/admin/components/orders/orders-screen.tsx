"use client";

import { useMemo, useState } from "react";

import { Lock, ReceiptText, Search } from "lucide-react";

import { KindBadge, PaymentBadge, StateBadge } from "@/components/badges";
import { useBookings, useBookingsChanged } from "@/components/booking/booking-provider";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFetch } from "@/hooks/use-fetch";
import { fmtRange, money, normalize, todayISO } from "@/lib/format";
import { api } from "@/lib/session";
import type { Booking } from "@/lib/types";

type Tab = "upcoming" | "now" | "past" | "cancelled" | "all";
type Source = "all" | "site" | "manual" | "block";

const label = (b: Booking) => (b.kind === "block" ? b.title || "Blocage" : b.client.name || b.client.email || "Client");
const summary = (b: Booking) => b.materials.map((m) => `${m.quantity} × ${m.name}`).join(", ");

export function OrdersScreen() {
  const today = todayISO();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [source, setSource] = useState<Source>("all");
  const [q, setQ] = useState("");
  const { newBooking, openBooking } = useBookings();
  const { data, loading, error, reload } = useFetch(() => api<{ data: Booking[] }>("/api/admin/bookings").then((r) => r.data), []);
  useBookingsChanged(reload);

  const all = data || [];
  const inTab = (b: Booking, t: Tab) => {
    const dead = ["cancelled", "expired", "refused"].includes(b.status);
    if (t === "all") return true;
    if (t === "cancelled") return b.status === "cancelled" || b.status === "refused";
    if (dead) return false;
    if (t === "now") return !!b.from && b.from <= today && (b.to || b.from) >= today;
    if (t === "upcoming") return !!b.from && b.from > today;
    return !!b.to && b.to < today;
  };

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { upcoming: 0, now: 0, past: 0, cancelled: 0, all: 0 };
    for (const b of all) for (const t of Object.keys(c) as Tab[]) if (inTab(b, t) && (source === "all" || b.kind === source)) c[t]++;
    return c;
    // biome-ignore lint/correctness/useExhaustiveDependencies: derived from data
  }, [all, source, today]);

  const rows = useMemo(() => {
    const query = normalize(q);
    const list = all.filter(
      (b) =>
        inTab(b, tab) &&
        (source === "all" || b.kind === source) &&
        (!query || normalize([b.reference, label(b), b.client.email, b.client.phone, summary(b), b.address].join(" ")).includes(query)),
    );
    const asc = tab === "upcoming" || tab === "now";
    return list.sort((a, b) => (asc ? 1 : -1) * (a.from || "").localeCompare(b.from || ""));
    // biome-ignore lint/correctness/useExhaustiveDependencies: derived from data
  }, [all, tab, source, q]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Commandes"
        description="Commandes du site, commandes manuelles et blocages, au même endroit."
        actions={
          <>
            <Button variant="outline" onClick={() => newBooking({ kind: "block" })}>
              <Lock /> Blocage
            </Button>
            <Button onClick={() => newBooking({ kind: "manual" })}>
              <ReceiptText /> Nouvelle commande
            </Button>
          </>
        }
        className="mb-2"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="upcoming">À venir · {counts.upcoming}</TabsTrigger>
            <TabsTrigger value="now">En cours · {counts.now}</TabsTrigger>
            <TabsTrigger value="past">Passées · {counts.past}</TabsTrigger>
            <TabsTrigger value="cancelled">Annulées · {counts.cancelled}</TabsTrigger>
            <TabsTrigger value="all">Toutes</TabsTrigger>
          </TabsList>
        </Tabs>
        <ToggleGroup type="single" variant="outline" size="sm" value={source} onValueChange={(v) => v && setSource(v as Source)}>
          <ToggleGroupItem value="all" className="px-3">Tout</ToggleGroupItem>
          <ToggleGroupItem value="site" className="px-3">Site</ToggleGroupItem>
          <ToggleGroupItem value="manual" className="px-3">Manuelles</ToggleGroupItem>
          <ToggleGroupItem value="block" className="px-3">Blocages</ToggleGroupItem>
        </ToggleGroup>
        <div className="relative lg:ml-auto lg:w-80">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, n° de commande, téléphone, article…" className="pl-8" />
        </div>
      </div>

      {error && <p className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
      {loading && !data ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : rows.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyTitle>Rien ici</EmptyTitle>
            <EmptyDescription>{q ? "Aucun résultat pour cette recherche." : "Aucune commande dans cette liste."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-4">Dates</TableHead>
                  <TableHead>Client / intitulé</TableHead>
                  <TableHead>Matériel</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="pr-4 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => (
                  <TableRow key={b.id} onClick={() => openBooking(b.id)} className="cursor-pointer">
                    <TableCell className="pl-4 font-medium whitespace-nowrap">{fmtRange(b.from, b.to)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="max-w-56 truncate font-semibold">{label(b)}</span>
                        <KindBadge kind={b.kind} />
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{b.reference}</div>
                    </TableCell>
                    <TableCell className="max-w-72">
                      <span className="line-clamp-2 text-sm text-muted-foreground">{summary(b)}</span>
                    </TableCell>
                    <TableCell>
                      <StateBadge booking={b} today={today} />
                    </TableCell>
                    <TableCell>
                      <PaymentBadge status={b.paymentStatus} />
                    </TableCell>
                    <TableCell className="pr-4 text-right font-semibold tabular-nums">{b.kind === "block" ? "—" : money(b.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <ul className="space-y-2 md:hidden">
            {rows.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => openBooking(b.id)} className="w-full rounded-xl border bg-card p-3.5 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{label(b)}</p>
                      <p className="text-sm">{fmtRange(b.from, b.to)}</p>
                    </div>
                    {b.kind !== "block" && <span className="font-semibold tabular-nums">{money(b.total)}</span>}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{summary(b)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <KindBadge kind={b.kind} />
                    <StateBadge booking={b} today={today} />
                    <PaymentBadge status={b.paymentStatus} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
