"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Mail, MailOpen, Phone, ReceiptText, Reply, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { KindBadge, PaymentBadge, Pill, StateBadge } from "@/components/badges";
import { useBookings, useBookingsChanged } from "@/components/booking/booking-provider";
import { useConfirm } from "@/components/confirm";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFetch } from "@/hooks/use-fetch";
import { fmt, fmtDateTime, fmtRange, money, normalize, plural, todayISO } from "@/lib/format";
import { api } from "@/lib/session";
import type { Booking } from "@/lib/types";
import { cn } from "@/lib/utils";

type Client = {
  key: string;
  accountId: string | null;
  email: string;
  name: string;
  phone: string;
  company: string;
  type: "pro" | "particulier";
  hasAccount: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
  orders: { id: string; reference: string | null; kind: Booking["kind"]; status: string; from: string | null; to: string | null; total: number | null; paymentStatus: Booking["paymentStatus"] }[];
  orderCount: number;
  totalSpent: number;
  lastOrder: string | null;
};

type Message = { id: string; prenom: string | null; nom: string | null; name: string | null; email: string; telephone: string | null; phone: string | null; type_evenement: string | null; subject: string | null; message: string; read: boolean; created_at: string };

export function ClientsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params?.get("tab") === "messages" ? "messages" : "clients";

  const clients = useFetch(() => api<{ data: Client[] }>("/api/admin/clients").then((r) => r.data), []);
  const messages = useFetch(() => api<{ data: Message[] }>("/api/admin/messages").then((r) => r.data), []);
  useBookingsChanged(clients.reload);
  const unread = (messages.data || []).filter((m) => !m.read).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Clients" description="Vos clients, leurs commandes, et les messages reçus par le formulaire de contact." className="mb-2" />
      <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })}>
        <TabsList>
          <TabsTrigger value="clients" className="px-4">
            Clients {clients.data ? `· ${clients.data.length}` : ""}
          </TabsTrigger>
          <TabsTrigger value="messages" className="px-4">
            Messages
            {unread > 0 && <span className="ml-1.5 rounded-full bg-gold px-1.5 text-xs font-bold text-foreground">{unread}</span>}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clients" className="mt-4">
          <ClientsList data={clients.data} loading={clients.loading} error={clients.error} />
        </TabsContent>
        <TabsContent value="messages" className="mt-4">
          <MessagesList data={messages.data} loading={messages.loading} error={messages.error} reload={messages.reload} setData={messages.setData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClientsList({ data, loading, error }: { data: Client[] | null; loading: boolean; error: string | null }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Client | null>(null);
  const { newBooking, openBooking } = useBookings();
  const today = todayISO();

  const rows = useMemo(() => {
    const query = normalize(q);
    return (data || []).filter((c) => !query || normalize([c.name, c.email, c.phone, c.company].join(" ")).includes(query));
  }, [data, q]);

  if (error) return <p className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{error}</p>;
  if (loading && !data) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-3">
      <div className="relative sm:w-96">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom, e-mail, téléphone, société…" className="pl-8" />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="pl-4">Client</TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="text-right">Commandes</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Total</TableHead>
              <TableHead className="hidden pr-4 lg:table-cell">Dernière location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.key} className="cursor-pointer" onClick={() => setOpen(c)}>
                <TableCell className="pl-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{c.name || c.email || "Sans nom"}</span>
                    {c.type === "pro" && <Pill t="gold">Pro</Pill>}
                    {!c.hasAccount && <Pill>Sans compte</Pill>}
                  </div>
                  {c.company && <div className="text-xs text-muted-foreground">{c.company}</div>}
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">
                  <div className="truncate">{c.email}</div>
                  <div className="text-muted-foreground">{c.phone}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{c.orderCount}</TableCell>
                <TableCell className="hidden text-right font-semibold tabular-nums sm:table-cell">{money(c.totalSpent)}</TableCell>
                <TableCell className="hidden pr-4 text-sm text-muted-foreground lg:table-cell">{c.lastOrder ? fmt(c.lastOrder) : "—"}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Aucun client.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-md">
          {open && (
            <>
              <SheetHeader className="border-b px-5 py-4">
                <SheetTitle className="font-heading text-lg">{open.name || open.email}</SheetTitle>
                <SheetDescription>
                  {open.hasAccount ? `Compte créé le ${fmt(open.createdAt?.slice(0, 10))}` : "Client sans compte sur le site"}
                  {open.lastLoginAt ? ` · dernière connexion ${fmtDateTime(open.lastLoginAt)}` : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 p-5">
                <div className="space-y-2 text-sm">
                  {open.company && <p className="font-medium">{open.company}</p>}
                  {open.email && (
                    <a href={`mailto:${open.email}`} className="flex items-center gap-2 break-all hover:underline">
                      <Mail className="size-4 shrink-0 text-muted-foreground" /> {open.email}
                    </a>
                  )}
                  {open.phone && (
                    <a href={`tel:${open.phone}`} className="flex items-center gap-2 hover:underline">
                      <Phone className="size-4 text-muted-foreground" /> {open.phone}
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Commandes</p>
                    <p className="font-heading text-xl font-bold">{open.orderCount}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-heading text-xl font-bold">{money(open.totalSpent)}</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const [firstName, ...rest] = (open.name || "").split(" ");
                    newBooking({ kind: "manual", client: { firstName, lastName: rest.join(" "), email: open.email, phone: open.phone } });
                  }}
                >
                  <ReceiptText /> Nouvelle commande pour ce client
                </Button>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historique</h4>
                  {open.orders.length === 0 && <p className="text-sm text-muted-foreground">Aucune commande.</p>}
                  <ul className="divide-y rounded-lg border">
                    {open.orders
                      .slice()
                      .sort((a, b) => (b.from || "").localeCompare(a.from || ""))
                      .map((o) => (
                        <li key={o.id}>
                          <button type="button" onClick={() => openBooking(o.id)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/40">
                            <span className="min-w-0">
                              <span className="block font-medium">{fmtRange(o.from, o.to)}</span>
                              <span className="font-mono text-xs text-muted-foreground">{o.reference}</span>
                            </span>
                            <span className="flex flex-col items-end gap-1">
                              <span className="font-semibold tabular-nums">{money(o.total)}</span>
                              <span className="flex gap-1">
                                <KindBadge kind={o.kind} />
                                <StateBadge booking={o as unknown as Booking} today={today} />
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MessagesList({
  data,
  loading,
  error,
  reload,
  setData,
}: {
  data: Message[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (m: Message[] | null) => void;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [open, setOpen] = useState<Message | null>(null);
  const confirm = useConfirm();

  const nameOf = (m: Message) => [m.prenom, m.nom].filter(Boolean).join(" ") || m.name || m.email;
  const rows = (data || []).filter((m) => filter === "all" || !m.read);

  async function markRead(m: Message, read: boolean) {
    if (m.read === read) return;
    setData((data || []).map((x) => (x.id === m.id ? { ...x, read } : x)));
    try {
      await api("/api/admin/messages", { method: "PATCH", json: { id: m.id, read } });
    } catch {
      reload();
    }
  }

  async function remove(m: Message) {
    if (!(await confirm({ title: "Supprimer ce message ?", confirm: "Supprimer", destructive: true }))) return;
    try {
      await api("/api/admin/messages", { method: "DELETE", json: { id: m.id } });
      setOpen(null);
      setData((data || []).filter((x) => x.id !== m.id));
      toast.success("Message supprimé");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  if (error) return <p className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{error}</p>;
  if (loading && !data) return <Skeleton className="h-96 rounded-xl" />;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          Tous · {(data || []).length}
        </Button>
        <Button size="sm" variant={filter === "unread" ? "default" : "outline"} onClick={() => setFilter("unread")}>
          Non lus · {(data || []).filter((m) => !m.read).length}
        </Button>
      </div>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {rows.length === 0 && <li className="p-10 text-center text-muted-foreground">Aucun message.</li>}
        {rows.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => {
                setOpen(m);
                markRead(m, true);
              }}
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40"
            >
              <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", m.read ? "bg-transparent" : "bg-gold")} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate", !m.read && "font-bold")}>{nameOf(m)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(m.created_at)}</span>
                </span>
                {m.type_evenement && <span className="block text-xs text-gold-ink">{m.type_evenement}</span>}
                <span className="line-clamp-1 text-sm text-muted-foreground">{m.message}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-md">
          {open && (
            <>
              <SheetHeader className="border-b px-5 py-4">
                <SheetTitle className="font-heading text-lg">{nameOf(open)}</SheetTitle>
                <SheetDescription>Reçu le {fmtDateTime(open.created_at)}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-5 text-sm">
                <a href={`mailto:${open.email}`} className="flex items-center gap-2 break-all hover:underline">
                  <Mail className="size-4 shrink-0 text-muted-foreground" /> {open.email}
                </a>
                {(open.telephone || open.phone) && (
                  <a href={`tel:${open.telephone || open.phone}`} className="flex items-center gap-2 hover:underline">
                    <Phone className="size-4 text-muted-foreground" /> {open.telephone || open.phone}
                  </a>
                )}
                {open.type_evenement && <Pill t="gold">{open.type_evenement}</Pill>}
                <p className="whitespace-pre-line rounded-lg bg-muted/60 p-4 text-base leading-relaxed">{open.message}</p>
                <div className="flex flex-col gap-2 pt-2">
                  <Button asChild size="lg">
                    <a href={`mailto:${open.email}?subject=${encodeURIComponent("Votre demande — OA Événementiel")}`}>
                      <Reply /> Répondre par e-mail
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      markRead(open, false);
                      setOpen(null);
                    }}
                  >
                    <MailOpen /> Marquer comme non lu
                  </Button>
                  <Button variant="ghost" className="text-destructive" onClick={() => remove(open)}>
                    <Trash2 /> Supprimer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{plural((data || []).filter((m) => m.email === open.email).length, "message")} de cette personne.</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
