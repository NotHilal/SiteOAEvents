"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, CircleAlert, Copy, CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Pill } from "@/components/badges";
import { useConfirm } from "@/components/confirm";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useFetch } from "@/hooks/use-fetch";
import { money } from "@/lib/format";
import { api } from "@/lib/session";
// biome-ignore lint: shared pricing rule used by the server and settings preview
import { deliveryFee } from "../../../lib/delivery-pricing.js";

type StripeInfo = {
  source: "admin" | "env" | null;
  live: boolean;
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  webhookUrl: string;
  webhookEvents: string[];
  account?: { name: string; chargesEnabled: boolean; country: string } | null;
};
type Settings = { depotAddress: string; deliveryBaseFee: number; deliveryPerKm: number; maxConsecutiveDays: number; stripe: StripeInfo };
type Status = { email: boolean; notificationEmail: boolean; database: string };

export function SettingsScreen() {
  const settings = useFetch(() => api<{ data: Settings }>("/api/admin/settings").then((r) => r.data), []);
  const status = useFetch(() => api<{ data: Status }>("/api/admin/status").then((r) => r.data), []);

  return (
    <div className="space-y-4">
      <PageHeader title="Réglages" description="Paiement en ligne, livraison et services connectés." className="mb-2" />
      {settings.error && <p className="rounded-lg bg-danger-soft p-3 text-sm text-destructive">{settings.error}</p>}
      {!settings.data ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <StripeCard info={settings.data.stripe} onSaved={(stripe) => settings.setData({ ...settings.data!, stripe })} />
          <div className="space-y-5">
            <DeliveryCard settings={settings.data} onSaved={settings.setData} />
            <ServicesCard status={status.data} />
          </div>
        </div>
      )}
    </div>
  );
}

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(() => toast.success("Copié"), () => toast.error("Copie impossible"));
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">{n}</span>
      <div className="min-w-0 flex-1 space-y-2 pb-1">
        <p className="font-semibold">{title}</p>
        {children}
      </div>
    </li>
  );
}

function StripeCard({ info, onSaved }: { info: StripeInfo; onSaved: (s: StripeInfo) => void }) {
  const confirm = useConfirm();
  const [pk, setPk] = useState("");
  const [sk, setSk] = useState("");
  const [wh, setWh] = useState("");
  const [busy, setBusy] = useState("");
  const [account, setAccount] = useState(info.account || null);
  const configured = !!info.source;

  async function save() {
    if (!pk && !sk && !wh) return toast.error("Collez au moins une clé.");
    setBusy("save");
    try {
      const r = await api<{ data: StripeInfo }>("/api/admin/settings", { method: "POST", json: { action: "stripe", publishableKey: pk, secretKey: sk, webhookSecret: wh } });
      onSaved(r.data);
      setAccount(r.data.account || null);
      setPk("");
      setSk("");
      setWh("");
      toast.success("Clés Stripe enregistrées et vérifiées");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy("");
    }
  }

  async function test() {
    setBusy("test");
    try {
      const r = await api<{ data: { ok: boolean; problems?: string[]; live?: boolean; webhook?: boolean; account?: StripeInfo["account"] } }>("/api/admin/settings", { method: "POST", json: { action: "stripe-test" } });
      if (r.data.ok) {
        setAccount(r.data.account || null);
        toast.success(`Connexion Stripe OK${r.data.webhook ? "" : " — pensez au webhook (étape 3)"}`);
      } else toast.error(r.data.problems?.join(" ") || "Échec du test.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test impossible.");
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!(await confirm({ title: "Retirer les clés Stripe ?", description: "Les clients ne pourront plus payer en ligne tant que de nouvelles clés ne sont pas saisies.", confirm: "Retirer", destructive: true }))) return;
    setBusy("remove");
    try {
      const r = await api<{ data: StripeInfo }>("/api/admin/settings", { method: "POST", json: { action: "stripe-remove" } });
      onSaved(r.data);
      setAccount(null);
      toast.success("Clés retirées");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 font-heading">
            <CreditCard className="size-5" /> Paiement en ligne (Stripe)
          </CardTitle>
          {!configured ? <Pill t="red">Non configuré</Pill> : info.live ? <Pill t="green">Mode réel</Pill> : <Pill t="orange">Mode test</Pill>}
        </div>
        <CardDescription>
          Les clients paient par carte, Apple Pay ou Google Pay ; l'argent arrive sur le compte Stripe de l'entreprise, puis sur son compte bancaire.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {account && (
          <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft p-3 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
            <div>
              <p className="font-semibold text-success">Connecté au compte « {account.name} »</p>
              <p className="text-muted-foreground">{account.chargesEnabled ? "Le compte peut encaisser des paiements." : "Compte pas encore activé : terminez l'inscription dans Stripe (informations de l'entreprise, IBAN)."}</p>
            </div>
          </div>
        )}
        {info.source === "env" && <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">Clés actuellement lues dans le fichier .env du serveur. Celles saisies ici les remplaceront.</p>}

        <ol className="space-y-5">
          <Step n={1} title="Ouvrir le compte Stripe de l'entreprise">
            <p className="text-sm text-muted-foreground">
              Créez le compte (ou connectez-vous) et activez-le : informations de l'entreprise, SIRET, IBAN pour recevoir les virements. Pour essayer d'abord sans vrai paiement, utilisez le « mode test ».
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://dashboard.stripe.com/register" target="_blank" rel="noreferrer">
                <ExternalLink /> Ouvrir Stripe
              </a>
            </Button>
          </Step>

          <Step n={2} title="Coller les clés API">
            <p className="text-sm text-muted-foreground">
              Dans Stripe : <strong>Développeurs → Clés API</strong>. Copiez la clé publiable et la clé secrète (bouton « Révéler »).
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="st-pk">Clé publiable</Label>
              <Input id="st-pk" value={pk} onChange={(e) => setPk(e.target.value)} placeholder={info.publishableKey || "pk_live_… ou pk_test_…"} className="font-mono text-sm" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-sk">Clé secrète</Label>
              <Input id="st-sk" type="password" value={sk} onChange={(e) => setSk(e.target.value)} placeholder={info.secretKey || "sk_live_… ou sk_test_…"} className="font-mono text-sm" autoComplete="off" />
            </div>
          </Step>

          <Step n={3} title="Brancher le webhook (confirmation des paiements)">
            <p className="text-sm text-muted-foreground">
              Dans Stripe : <strong>Développeurs → Webhooks → Ajouter une destination</strong>. Collez cette adresse et cochez ces 3 événements :
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
              <code className="min-w-0 flex-1 truncate text-sm">{info.webhookUrl}</code>
              <Button variant="ghost" size="icon-sm" onClick={() => copy(info.webhookUrl)} aria-label="Copier l'adresse">
                <Copy />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {info.webhookEvents.map((e) => (
                <button key={e} type="button" onClick={() => copy(e)} className="rounded-md border bg-card px-2 py-1 font-mono text-xs hover:border-gold">
                  {e}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Puis copiez le « Secret de signature » de cette destination :</p>
            <div className="space-y-1.5">
              <Label htmlFor="st-wh">Secret de signature</Label>
              <Input id="st-wh" type="password" value={wh} onChange={(e) => setWh(e.target.value)} placeholder={info.webhookSecret || "whsec_…"} className="font-mono text-sm" autoComplete="off" />
            </div>
          </Step>
        </ol>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button size="lg" onClick={save} disabled={!!busy}>
            {busy === "save" && <Spinner />} Enregistrer et vérifier
          </Button>
          {configured && (
            <Button size="lg" variant="outline" onClick={test} disabled={!!busy}>
              {busy === "test" && <Spinner />} Tester la connexion
            </Button>
          )}
          {info.source === "admin" && (
            <Button size="lg" variant="ghost" className="text-destructive" onClick={remove} disabled={!!busy}>
              Retirer les clés
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Les clés secrètes sont chiffrées dans la base de données et ne sont jamais réaffichées en entier.</p>
      </CardContent>
    </Card>
  );
}

function DeliveryCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const [form, setForm] = useState({ depot: "", base: "", perKm: "", maxDays: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm({ depot: settings.depotAddress, base: String(settings.deliveryBaseFee), perKm: String(settings.deliveryPerKm), maxDays: String(settings.maxConsecutiveDays) });
  }, [settings]);
  const num = (s: string) => Number.parseFloat(s.replace(",", "."));

  async function save() {
    setSaving(true);
    try {
      const r = await api<{ data: Settings }>("/api/admin/settings", {
        method: "PUT",
        json: { depotAddress: form.depot, deliveryBaseFee: num(form.base), deliveryPerKm: num(form.perKm), maxConsecutiveDays: form.maxDays },
      });
      onSaved(r.data);
      toast.success("Réglages enregistrés");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Livraison et location en ligne</CardTitle>
        <CardDescription>Deux allers-retours depuis le dépôt : un pour la dépose, un pour la reprise, soit quatre trajets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="s-depot">Adresse du dépôt (point de départ)</Label>
          <Input id="s-depot" value={form.depot} onChange={(e) => setForm({ ...form, depot: e.target.value })} className="h-10" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-base">Forfait supplémentaire (€ — 0 si aucun)</Label>
            <Input id="s-base" inputMode="decimal" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-km">Prix par km et par trajet (€)</Label>
            <Input id="s-km" inputMode="decimal" value={form.perKm} onChange={(e) => setForm({ ...form, perKm: e.target.value })} className="h-10" />
          </div>
        </div>
        <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          Exemple à 20 km du dépôt : 4 × 20 km × {money(num(form.perKm) || 0)}/km{num(form.base) > 0 ? ` + ${money(num(form.base))} de forfait` : ""}, soit <strong className="text-foreground">{money(deliveryFee(20, num(form.perKm) || 0, num(form.base) || 0))}</strong> pour la dépose et la reprise.
        </p>
        <div className="space-y-1.5 sm:max-w-xs">
          <Label htmlFor="s-days">Durée maximale d'une location en ligne (jours)</Label>
          <Input id="s-days" inputMode="numeric" value={form.maxDays} onChange={(e) => setForm({ ...form, maxDays: e.target.value })} className="h-10" />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Spinner />} Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}

function ServicesCard({ status }: { status: Status | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Autres services</CardTitle>
        <CardDescription>Configurés sur le serveur par votre prestataire technique.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!status ? (
          <Skeleton className="h-32" />
        ) : (
          <>
            <StatusRow ok={status.email} label="E-mails automatiques" detail={status.email ? "Confirmations et annulations envoyées aux clients." : "Non configuré : aucun e-mail n'est envoyé."} />
            <StatusRow ok={status.notificationEmail} label="Alerte nouvelle commande" detail={status.notificationEmail ? "Un e-mail à chaque commande payée." : "Aucune adresse de notification."} />
            <StatusRow ok={status.database === "postgres"} label="Base de données" detail={status.database === "postgres" ? "PostgreSQL." : "Non configurée."} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      {ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />}
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
