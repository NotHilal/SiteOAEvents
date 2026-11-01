# SiteOAEvents

Site et administration d'OA Événementiel : Next.js + PostgreSQL, déployé en Docker sur un VPS. **Mise en ligne : [DEPLOIEMENT.md](DEPLOIEMENT.md).**

## Administration (`/admin`)

Espace de gestion quotidien d'OA Événementiel (Next.js App Router + Tailwind v4 + shadcn/ui, thème OA). Le site public reste dans `pages/` (Bootstrap) ; `/espace-oa` redirige vers `/admin`.

| Page | Rôle |
| --- | --- |
| Tableau de bord | Livraisons / reprises du jour, 7 prochains jours, ruptures à 30 jours, sommes à encaisser |
| Calendrier | Vue mois + planning produit × jour (stock restant vert / orange / rouge), filtres produit / catégorie, fermeture d'un jour |
| Commandes | Commandes du site (Stripe), commandes manuelles et blocages ; fiche détaillée, paiement, annulation |
| Matériel | Une fiche par article : disponibilités, stock (+/− avec historique), prix (paliers, week-end), fiche & photos, options |
| Clients | Clients (avec ou sans compte) et leurs commandes, messages du formulaire de contact |
| Site | Catégories du catalogue, réalisations, images & couleurs, page À propos |
| Réglages | Livraison, durée maximale, état des services (Stripe, e-mails, base) |

**Base de données** : PostgreSQL (`DATABASE_URL`), accès serveur uniquement via `src/lib/db/` (schéma versionné dans `src/lib/db/migrations.js`, appliqué au démarrage). Le navigateur ne lit ni n'écrit jamais les tables directement : routes dédiées dans `pages/api/` (public) et `pages/api/admin/` (admin, jeton requis).

**Stripe** : clés saisies dans Réglages, stockées chiffrées (`src/lib/stripe.js`).

**Blocages et commandes manuelles** : enregistrés dans `reservations` (`order_kind` = `block` / `manual`, statut `confirmed`). Ils réduisent donc automatiquement le stock disponible sur le site et au paiement. Logique serveur : `src/lib/admin-bookings.js`, API : `pages/api/admin/*`.

Code : `app/admin/*` (routes), `src/admin/*` (composants, alias `@/`). Tailwind ne s'applique qu'à `src/admin/styles/` (`scripts/postcss-admin-tailwind.cjs`). La CSP de `/admin` (nonce) est posée par `proxy.js`.
