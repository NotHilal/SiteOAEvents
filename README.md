# SiteOAEvents

Site et administration d'OA Événementiel : Next.js + PostgreSQL, déployé en Docker sur un VPS.
**Mise en ligne : [DEPLOIEMENT.md](DEPLOIEMENT.md).**

## Organisation du dépôt

| Dossier | Contenu |
| --- | --- |
| `pages/` | Site public (Pages Router, Bootstrap) et API : `pages/api/` (public) et `pages/api/admin/` (admin, jeton requis) |
| `app/admin/` | Routes de l'administration `/admin` (App Router) |
| `src/admin/` | Composants de l'admin (shadcn/ui, Tailwind v4, alias `@/`) |
| `src/components/`, `src/styles/` | Composants et styles du site public |
| `src/lib/` | Logique serveur : base (`db/`), commandes, stock, Stripe, e-mails, auth |
| `public/` | Fichiers servis tels quels (logos, vidéo d'accueil, photos du catalogue) |
| `medias/` | Photos et logos **sources** (non servis, hors image Docker) |
| `scripts/` | Tests d'intégration, import SQLite → PostgreSQL, plugins PostCSS |
| `deploy/` | Configuration Caddy (HTTPS) |
| `docs/` | Notes de fonctionnement et fiches à compléter avant la mise en service |

## Développement

```bash
npm install
npm run db:up      # PostgreSQL local (Docker)
npm run db:import-sqlite -- data/db.sqlite   # facultatif : reprendre l'ancienne base
npm run dev        # http://localhost:3000, admin sur /admin
npm test           # tests d'intégration (bases PostgreSQL temporaires)
```

`.env.local` doit contenir `DATABASE_URL=postgres://oa:oa_dev_pw@localhost:5432/oa` ainsi que `ADMIN_EMAIL` / `ADMIN_PASSWORD` (voir `.env.example`).

## Administration (`/admin`)

| Page | Rôle |
| --- | --- |
| Tableau de bord | Livraisons / reprises du jour, 7 prochains jours, ruptures à 30 jours, sommes à encaisser |
| Calendrier | Vue mois + planning produit × jour (stock restant vert / orange / rouge), filtres, fermeture d'un jour |
| Commandes | Commandes du site (Stripe), commandes manuelles et blocages ; fiche détaillée, paiement, annulation |
| Matériel | Une fiche par article : disponibilités, stock (+/− avec historique), prix (paliers, week-end), photos, options |
| Clients | Clients (avec ou sans compte) et leurs commandes, messages du formulaire de contact |
| Site | Catégories du catalogue, réalisations, images & couleurs, page À propos |
| Réglages | Livraison, durée maximale, paiement Stripe, état des services |

## Repères techniques

- **Base de données** : PostgreSQL (`DATABASE_URL`), accès serveur uniquement via `src/lib/db/`. Le schéma est versionné dans `src/lib/db/migrations.js` et appliqué au démarrage. Le navigateur ne touche jamais les tables directement.
- **Stripe** : clés saisies dans Réglages, stockées chiffrées (`src/lib/stripe.js`).
- **Blocages et commandes manuelles** : enregistrés dans `reservations` (`order_kind` = `block` / `manual`), ils réduisent automatiquement le stock disponible (`src/lib/admin-bookings.js`).
- **Styles** : Tailwind ne s'applique qu'à `src/admin/styles/` (`scripts/postcss-admin-tailwind.cjs`). La CSP de `/admin` (nonce) est posée par `proxy.js`, celle du site par `next.config.js`.
- **`/example`** : copies de pages de référence de design (non indexées), affichées en iframe.
