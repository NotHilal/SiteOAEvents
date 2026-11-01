// Colour of a "stock left" figure: red when nothing is left (or overbooked),
// orange under a quarter of the stock, green otherwise, neutral when untouched.
export function stockTone(left: number, stock: number, used: number) {
  if (left <= 0 && (used > 0 || stock === 0)) return "bg-danger-soft text-destructive";
  if (used === 0) return "text-muted-foreground/70";
  if (left < Math.max(1, stock * 0.25)) return "bg-warning-soft text-warning";
  return "bg-success-soft text-success";
}

export const KIND_CHIP: Record<string, string> = {
  block: "bg-foreground text-background",
  manual: "bg-gold-soft text-gold-ink ring-1 ring-gold/40",
  site: "bg-success-soft text-success",
};
