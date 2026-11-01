import type { Booking } from "@/lib/types";

export type Variant = {
  id: string;
  name: string;
  label: string;
  description: string;
  category: string;
  stock: number;
  online: boolean;
  image: string;
  gallery: string[];
  slug: string;
  productId: string | null;
  order: number;
  tiers: { minQty: number; maxQty: number | null; weekday: number; weekend: number }[];
};

export type MaterialDetail = {
  product: { id: string; name: string; description: string; category: string; slug: string } | null;
  variants: Variant[];
  selectedId: string;
  movements: { id: string; materialId: string; delta: number; stockAfter: number; reason: string; createdAt: string }[];
  bookings: Booking[];
  today: string;
};
