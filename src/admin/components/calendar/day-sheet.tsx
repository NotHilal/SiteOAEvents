"use client";

import { useState } from "react";

import { DoorClosed, Lock, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { KindBadge, PaymentBadge } from "@/components/badges";
import { useBookings } from "@/components/booking/booking-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { fmt } from "@/lib/format";
import { api } from "@/lib/session";
import type { Planning } from "@/lib/types";
import { cn } from "@/lib/utils";

import { stockTone } from "./stock-cell";

/** Everything about one day: who has what, what's left, close the day. */
export function DaySheet({
  day,
  planning,
  materialFilter,
  onOpenChange,
  onChanged,
}: {
  day: string | null;
  planning: Planning | null;
  materialFilter?: string | null;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const { newBooking, openBooking } = useBookings();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!planning) return null;

  const events = day ? planning.events.filter((e) => e.days.includes(day) && (!materialFilter || e.materials.some((m) => m.id === materialFilter))) : [];
  const usage = (day && planning.usage[day]) || {};
  const closure = day ? planning.closures.find((c) => c.date === day) : null;
  const rows = planning.materials
    .filter((m) => (materialFilter ? m.id === materialFilter : (usage[m.id] || 0) > 0))
    .map((m) => ({ ...m, used: usage[m.id] || 0, left: m.stock - (usage[m.id] || 0) }));

  async function toggleClosure() {
    if (!day) return;
    setBusy(true);
    try {
      await api("/api/admin/closures", { method: closure ? "DELETE" : "POST", json: { date: day, reason: reason.trim() } });
      toast.success(closure ? "Jour rouvert aux commandes en ligne" : "Jour fermé aux commandes en ligne");
      setReason("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!day} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-heading text-lg capitalize">{day && fmt(day, "EEEE d MMMM yyyy")}</SheetTitle>
          <SheetDescription>
            {events.length ? `${events.length} réservation${events.length > 1 ? "s" : ""} ce jour` : "Aucune réservation ce jour"}
            {closure ? " · fermé aux commandes en ligne" : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-5">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => day && newBooking({ kind: "block", from: day, to: day, items: materialFilter ? [{ id: materialFilter, quantity: 1 }] : [] })}>
              <Lock /> Bloquer
            </Button>
            <Button variant="outline" onClick={() => day && newBooking({ kind: "manual", from: day, to: day, items: materialFilter ? [{ id: materialFilter, quantity: 1 }] : [] })}>
              <ReceiptText /> Commande
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Réservations</h4>
            {events.length === 0 && <p className="text-sm text-muted-foreground">Rien de prévu.</p>}
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => openBooking(e.id)} className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-gold hover:bg-gold-soft/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{e.kind === "block" ? e.title || "Blocage" : e.client.name || e.reference}</span>
                      <KindBadge kind={e.kind} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {e.from === e.to ? "Ce jour" : `${fmt(e.from, "d MMM")} → ${fmt(e.to, "d MMM")}`}
                      {day === e.from && e.kind !== "block" ? " · livraison" : ""}
                      {day === e.to && e.from !== e.to && e.kind !== "block" ? " · reprise" : ""}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-sm">{e.materials.map((m) => `${m.quantity} × ${m.name}`).join(" · ")}</p>
                    {e.kind !== "block" && (
                      <div className="mt-2">
                        <PaymentBadge status={e.paymentStatus} />
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {rows.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock ce jour</h4>
              <ul className="divide-y rounded-lg border">
                {rows.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate">{m.name}</span>
                    <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums", stockTone(m.left, m.stock, m.used))}>
                      {m.left} / {m.stock} restants
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-dashed p-3.5">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <DoorClosed className="size-4" /> Fermeture
            </h4>
            <p className="text-xs text-muted-foreground">Un jour fermé ne peut plus être choisi par les clients sur le site (congés, jour férié…). Vos commandes manuelles restent possibles.</p>
            {!closure && <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (facultatif)" />}
            {closure?.reason && <p className="text-sm">Motif : {closure.reason}</p>}
            <Button variant={closure ? "outline" : "secondary"} className="w-full" disabled={busy} onClick={toggleClosure}>
              {closure ? "Rouvrir ce jour" : "Fermer ce jour aux commandes en ligne"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
