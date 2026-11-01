"use client";

import { useEffect, useState } from "react";

import { Ban, CalendarDays, CreditCard, Mail, MapPin, Pencil, Phone, ReceiptText, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { KindBadge, PaymentBadge, StateBadge } from "@/components/badges";
import { useConfirm } from "@/components/confirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { fmt, fmtDateTime, money, plural, todayISO } from "@/lib/format";
import { api, ApiError } from "@/lib/session";
import type { Booking } from "@/lib/types";

const PAY_LABEL: Record<string, string> = { pending: "En attente", paid: "Payé", failed: "Refusé", canceled: "Abandonné", refunded: "Remboursé" };

export function BookingSheet({
  id,
  onOpenChange,
  onEdit,
}: {
  id: string | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (b: Booking, asOrder?: boolean) => void;
}) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [paid, setPaid] = useState("");
  const confirm = useConfirm();
  const today = todayISO();

  async function load(bookingId: string) {
    try {
      setError("");
      const r = await api<{ data: Booking }>(`/api/admin/bookings?id=${encodeURIComponent(bookingId)}`);
      setBooking(r.data);
      setPaid(String(r.data.amountPaid || ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }

  useEffect(() => {
    setBooking(null);
    if (id) load(id);
  }, [id]);

  const changed = () => window.dispatchEvent(new Event("oa:bookings-changed"));

  async function act(action: "cancel" | "restore" | "delete" | "payment", extra: Record<string, unknown> = {}) {
    if (!booking) return;
    setBusy(action);
    try {
      await api("/api/admin/bookings", { method: "PATCH", json: { id: booking.id, action, ...extra } });
      changed();
      if (action === "delete") {
        toast.success(booking.kind === "block" ? "Blocage supprimé" : "Commande supprimée");
        onOpenChange(false);
      } else {
        toast.success(action === "payment" ? "Paiement enregistré" : action === "cancel" ? "Commande annulée, matériel libéré" : "Commande rétablie");
        await load(booking.id);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && Array.isArray(e.data.conflicts)) {
        if (await confirm({ title: "Stock insuffisant", description: "Le matériel a été réservé entre-temps. Rétablir quand même ?", confirm: "Rétablir quand même" })) {
          await act(action, { ...extra, force: true });
        }
      } else toast.error(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy("");
    }
  }

  async function cancelOnline() {
    if (!booking) return;
    const ok = await confirm({
      title: "Annuler et rembourser ?",
      description: `La commande ${booking.reference} sera annulée et ${money(booking.amountPaid)} remboursés au client par Stripe. Le matériel redevient disponible.`,
      confirm: "Annuler et rembourser",
      destructive: true,
    });
    if (!ok) return;
    setBusy("refund");
    try {
      const r = await api<{ data: { refunded: boolean; amount: number } }>("/api/admin/orders", { method: "POST", json: { id: booking.id, action: "cancel" } });
      toast.success(r.data.refunded ? `Commande annulée, ${money(r.data.amount)} remboursés.` : "Commande annulée.");
      changed();
      await load(booking.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Annulation impossible.");
    } finally {
      setBusy("");
    }
  }

  const b = booking;
  const remaining = b && b.total != null ? Math.max(0, b.total - (b.amountPaid || 0)) : 0;

  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-heading text-lg">
            {b ? (b.kind === "block" ? b.title || "Blocage" : b.client.name || "Commande") : "Chargement…"}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-1.5">
              {b && (
                <>
                  <span className="mr-1 font-mono text-xs">{b.reference}</span>
                  <KindBadge kind={b.kind} />
                  <StateBadge booking={b} today={today} />
                  <PaymentBadge status={b.paymentStatus} />
                </>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>

        {error && <p className="m-5 rounded-lg bg-danger-soft p-3 text-sm text-destructive">{error}</p>}
        {!b && !error && (
          <div className="space-y-3 p-5">
            <Skeleton className="h-16" />
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        )}

        {b && (
          <div className="space-y-6 p-5">
            <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-3.5">
              <CalendarDays className="mt-0.5 size-5 text-gold-ink" />
              <div>
                <p className="font-semibold">
                  {b.from === b.to ? fmt(b.from, "EEEE d MMMM yyyy") : `Du ${fmt(b.from, "EEEE d MMMM")} au ${fmt(b.to, "EEEE d MMMM yyyy")}`}
                </p>
                <p className="text-sm text-muted-foreground">{plural(b.days.length, "jour")}</p>
              </div>
            </div>

            {b.kind !== "block" && (
              <div className="space-y-2 text-sm">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</h4>
                <p className="text-base font-semibold">{b.client.name || "—"}</p>
                {b.client.phone && (
                  <a href={`tel:${b.client.phone}`} className="flex items-center gap-2 hover:underline">
                    <Phone className="size-4 text-muted-foreground" /> {b.client.phone}
                  </a>
                )}
                {b.client.email && (
                  <a href={`mailto:${b.client.email}`} className="flex items-center gap-2 break-all hover:underline">
                    <Mail className="size-4 shrink-0 text-muted-foreground" /> {b.client.email}
                  </a>
                )}
                {b.address && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:underline">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {b.address}
                  </a>
                )}
                {(b.eventType || b.title) && <p className="text-muted-foreground">Événement : {b.title || b.eventType}</p>}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matériel</h4>
              <ul className="divide-y rounded-lg border">
                {b.materials.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="mr-2 inline-block min-w-8 rounded bg-muted px-1.5 text-center font-semibold tabular-nums">{m.quantity}</span>
                      {m.name}
                    </span>
                    {m.price != null && b.kind !== "block" && <span className="shrink-0 tabular-nums text-muted-foreground">{money(m.price * m.quantity)}</span>}
                  </li>
                ))}
              </ul>
            </div>

            {b.kind !== "block" && b.total != null && (
              <div className="rounded-lg border p-3.5 text-sm">
                {b.materialsTotal != null && <Line label="Articles" value={money(b.materialsTotal)} />}
                {b.deliveryFee != null && <Line label="Livraison" value={money(b.deliveryFee)} />}
                <Line label="Total TTC" value={money(b.total)} strong />
                <Separator className="my-2" />
                <Line label="Encaissé" value={money(b.amountPaid)} />
                {remaining > 0 && b.status !== "cancelled" && <Line label="Reste à encaisser" value={money(remaining)} strong danger />}
              </div>
            )}

            {b.kind === "site" && b.payments && b.payments.length > 0 && (
              <div className="space-y-1.5 text-sm">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paiement en ligne (Stripe)</h4>
                {b.payments.map((p) => (
                  <p key={p.id} className="flex justify-between">
                    <span>
                      {PAY_LABEL[p.status] || p.status} {p.paidAt ? `· ${fmtDateTime(p.paidAt)}` : ""}
                    </span>
                    <span className="tabular-nums">{money(p.amount)}</span>
                  </p>
                ))}
              </div>
            )}

            {(b.notes || b.message) && (
              <div className="space-y-1.5 text-sm">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{b.kind === "site" ? "Message du client" : "Note"}</h4>
                <p className="whitespace-pre-line rounded-lg bg-muted/60 p-3">{b.notes || b.message}</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Créée le {fmtDateTime(b.createdAt)}
              {b.updatedAt && b.updatedAt !== b.createdAt ? ` · modifiée le ${fmtDateTime(b.updatedAt)}` : ""}
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2 border-t pt-5">
              {b.kind === "block" && (
                <>
                  <Button size="lg" onClick={() => onEdit(b, true)}>
                    <ReceiptText /> Transformer en commande
                  </Button>
                  <Button variant="outline" onClick={() => onEdit(b)}>
                    <Pencil /> Modifier le blocage
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={!!busy}
                    onClick={async () => {
                      if (await confirm({ title: "Supprimer ce blocage ?", description: "Le matériel redevient disponible à la réservation.", confirm: "Supprimer", destructive: true })) act("delete");
                    }}
                  >
                    {busy === "delete" ? <Spinner /> : <Trash2 />} Supprimer le blocage
                  </Button>
                </>
              )}

              {b.kind === "manual" && (
                <>
                  {b.status === "confirmed" && b.paymentStatus !== "paid" && (b.total || 0) > 0 && (
                    <div className="flex gap-2">
                      <Button size="lg" className="flex-1 bg-success text-white hover:bg-success/90" disabled={!!busy} onClick={() => act("payment", { amountPaid: b.total })}>
                        {busy === "payment" ? <Spinner /> : <CreditCard />} Marquer comme payée
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="lg" variant="outline">
                            Acompte…
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-64 space-y-2">
                          <p className="text-sm font-medium">Montant total reçu</p>
                          <div className="flex items-center gap-2">
                            <Input inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} className="text-right" />
                            <span>€</span>
                          </div>
                          <Button className="w-full" onClick={() => act("payment", { amountPaid: Number.parseFloat(paid.replace(",", ".")) || 0 })}>
                            Enregistrer
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  <Button variant="outline" onClick={() => onEdit(b)}>
                    <Pencil /> Modifier la commande
                  </Button>
                  {b.status === "cancelled" ? (
                    <Button variant="outline" disabled={!!busy} onClick={() => act("restore")}>
                      {busy === "restore" ? <Spinner /> : <RotateCcw />} Rétablir la commande
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      disabled={!!busy}
                      onClick={async () => {
                        if (await confirm({ title: "Annuler cette commande ?", description: "Elle reste dans l’historique, le matériel redevient disponible.", confirm: "Annuler la commande", destructive: true })) act("cancel");
                      }}
                    >
                      {busy === "cancel" ? <Spinner /> : <Ban />} Annuler la commande
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={!!busy}
                    onClick={async () => {
                      if (await confirm({ title: "Supprimer définitivement ?", description: "La commande disparaît de l’historique. Préférez « Annuler » pour garder une trace.", confirm: "Supprimer", destructive: true })) act("delete");
                    }}
                  >
                    <Trash2 /> Supprimer définitivement
                  </Button>
                </>
              )}

              {b.kind === "site" && (b.status === "confirmed" || b.status === "awaiting_payment") && (
                <Button variant="ghost" className="text-destructive" disabled={!!busy} onClick={cancelOnline}>
                  {busy === "refund" ? <Spinner /> : <Ban />} {b.status === "confirmed" ? "Annuler et rembourser" : "Annuler la commande"}
                </Button>
              )}
              {b.kind === "site" && <p className="text-xs text-muted-foreground">Commande passée et payée sur le site : son contenu ne se modifie pas.</p>}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Line({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${strong ? "font-semibold" : ""} ${danger ? "text-destructive" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
