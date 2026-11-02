export type BookingKind = "site" | "manual" | "block";
export type PaymentStatus = "paid" | "unpaid" | "deposit" | "refunded" | "pending" | "none";

export type BookingItem = { id: string; name: string; quantity: number; price: number | null };

export type Booking = {
  id: string;
  reference: string | null;
  kind: BookingKind;
  status: string;
  title: string | null;
  client: { firstName: string; lastName: string; name: string; email: string; phone: string };
  address: string;
  days: string[];
  from: string | null;
  to: string | null;
  materials: BookingItem[];
  quantity: number;
  materialsTotal: number | null;
  deliveryFee: number | null;
  total: number | null;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  notes: string;
  eventType: string;
  nbPersons: number | null;
  message: string;
  accountId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  active: boolean;
  payments?: { id: string; amount: number; status: string; method: string; paidAt: string | null; refundedAt: string | null; refundedAmount: number | null }[];
};

export type PlanningMaterial = {
  id: string;
  name: string;
  category: string;
  stock: number;
  online: boolean;
  image: string | null;
  productId: string | null;
  productName: string | null;
  variantLabel: string | null;
};

export type Planning = {
  from: string;
  to: string;
  today: string;
  materials: PlanningMaterial[];
  usage: Record<string, Record<string, number>>;
  events: Booking[];
  closures: { date: string; reason: string | null }[];
};

export type Conflict = {
  materialId: string;
  name: string;
  stock: number;
  used: number;
  requested: number;
  available: number;
  day: string;
};
