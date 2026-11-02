# Mise en ligne d'OA Événementiel sur un VPS

## Installation actuelle : VPS partagé (nginx + pm2)

Le site tourne sur `79.137.72.112` (`ssh vps-site`) à côté d'autres sites, comme eux avec nginx, pm2 et le PostgreSQL du serveur :

| Élément | Emplacement |
| --- | --- |
| Configuration et secrets | `/var/www/oa-evenementiel/shared/.env` (droits 600) |
| Code source | `/var/www/oa-evenementiel/repo` |
| Version en ligne | `/var/www/oa-evenementiel/current`, lien vers `releases/…` |
| Sauvegardes | `/var/www/oa-evenementiel/backups` (chaque nuit à 3 h, 14 jours, cron de `ubuntu`) |
| Application | pm2 `oa-evenementiel`, port local 3140 |
| Base de données | PostgreSQL local, base et rôle `oa` |
| Web | `/etc/nginx/sites-available/oa-evenementiel.fr`, certificat certbot |

**Mettre à jour le site**, après un `git push` sur `main` :

```bash
ssh vps-site /var/www/oa-evenementiel/repo/deploy/deploy.sh
```

Le script construit la nouvelle version à côté de l'ancienne, bascule, puis vérifie `/api/health`. En cas d'échec, l'ancienne version est restaurée. Les migrations de base s'appliquent au démarrage.

**Surveiller :** `pm2 logs oa-evenementiel` et `pm2 ls`.

**Restaurer une sauvegarde** (remplace la base actuelle) :

```bash
pm2 stop oa-evenementiel
DB=$(sed -n 's/^DATABASE_URL=//p' /var/www/oa-evenementiel/shared/.env)
gunzip -c /var/www/oa-evenementiel/backups/oa-AAAAMMJJ-HHMMSS.sql.gz | psql "$DB"
pm2 start oa-evenementiel
```

Les sauvegardes restent sur le même disque que le site : copiez-les régulièrement ailleurs. Ne changez jamais `SETTINGS_ENCRYPTION_KEY`, qui chiffre les clés Stripe. La configuration de Stripe et des e-mails est décrite aux § 4 et 6.

**Apple Pay :** déclarez aussi `oa-evenementiel.fr` dans Stripe, *Paramètres → Moyens de paiement → Domaines*.

---

## Variante : VPS dédié avec Docker

Sur un serveur dont les ports 80 et 443 sont libres, tout peut tourner dans Docker :

| Service | Rôle |
| --- | --- |
| `app` | Le site et l'administration (`/admin`), Next.js |
| `db` | PostgreSQL 17 : catalogue, commandes, clients, réglages, photos |
| `caddy` | HTTPS automatique (Let's Encrypt), redirection `www` → domaine |
| `backup` | Sauvegarde de la base chaque nuit à 3 h dans `./backups` |

Aucun service externe n'est nécessaire pour la base de données. Stripe (paiement) et la messagerie OVH (e-mails) sont les seuls services tiers.

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
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `NOTIFICATION_EMAIL` | e-mails (voir § 6) |

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

## 6. E-mails (SMTP OVH)

Le site envoie ses e-mails avec la boîte `contact@oa-evenementiel.fr` : `SMTP_HOST=ssl0.ovh.net`, `SMTP_PORT=465`, `SMTP_USER` (adresse complète) et `SMTP_PASSWORD`. **Si le mot de passe de la boîte change, mettez-le aussi à jour dans `.env`** puis redémarrez le site, sinon plus aucun e-mail ne part. Les e-mails de commande non envoyés restent en attente et repartent ensuite. Sans cette configuration, le site fonctionne mais n'envoie rien.

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
