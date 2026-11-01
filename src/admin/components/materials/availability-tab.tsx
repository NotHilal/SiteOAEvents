"use client";

import { useState } from "react";

import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Lock, ReceiptText } from "lucide-react";

import { KindBadge, PaymentBadge } from "@/components/badges";
import { useBookings, useBookingsChanged } from "@/components/booking/booking-provider";
import { stockTone } from "@/components/calendar/stock-cell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFetch } from "@/hooks/use-fetch";
import { daysBetween, fmt, fmtRange, fromISO, toISO } from "@/lib/format";
import { api } from "@/lib/session";
import type { Planning } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { MaterialDetail, Variant } from "./types";

export function AvailabilityTab({ detail, variant }: { detail: MaterialDetail; variant: Variant }) {
  const { newBooking, openBooking } = useBookings();
  const today = detail.today;
  const [month, setMonth] = useState(today.slice(0, 8) + "01");
  const from = toISO(startOfWeek(startOfMonth(fromISO(month)), { weekStartsOn: 1 }));
  const to = toISO(endOfWeek(endOfMonth(fromISO(month)), { weekStartsOn: 1 }));
  const { data: planning, reload } = useFetch(() => api<{ data: Planning }>(`/api/admin/planning?from=${from}&to=${to}`).then((r) => r.data), [from, to]);
  useBookingsChanged(reload);

  const bookings = detail.bookings.filter((b) => b.materials.some((m) => m.id === variant.id));
  const outToday = bookings.filter((b) => b.days.includes(today)).reduce((s, b) => s + (b.materials.find((m) => m.id === variant.id)?.quantity || 0), 0);
  const nextShortage = (() => {
    const usage: Record<string, number> = {};
    for (const b of bookings) for (const d of b.days) if (d >= today) usage[d] = (usage[d] || 0) + (b.materials.find((m) => m.id === variant.id)?.quantity || 0);
    return Object.keys(usage).sort().find((d) => usage[d] >= variant.stock) || null;
  })();

  const shiftMonth = (n: number) => {
    const d = fromISO(month);
    d.setMonth(d.getMonth() + n);
    setMonth(toISO(d).slice(0, 8) + "01");
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Possédés" value={variant.stock} />
        <Kpi label="Sortis aujourd'hui" value={outToday} />
        <Kpi label="Disponibles aujourd'hui" value={Math.max(0, variant.stock - outToday)} tone={variant.stock - outToday <= 0 ? "red" : "green"} />
        <Kpi label="Prochaine rupture" value={nextShortage ? fmt(nextShortage, "d MMM yyyy") : "Aucune"} tone={nextShortage ? "orange" : undefined} small />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="font-heading capitalize">{fmt(month, "MMMM yyyy")}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mois précédent">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMonth(today.slice(0, 8) + "01")}>
                Aujourd'hui
              </Button>
              <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} aria-label="Mois suivant">
                <ChevronRight />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!planning ? (
              <Skeleton className="h-72" />
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                  {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                    <div key={i}>{d}</div>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {daysBetween(from, to).map((d) => {
                    const used = planning.usage[d]?.[variant.id] || 0;
                    const left = variant.stock - used;
                    const inMonth = d.slice(0, 7) === month.slice(0, 7);
                    return (
                      <button
                        key={d}
                        type="button"
                        title={`${used} réservé(s), ${left} restant(s) — cliquer pour bloquer`}
                        onClick={() => newBooking({ kind: "block", from: d, to: d, items: [{ id: variant.id, quantity: 1 }] })}
                        className={cn(
                          "flex aspect-square flex-col items-center justify-center rounded-md border text-xs transition hover:ring-2 hover:ring-gold sm:aspect-[4/3]",
                          !inMonth && "opacity-35",
                          d === today && "border-gold border-2",
                          used > 0 ? stockTone(left, variant.stock, used) : "bg-card",
                        )}
                      >
                        <span className="font-semibold">{Number(d.slice(8))}</span>
                        <span className="text-[10px] tabular-nums opacity-80">{used > 0 ? left : variant.stock}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Chaque case indique la quantité encore disponible ce jour-là. Cliquez sur un jour pour bloquer du stock.</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="font-heading">Réservations à venir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => newBooking({ kind: "block", items: [{ id: variant.id, quantity: 1 }] })}>
                <Lock /> Bloquer
              </Button>
              <Button variant="outline" onClick={() => newBooking({ kind: "manual", items: [{ id: variant.id, quantity: 1 }] })}>
                <ReceiptText /> Commande
              </Button>
            </div>
            {bookings.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucune réservation à venir.</p>}
            <ul className="divide-y">
              {bookings.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => openBooking(b.id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/40">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted font-heading font-bold tabular-nums">
                      {b.materials.find((m) => m.id === variant.id)?.quantity}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{b.kind === "block" ? b.title || "Blocage" : b.client.name}</span>
                      <span className="block text-xs text-muted-foreground">{fmtRange(b.from, b.to)}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <KindBadge kind={b.kind} />
                      <PaymentBadge status={b.paymentStatus} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone, small }: { label: string; value: React.ReactNode; tone?: "red" | "green" | "orange"; small?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading font-bold tabular-nums",
          small ? "text-lg" : "text-3xl",
          tone === "red" && "text-destructive",
          tone === "green" && "text-success",
          tone === "orange" && "text-warning",
        )}
      >
        {value}
      </p>
    </div>
  );
}
