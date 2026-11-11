"use client";

import Link from "next/link";

import { AlertTriangle, ArrowRight, CalendarCheck2, Camera, Coins, Lock, Mail, PackageCheck, ReceiptText, Truck, Undo2, Wallet } from "lucide-react";

import { KindBadge, PaymentBadge } from "@/components/badges";
import { useBookings, useBookingsChanged } from "@/components/booking/booking-provider";
import { useQuickRealisation } from "@/components/realisations/quick-realisation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { fmt, fmtRange, money, plural } from "@/lib/format";
import { api } from "@/lib/session";
import type { Booking } from "@/lib/types";
import { cn } from "@/lib/utils";

type Overview = {
  today: string;
  deliveries: Booking[];
  returns: Booking[];
  ongoing: Booking[];
  upcoming: Booking[];
  toCollect: Booking[];
  awaitingPayment: number;
  unreadMessages: number;
  revenue: number;
  collected: number;
  activeCount: number;
  shortages: { materialId: string; name: string; stock: number; firstDay: string; days: number; overbooked: number }[];
};

const who = (b: Booking) => (b.kind === "block" ? b.title || "Blocage" : b.client.name || b.reference || "Client");

export function DashboardScreen() {
  const { newBooking, openBooking } = useBookings();
  const newRealisation = useQuickRealisation();
  const { data, error, loading, reload } = useFetch(() => api<{ data: Overview }>("/api/admin/overview").then((r) => r.data), []);
  useBookingsChanged(reload);

  if (error) return <p className="rounded-lg bg-danger-soft p-4 text-destructive">{error}</p>;
  if (loading && !data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  if (!data) return null;

  const todayCount = data.deliveries.length + data.returns.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium capitalize text-muted-foreground">{fmt(data.today, "EEEE d MMMM yyyy")}</p>
          <h1 className="text-2xl font-bold md:text-[1.7rem]">Bonjour 👋</h1>
          <p className="text-muted-foreground">
            {todayCount ? `${plural(data.deliveries.length, "livraison")} et ${plural(data.returns.length, "reprise")} aujourd'hui.` : "Pas de livraison ni de reprise aujourd'hui."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={newRealisation}>
            <Camera /> Nouvelle réalisation
          </Button>
          <Button variant="outline" onClick={() => newBooking({ kind: "block" })}>
            <Lock /> Bloquer du matériel
          </Button>
          <Button onClick={() => newBooking({ kind: "manual" })}>
            <ReceiptText /> Nouvelle commande
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={CalendarCheck2} label="Commandes en cours / à venir" value={String(data.activeCount)} href="/admin/commandes" />
        <Kpi icon={Coins} label="Chiffre d'affaires du mois" value={money(data.revenue)} hint="événements de ce mois" />
        <Kpi icon={Wallet} label="Encaissé ce mois" value={money(data.collected)} />
        <Kpi icon={Mail} label="Messages non lus" value={String(data.unreadMessages)} href="/admin/clients?tab=messages" accent={data.unreadMessages > 0} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="min-w-0 xl:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading">Aujourd'hui</CardTitle>
            <CardDescription>Ce qui part, ce qui revient, ce qui est chez les clients.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-3">
            <Column icon={Truck} title="À livrer" items={data.deliveries} empty="Aucune livraison" onOpen={openBooking} />
            <Column icon={Undo2} title="À récupérer" items={data.returns} empty="Aucune reprise" onOpen={openBooking} />
            <Column icon={PackageCheck} title="En location" items={data.ongoing} empty="Rien en cours" onOpen={openBooking} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <AlertTriangle className="size-4 text-warning" /> Ruptures (30 jours)
            </CardTitle>
            <CardDescription>Articles complets sur au moins un jour.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.shortages.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Aucune rupture prévue 👍</p>
            ) : (
              <ul className="divide-y">
                {data.shortages.map((s) => (
                  <li key={s.materialId}>
                    <Link href={`/admin/materiel/${encodeURIComponent(s.materialId)}`} className="flex items-center justify-between gap-2 py-2.5 hover:underline">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          dès le {fmt(s.firstDay, "d MMM")} · {plural(s.days, "jour")}
                        </span>
                      </span>
                      {s.overbooked > 0 ? (
                        <span className="shrink-0 rounded-md bg-danger-soft px-2 py-0.5 text-xs font-semibold text-destructive">+{s.overbooked} en trop</span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">complet</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading">Les 7 prochains jours</CardTitle>
              <CardDescription>{plural(data.upcoming.length, "réservation")}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/calendrier">
                Calendrier <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Rien de prévu cette semaine.</p>
            ) : (
              <ul className="divide-y">
                {data.upcoming.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => openBooking(b.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/40">
                      <span className="w-14 shrink-0 text-center">
                        <span className="block text-xs uppercase text-muted-foreground">{fmt(b.from, "EEE")}</span>
                        <span className="block font-heading text-xl font-bold leading-none">{fmt(b.from, "d")}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{who(b)}</span>
                        <span className="block truncate text-xs text-muted-foreground">{b.materials.map((m) => `${m.quantity} × ${m.name}`).join(", ")}</span>
                      </span>
                      <span className="hidden flex-col items-end gap-1 sm:flex">
                        <KindBadge kind={b.kind} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">À encaisser</CardTitle>
            <CardDescription>Commandes manuelles pas encore réglées.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.toCollect.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Tout est encaissé.</p>
            ) : (
              <ul className="divide-y">
                {data.toCollect.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => openBooking(b.id)} className="flex w-full items-center justify-between gap-2 py-2.5 text-left hover:bg-muted/40">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{who(b)}</span>
                        <span className="text-xs text-muted-foreground">{fmtRange(b.from, b.to)}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums">{money((b.total || 0) - b.amountPaid)}</span>
                        <PaymentBadge status={b.paymentStatus} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, href, accent }: { icon: React.ElementType; label: string; value: string; hint?: string; href?: string; accent?: boolean }) {
  const body = (
    <div className={cn("h-full rounded-xl border bg-card p-4 transition", href && "hover:border-gold", accent && "border-gold bg-gold-soft/50")}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        <Icon className="size-4" />
      </div>
      <p className="mt-2 font-heading text-2xl font-bold tabular-nums md:text-3xl">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Column({ icon: Icon, title, items, empty, onOpen }: { icon: React.ElementType; title: string; items: Booking[]; empty: string; onOpen: (id: string) => void }) {
  return (
    <div className="min-w-0 space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-gold-ink" /> {title}
        <span className="ml-auto rounded-full bg-muted px-2 text-xs tabular-nums">{items.length}</span>
      </h4>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => onOpen(b.id)} className="w-full rounded-lg border bg-card p-2.5 text-left text-sm transition hover:border-gold">
                <span className="block truncate font-semibold">{who(b)}</span>
                {b.address && <span className="block truncate text-xs text-muted-foreground">{b.address}</span>}
                <span className="mt-1 block truncate text-xs">{b.materials.map((m) => `${m.quantity} × ${m.name}`).join(", ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
