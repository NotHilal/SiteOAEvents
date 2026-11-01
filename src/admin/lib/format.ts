import { format as fnsFormat, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export { fr };

export const todayISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

export function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromISO(iso: string) {
  return parseISO(iso);
}

export function addDaysISO(iso: string, n: number) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) out.push(d);
  return out;
}

export const fmt = (iso: string | null | undefined, pattern = "d MMM yyyy") =>
  iso ? fnsFormat(parseISO(iso), pattern, { locale: fr }) : "—";

export function fmtRange(from: string | null, to: string | null) {
  if (!from) return "—";
  if (!to || to === from) return fmt(from, "EEE d MMM yyyy");
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${fmt(from, sameYear ? "d MMM" : "d MMM yyyy")} → ${fmt(to, "d MMM yyyy")}`;
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export const money = (n: number | null | undefined) => (n == null ? "—" : eur.format(n));

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

export const normalize = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
