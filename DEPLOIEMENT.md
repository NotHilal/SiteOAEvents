# Mise en ligne d'OA Événementiel sur un VPS

Tout tourne dans Docker sur le VPS :

| Service | Rôle |
| --- | --- |
| `app` | Le site et l'administration (`/admin`), Next.js |
| `db` | PostgreSQL 17 : catalogue, commandes, clients, réglages, photos |
| `caddy` | HTTPS automatique (Let's Encrypt), redirection `www` → domaine |
| `backup` | Sauvegarde de la base chaque nuit à 3 h dans `./backups` |

Aucun service externe n'est nécessaire pour la base de données. Stripe (paiement) et Resend (e-mails) sont les seuls services tiers.

---

## 1. Préparer le VPS

VPS Linux (Ubuntu 24.04 conseillé), 2 Go de RAM minimum.

```bash
# Docker
curl -fsSL https://get.docker.com | sh
# Pare-feu : SSH + web uniquement
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
# Swap de 2 Go : évite que la compilation du site (`--build`) manque de mémoire
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**DNS** : chez le registraire du domaine, faites pointer `oa-evenementiel.fr` et `www.oa-evenementiel.fr` (enregistrements A, et AAAA si IPv6) vers l'IP du VPS.

## 2. Installer le site

```bash
git clone <url-du-depot> oa && cd oa
cp .env.example .env
nano .env
```

Dans `.env`, remplissez au minimum :

| Variable | Valeur |
| --- | --- |
| `DOMAIN` / `NEXT_PUBLIC_SITE_URL` | `oa-evenementiel.fr` / `https://oa-evenementiel.fr` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` (lettres et chiffres uniquement) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | identifiants de l'administration |
| `JWT_SECRET`, `CUSTOMER_JWT_SECRET`, `SETTINGS_ENCRYPTION_KEY` | chacun : `openssl rand -hex 32` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICATION_EMAIL` | e-mails (voir § 6) |

> ⚠️ Ne changez **jamais** `SETTINGS_ENCRYPTION_KEY` après coup : elle chiffre les clés Stripe enregistrées dans l'admin.

Démarrage :

```bash
docker compose up -d --build
docker compose logs -f app      # Ctrl+C pour quitter
```

Au premier démarrage, le schéma de la base est créé automatiquement, ainsi que le catalogue de départ si la base est vide. Le site est en ligne sur `https://oa-evenementiel.fr`, l'administration sur `/admin`.

## 3. Reprendre les données existantes (facultatif)

Pour récupérer le catalogue, les photos, les commandes et les comptes de l'ancienne base SQLite (`data/db.sqlite`) :

```bash
# depuis votre ordinateur
scp data/db.sqlite user@vps:~/oa/data/db.sqlite
# sur le VPS
docker compose run --rm tools node scripts/migrate-sqlite-to-postgres.mjs /import/db.sqlite --replace
docker compose restart app
```

Le script affiche le nombre de lignes copiées par table. `--replace` vide d'abord la base PostgreSQL : à n'utiliser qu'à l'installation.

## 4. Configurer Stripe (paiement en ligne)

Tout se fait depuis l'administration : **Réglages → Paiement en ligne**. La page guide pas à pas.

1. **Compte Stripe de l'entreprise** : créer le compte sur [dashboard.stripe.com](https://dashboard.stripe.com/register) et l'activer (SIRET, représentant légal, IBAN). Tant qu'il n'est pas activé, utiliser le *mode test*.
2. **Clés API** : dans Stripe, *Développeurs → Clés API*. Coller la clé publiable (`pk_…`) et la clé secrète (`sk_…`) dans Réglages, puis cliquer sur **Enregistrer et vérifier**. Les clés sont testées auprès de Stripe avant d'être enregistrées, et la clé secrète est chiffrée en base.
3. **Webhook** : dans Stripe, *Développeurs → Webhooks → Ajouter une destination*.
   - URL : `https://oa-evenementiel.fr/api/payments/webhook`, copiable depuis Réglages.
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.
   - Copier le **secret de signature** (`whsec_…`) dans Réglages.
4. **Moyens de paiement** : dans Stripe, *Paramètres → Moyens de paiement*. Activer la carte, Apple Pay, Google Pay, etc. Aucun changement de code n'est nécessaire.

**Tester avant d'ouvrir :** avec des clés de test, passer une commande avec la carte `4242 4242 4242 4242` (date future quelconque, CVC quelconque). La commande apparaît « Payée » dans l'admin. Ensuite, remplacer par les clés réelles (`pk_live_` / `sk_live_`) et créer le webhook en mode réel, qui a son propre secret.

## 5. Sauvegardes

Le service `backup` fait un `pg_dump` chaque nuit dans `./backups`. Il conserve 14 sauvegardes quotidiennes, 8 hebdomadaires et 12 mensuelles. Copiez régulièrement ce dossier hors du VPS (ex. `rsync` vers votre ordinateur, ou l'option de sauvegarde de l'hébergeur).

```bash
# sauvegarde immédiate
docker compose exec backup /backup.sh
# restauration (remplace la base actuelle)
docker compose stop app
gunzip -c backups/last/oa-latest.sql.gz | docker compose exec -T db psql -U oa -d oa
docker compose start app
```

## 6. E-mails (Resend)

Créez un compte sur [resend.com](https://resend.com). Vérifiez le domaine en ajoutant les enregistrements DNS indiqués par Resend, puis renseignez `RESEND_API_KEY` et `EMAIL_FROM` dans `.env` et lancez `docker compose up -d`. Sans cela, le site fonctionne mais n'envoie aucun e-mail (confirmations de commande, mot de passe oublié).

## 7. Mettre à jour le site

```bash
cd ~/oa && git pull && docker compose up -d --build
```

Les nouvelles migrations de base s'appliquent automatiquement au démarrage. Pendant le redémarrage, Caddy fait patienter les visiteurs (jusqu'à 30 s) au lieu d'afficher une erreur.

Pour libérer de la place de temps en temps : `docker image prune -f` (anciennes versions du site).

## 8. Surveiller

```bash
docker compose ps                 # « healthy » = site et base répondent
docker compose logs --tail 100 app
```

Chaque service redémarre seul en cas de plantage ou de redémarrage du VPS. Les journaux sont limités à 30 Mo par service, ils ne peuvent pas remplir le disque.

## Développement en local

Voir [README.md](README.md#développement).
