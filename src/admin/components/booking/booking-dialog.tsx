"use client";

import { useEffect, useMemo, useState } from "react";

import { AlertTriangle, Lock, Minus, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DateRangeField } from "@/components/date-range-field";
import { MaterialPicker } from "@/components/material-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { loadCatalog } from "@/lib/catalog";
import { daysBetween, fmt, money, todayISO } from "@/lib/format";
import { api, ApiError } from "@/lib/session";
import type { Booking, Conflict, Planning, PlanningMaterial } from "@/lib/types";
import { cn } from "@/lib/utils";

// biome-ignore lint: plain JS module shared with the public site
import { getDayType, getUnitPriceTtc, groupTiersByMaterial } from "../../../lib/pricing.js";

export type BookingDraft = {
  kind?: "block" | "manual";
  from?: string;
  to?: string;
  items?: { id: string; quantity: number }[];
  client?: { firstName?: string; lastName?: string; email?: string; phone?: string };
};

type Item = { id: string; name: string; quantity: number; price: string; priceTouched: boolean };
type Tier = { material_id: string; min_qty: number; max_qty: number | null; price_weekday_ht: number; price_weekend_ht: number };

const num = (s: string) => {
  const n = Number.parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function Section({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">{n}</span>
        <h3 className="font-heading text-base font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="space-y-3 pl-0 sm:pl-8">{children}</div>
    </section>
  );
}

export function BookingDialog({
  open,
  onOpenChange,
  draft,
  booking,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  draft?: BookingDraft | null;
  /** Editing an existing block / manual order (or converting a block: pass draft.kind = "manual"). */
  booking?: Booking | null;
  onSaved?: (b: Booking) => void;
}) {
  const editing = !!booking;
  const [kind, setKind] = useState<"block" | "manual">("block");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [client, setClient] = useState({ firstName: "", lastName: "", phone: "", email: "", address: "", eventType: "" });
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "deposit" | "paid">("unpaid");
  const [amountPaid, setAmountPaid] = useState("");
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [tiers, setTiers] = useState<Record<string, Tier[]>>({});
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset the form each time it opens.
  useEffect(() => {
    if (!open) return;
    setConflicts(null);
    setError("");
    if (booking) {
      setKind(draft?.kind || (booking.kind === "manual" ? "manual" : "block"));
      setFrom(booking.from || "");
      setTo(booking.to || "");
      setItems(booking.materials.map((m) => ({ id: m.id, name: m.name, quantity: m.quantity, price: m.price == null ? "" : String(m.price), priceTouched: m.price != null })));
      setTitle(booking.title || "");
      setNotes(booking.notes || "");
      setClient({ firstName: booking.client.firstName, lastName: booking.client.lastName, phone: booking.client.phone, email: booking.client.email, address: booking.address, eventType: booking.eventType });
      setDeliveryFee(String(booking.deliveryFee ?? 0));
      setPaymentStatus(booking.paymentStatus === "paid" || booking.paymentStatus === "deposit" ? booking.paymentStatus : "unpaid");
      setAmountPaid(booking.amountPaid ? String(booking.amountPaid) : "");
    } else {
      setKind(draft?.kind || "block");
      setFrom(draft?.from || "");
      setTo(draft?.to || draft?.from || "");
      setItems((draft?.items || []).map((i) => ({ id: i.id, name: "", quantity: i.quantity, price: "", priceTouched: false })));
      setTitle("");
      setNotes("");
      setClient({ firstName: draft?.client?.firstName || "", lastName: draft?.client?.lastName || "", phone: draft?.client?.phone || "", email: draft?.client?.email || "", address: "", eventType: "" });
      setDeliveryFee("0");
      setPaymentStatus("unpaid");
      setAmountPaid("");
    }
  }, [open, booking, draft]);

  // Price grid (public table), once.
  useEffect(() => {
    if (!open || Object.keys(tiers).length) return;
    loadCatalog().then((c) => setTiers(groupTiersByMaterial(c.tiers) as Record<string, Tier[]>)).catch(() => {});
  }, [open, tiers]);

  // Stock left for the chosen dates.
  useEffect(() => {
    if (!open) return;
    const f = from || todayISO();
    const t = to || f;
    let cancelled = false;
    api<{ data: Planning }>(`/api/admin/planning?from=${f}&to=${t}`)
      .then((r) => !cancelled && setPlanning(r.data))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [open, from, to]);

  const materials = planning?.materials || [];
  const byId = useMemo(() => Object.fromEntries(materials.map((m) => [m.id, m])), [materials]);

  // Fill names for items passed by id only (draft from the calendar).
  useEffect(() => {
    if (!materials.length) return;
    setItems((list) => list.map((i) => (i.name ? i : { ...i, name: byId[i.id]?.name || "Article" })));
  }, [materials, byId]);

  const available = useMemo(() => {
    if (!planning || !from) return undefined;
    const days = daysBetween(from, to || from);
    const own: Record<string, number> = {};
    if (booking?.active) for (const m of booking.materials) if (booking.days.some((d) => days.includes(d))) own[m.id] = (own[m.id] || 0) + m.quantity;
    const out: Record<string, number> = {};
    for (const m of planning.materials) {
      const peak = Math.max(0, ...days.map((d) => planning.usage[d]?.[m.id] || 0));
      out[m.id] = m.stock - peak + (own[m.id] || 0);
    }
    return out;
  }, [planning, from, to, booking]);

  const unitPrice = (id: string, qty: number) => (from ? getUnitPriceTtc(tiers[id], getDayType(from), qty) : 0);

  // Prefill prices from the price grid until the user types one.
  useEffect(() => {
    if (kind !== "manual") return;
    setItems((list) => list.map((i) => (i.priceTouched ? i : { ...i, price: String(unitPrice(i.id, i.quantity) || "") })));
    // biome-ignore lint/correctness/useExhaustiveDependencies: recompute on these only
  }, [kind, from, tiers]);

  function addItem(m: PlanningMaterial) {
    setItems((list) => [...list, { id: m.id, name: m.name, quantity: 1, price: kind === "manual" ? String(unitPrice(m.id, 1) || "") : "", priceTouched: false }]);
    setConflicts(null);
  }
  function setQty(id: string, q: number) {
    const quantity = Math.max(1, Math.min(100000, Math.round(q) || 1));
    setItems((list) => list.map((i) => (i.id === id ? { ...i, quantity, price: i.priceTouched || kind !== "manual" ? i.price : String(unitPrice(id, quantity) || "") } : i)));
    setConflicts(null);
  }

  const materialsTotal = items.reduce((s, i) => s + num(i.price) * i.quantity, 0);
  const total = Math.round((materialsTotal + num(deliveryFee)) * 100) / 100;
  const dayCount = from ? daysBetween(from, to || from).length : 0;

  async function save(force = false) {
    setError("");
    if (!from) return setError("Choisissez la date ou la période.");
    if (!items.length) return setError("Ajoutez au moins un article.");
    if (kind === "manual" && !client.firstName.trim() && !client.lastName.trim()) return setError("Indiquez le nom du client.");
    setSaving(true);
    try {
      const payload = {
        id: booking?.id,
        kind,
        from,
        to: to || from,
        materials: items.map((i) => ({ id: i.id, quantity: i.quantity, price: num(i.price) })),
        title,
        notes,
        ...client,
        deliveryFee: num(deliveryFee),
        paymentStatus,
        amountPaid: num(amountPaid),
        force,
      };
      const res = await api<{ data: Booking }>("/api/admin/bookings", { method: editing ? "PUT" : "POST", json: payload });
      toast.success(kind === "block" ? `Blocage enregistré (${res.data.reference})` : `Commande enregistrée (${res.data.reference})`);
      window.dispatchEvent(new Event("oa:bookings-changed"));
      onSaved?.(res.data);
      onOpenChange(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && Array.isArray(e.data.conflicts)) setConflicts(e.data.conflicts as Conflict[]);
      else setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  const heading = editing
    ? booking?.kind === "block" && kind === "manual"
      ? "Transformer le blocage en commande"
      : kind === "block"
        ? "Modifier le blocage"
        : "Modifier la commande"
    : kind === "block"
      ? "Nouveau blocage"
      : "Nouvelle commande";

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="font-heading text-lg">{heading}</DialogTitle>
          <DialogDescription>
            {kind === "block"
              ? "Mettez du matériel de côté, sans fiche client ni prix. Vous pourrez le transformer en commande plus tard."
              : "Commande prise par téléphone ou en direct, réglée hors site (espèces, virement…)."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {!(editing && booking?.kind === "manual") && (
            <ToggleGroup
              type="single"
              variant="outline"
              value={kind}
              onValueChange={(v) => v && setKind(v as "block" | "manual")}
              className="grid w-full grid-cols-2"
            >
              <ToggleGroupItem value="block" className="h-auto flex-col items-start gap-0.5 px-4 py-3 text-left data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background">
                <span className="flex items-center gap-2 font-semibold">
                  <Lock className="size-4" /> Blocage rapide
                </span>
                <span className="text-xs opacity-75">Date + quantité + note</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="manual" className="h-auto flex-col items-start gap-0.5 px-4 py-3 text-left data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background">
                <span className="flex items-center gap-2 font-semibold">
                  <ReceiptText className="size-4" /> Commande complète
                </span>
                <span className="text-xs opacity-75">Client, prix, paiement</span>
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          <Section n={1} title="Quand ?" hint={dayCount > 1 ? `${dayCount} jours` : undefined}>
            <DateRangeField
              from={from}
              to={to}
              onChange={(f, t) => {
                setFrom(f);
                setTo(t);
                setConflicts(null);
              }}
            />
          </Section>

          <Section n={2} title="Quel matériel ?">
            {items.length > 0 && (
              <ul className="divide-y rounded-lg border bg-card">
                {items.map((i) => {
                  const left = available?.[i.id];
                  const over = left != null && i.quantity > left;
                  return (
                    <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{i.name || byId[i.id]?.name}</p>
                        {left != null && (
                          <p className={cn("text-xs", over ? "font-semibold text-destructive" : "text-muted-foreground")}>
                            {over ? `Seulement ${Math.max(0, left)} disponible${left > 1 ? "s" : ""}` : `${left} disponible${left > 1 ? "s" : ""} sur ${byId[i.id]?.stock ?? "?"}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <Button variant="outline" size="icon" className="rounded-r-none" onClick={() => setQty(i.id, i.quantity - 1)} aria-label="Moins">
                          <Minus />
                        </Button>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={i.quantity}
                          onChange={(e) => setQty(i.id, Number(e.target.value))}
                          className={cn("w-20 rounded-none border-x-0 text-center tabular-nums", over && "text-destructive")}
                          aria-label={`Quantité ${i.name}`}
                        />
                        <Button variant="outline" size="icon" className="rounded-l-none" onClick={() => setQty(i.id, i.quantity + 1)} aria-label="Plus">
                          <Plus />
                        </Button>
                      </div>
                      {kind === "manual" && (
                        <div className="flex items-center gap-1.5">
                          <Input
                            inputMode="decimal"
                            value={i.price}
                            onChange={(e) => setItems((list) => list.map((x) => (x.id === i.id ? { ...x, price: e.target.value, priceTouched: true } : x)))}
                            className="w-24 text-right tabular-nums"
                            aria-label={`Prix unitaire ${i.name}`}
                            placeholder="0"
                          />
                          <span className="text-xs text-muted-foreground">€/u</span>
                        </div>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setItems((list) => list.filter((x) => x.id !== i.id))} aria-label={`Retirer ${i.name}`}>
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            <MaterialPicker materials={materials} available={available} exclude={items.map((i) => i.id)} onPick={addItem} />
          </Section>

          {kind === "block" ? (
            <Section n={3} title="Pour qui, pourquoi ?">
              <div className="space-y-1.5">
                <Label htmlFor="b-title">Intitulé</Label>
                <Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex : Mariage Dupont, réservation téléphone…" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-notes">Note (facultatif)</Label>
                <Textarea id="b-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Contact, détails, à confirmer avant le…" />
              </div>
            </Section>
          ) : (
            <>
              <Section n={3} title="Client">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="c-first" label="Prénom" value={client.firstName} onChange={(v) => setClient((c) => ({ ...c, firstName: v }))} />
                  <Field id="c-last" label="Nom *" value={client.lastName} onChange={(v) => setClient((c) => ({ ...c, lastName: v }))} />
                  <Field id="c-phone" label="Téléphone" type="tel" value={client.phone} onChange={(v) => setClient((c) => ({ ...c, phone: v }))} />
                  <Field id="c-email" label="E-mail" type="email" value={client.email} onChange={(v) => setClient((c) => ({ ...c, email: v }))} />
                </div>
                <Field id="c-address" label="Adresse de livraison" value={client.address} onChange={(v) => setClient((c) => ({ ...c, address: v }))} placeholder="N°, rue, code postal, ville" />
                <Field id="c-title" label="Événement (facultatif)" value={title} onChange={setTitle} placeholder="ex : Mariage, anniversaire 40 ans…" />
              </Section>

              <Section n={4} title="Prix et paiement">
                <div className="rounded-lg border bg-card p-3.5 text-sm">
                  <Row label="Articles" value={money(materialsTotal)} />
                  <div className="flex items-center justify-between gap-3 py-1">
                    <Label htmlFor="c-fee" className="font-normal text-muted-foreground">
                      Livraison / installation
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Input id="c-fee" inputMode="decimal" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="h-8 w-24 text-right tabular-nums" />
                      <span className="text-xs text-muted-foreground">€</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2.5 font-heading text-base font-bold">
                    <span>Total TTC</span>
                    <span className="tabular-nums">{money(total)}</span>
                  </div>
                </div>
                <ToggleGroup type="single" variant="outline" value={paymentStatus} onValueChange={(v) => v && setPaymentStatus(v as typeof paymentStatus)} className="grid w-full grid-cols-3">
                  <ToggleGroupItem value="unpaid" className="data-[state=on]:border-destructive data-[state=on]:bg-danger-soft data-[state=on]:text-destructive">
                    Pas encore payé
                  </ToggleGroupItem>
                  <ToggleGroupItem value="deposit" className="data-[state=on]:border-warning data-[state=on]:bg-warning-soft data-[state=on]:text-warning">
                    Acompte versé
                  </ToggleGroupItem>
                  <ToggleGroupItem value="paid" className="data-[state=on]:border-success data-[state=on]:bg-success-soft data-[state=on]:text-success">
                    Payé
                  </ToggleGroupItem>
                </ToggleGroup>
                {paymentStatus === "deposit" && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="c-paid" className="shrink-0">
                      Montant reçu
                    </Label>
                    <Input id="c-paid" inputMode="decimal" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-32 text-right tabular-nums" />
                    <span className="text-sm text-muted-foreground">€ · reste {money(Math.max(0, total - num(amountPaid)))}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="c-notes">Note interne (facultatif)</Label>
                  <Textarea id="c-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Horaire de livraison, accès, contact sur place…" />
                </div>
              </Section>
            </>
          )}

          {conflicts && (
            <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 bg-danger-soft p-3.5 text-sm">
              <p className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="size-4" /> Pas assez de stock
              </p>
              <ul className="space-y-1">
                {conflicts.map((c) => (
                  <li key={c.materialId}>
                    <strong>{c.name}</strong> : {c.requested} demandés, {c.available} disponible{c.available > 1 ? "s" : ""} le {fmt(c.day, "d MMMM yyyy")} (stock {c.stock}).
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground">Réduisez les quantités, changez de date, ou enregistrez quand même si vous aurez le matériel.</p>
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="m-0 flex-row justify-end gap-2 rounded-b-xl border-t bg-muted/40 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          {conflicts ? (
            <Button variant="destructive" onClick={() => save(true)} disabled={saving}>
              {saving && <Spinner />} Enregistrer quand même
            </Button>
          ) : (
            <Button onClick={() => save(false)} disabled={saving}>
              {saving && <Spinner />}
              {kind === "block" ? "Bloquer le matériel" : "Enregistrer la commande"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, value, onChange, type = "text", placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-10" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
