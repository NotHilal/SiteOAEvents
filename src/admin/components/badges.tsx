import { cn } from "@/lib/utils";
import type { Booking, BookingKind, PaymentStatus } from "@/lib/types";

const tone = {
  gold: "bg-gold-soft text-gold-ink",
  green: "bg-success-soft text-success",
  orange: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-destructive",
  gray: "bg-muted text-muted-foreground",
  ink: "bg-foreground text-background",
} as const;

export function Pill({ t = "gray", className, children }: { t?: keyof typeof tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap", tone[t], className)}>
      {children}
    </span>
  );
}

export const KIND_LABEL: Record<BookingKind, string> = { site: "Site", manual: "Manuelle", block: "Blocage" };

export function KindBadge({ kind }: { kind: BookingKind }) {
  return <Pill t={kind === "block" ? "ink" : kind === "manual" ? "gold" : "gray"}>{KIND_LABEL[kind]}</Pill>;
}

// Where an order stands, in plain words.
export function bookingState(b: Pick<Booking, "status" | "from" | "to" | "kind">, today: string): { label: string; t: keyof typeof tone } {
  switch (b.status) {
    case "awaiting_payment":
      return { label: "Paiement en cours", t: "orange" };
    case "expired":
      return { label: "Non payée", t: "gray" };
    case "cancelled":
      return { label: "Annulée", t: "red" };
    case "refused":
      return { label: "Refusée", t: "gray" };
    case "pending":
      return { label: "À traiter", t: "orange" };
    case "terminee":
      return { label: "Terminée", t: "gray" };
  }
  if (!b.from) return { label: "Confirmée", t: "green" };
  if (today < b.from) return { label: b.kind === "block" ? "Bloqué" : "À venir", t: b.kind === "block" ? "ink" : "green" };
  if (b.to && today <= b.to) return { label: b.kind === "block" ? "Bloqué" : "En location", t: "gold" };
  return { label: "Terminée", t: "gray" };
}

export function StateBadge({ booking, today }: { booking: Booking; today: string }) {
  const s = bookingState(booking, today);
  return <Pill t={s.t}>{s.label}</Pill>;
}

const PAY: Record<PaymentStatus, { label: string; t: keyof typeof tone } | null> = {
  paid: { label: "Payée", t: "green" },
  deposit: { label: "Acompte", t: "orange" },
  unpaid: { label: "À encaisser", t: "red" },
  pending: { label: "En attente", t: "orange" },
  refunded: { label: "Remboursée", t: "gray" },
  none: null,
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const p = PAY[status];
  return p ? <Pill t={p.t}>{p.label}</Pill> : null;
}
