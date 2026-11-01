// Catalogue data for the Matériel / Site screens, through /api/admin/catalog
// (writes are validated and run server-side: src/lib/admin-catalog.js).
import { api } from "@/lib/session";

// biome-ignore lint: plain JS modules shared with the public site
import { categoryTitle, sortCategories } from "../../lib/catalogue-pages.js";
// biome-ignore lint: plain JS modules shared with the public site
import { ttcFromHt } from "../../lib/pricing.js";

export type MaterialRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  max_quantity: number;
  available: boolean;
  image_url: string | null;
  gallery: string | null;
  slug: string | null;
  product_id: string | null;
  variant_label: string | null;
  variant_order: number | null;
};
export type ProductRow = { id: string; name: string; description: string | null; category: string | null; slug: string };
export type TierRow = { id: string; material_id: string; min_qty: number; max_qty: number | null; price_weekday_ht: number; price_weekend_ht: number };
export type CategoryRow = { id: string; name: string; label: string | null; description: string | null; image_url: string | null; position: number | null };

export { categoryTitle, sortCategories, ttcFromHt };

export async function loadCatalog() {
  const { data } = await api<{ data: { materials: MaterialRow[]; products: ProductRow[]; tiers: TierRow[]; categories: CategoryRow[] } }>("/api/admin/catalog");
  return { ...data, categories: sortCategories(data.categories) as CategoryRow[] };
}

export async function catalogAction<T = { ok: true }>(action: string, data: Record<string, unknown>) {
  return (await api<{ data: T }>("/api/admin/catalog", { method: "POST", json: { action, ...data } })).data;
}

export type Tier = { minQty: number; maxQty: number | null; weekday: number; weekend: number };

export const replaceTiers = (materialId: string, tiers: Tier[]) => catalogAction("setTiers", { materialId, tiers });

export const optionName = (articleName: string, label: string) => `${articleName.trim()} ${label.trim()}`.trim();

// HT kept to 4 decimals so the TTC shown (rounded to the cent) is exactly what was typed.
export const fromTtc = (ttc: number) => Math.round((ttc / 1.2) * 10000) / 10000;
