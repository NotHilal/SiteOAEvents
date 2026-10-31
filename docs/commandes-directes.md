# Commandes de location directes

## Parcours

Le catalogue et `/reservation` concernent la location de matériel. Le client choisit les dates, les quantités et la livraison, vérifie le récapitulatif puis passe directement au paiement. Les prestations d’organisation sur mesure renvoient vers `/contact` pour un devis. `/devis` reste une simulation, sans enregistrement.

Le stock, les créneaux bloqués et les tarifs sont contrôlés côté serveur. Le contrôle et l’enregistrement utilisent une vraie transaction d’écriture libSQL. Le stock est réservé sur chaque journée de location, même si le client précise des heures. Plusieurs commandes peuvent partager une date dans la limite du stock. Une clé de tentative empêche de créer deux commandes après un double clic ou une réponse réseau perdue.

## Paiement et statuts

- Nouvelle commande : `awaiting_payment`, stock retenu 30 minutes.
- Carte : la notification Stripe signée confirme la réception du premier versement et fait passer la commande à `confirmed`. Les éventuels versements suivants restent dans l’échéancier existant.
- Virement : le stock est retenu pendant 48 heures au maximum, sans dépasser le début de l’événement en heure de Paris. Le gérant constate la réception via **Marquer reçu** dans l’admin ; la confirmation de commande est alors automatique.
- Sans premier versement : `expired` et libération du stock. L’expiration est évaluée lors des accès au stock, au suivi, aux commandes et au paiement, sans tâche planifiée supplémentaire.
- Avant de libérer un stock associé à une carte, le serveur vérifie puis annule le paiement Stripe. Un paiement en traitement ou une panne Stripe conserve la réservation jusqu’à une nouvelle vérification. Les tentatives interrompues sont récupérées avec leur clé Stripe d’origine.
- Un versement bancaire reçu après expiration nécessite un traitement avec le client ; le bouton de réception ne réactive pas une commande dont le stock a été libéré.
- Une commande confirmée peut être marquée `terminee` par le gérant. Les commandes directes et leurs paiements restent conservés pour le suivi ; les changements manuels de statut ou de total ne doivent pas contourner le paiement.

Le moyen de paiement et le nombre de versements sont fixés lors de leur première préparation. Les nouvelles tentatives reprennent le même paiement et ne recréent pas de prélèvement.

## Emails

Les emails de création et de confirmation sont préparés pour le client et pour l’adresse `NOTIFICATION_EMAIL`, si elle est configurée (avec repli sur `ADMIN_EMAIL` pour les anciennes configurations). Cette adresse de réception est indépendante de l’identifiant de connexion à l’admin. Une table `order_emails` conserve les envois à effectuer. Les échecs ne suppriment pas la commande ; ils sont retentés lors d’un prochain accès au suivi, d’une nouvelle commande ou d’une confirmation. Une clé d’idempotence est transmise à Resend. Aucun envoi n’est marqué réussi lorsque le service d’emails n’est pas configuré.

## Configuration avant mise en service

La carte nécessite `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` et `STRIPE_WEBHOOK_SECRET`, avec le webhook `/api/payments/webhook` enregistré chez Stripe. Pour les essais réels de bout en bout, utiliser le mode test Stripe. Recompiler après tout changement de clé publique.

Le virement se configure dans **Espace OA → Réglages → Virement**. Le RIB fourni par le client a été enregistré dans les réglages de cet environnement au nom d’OA Événementiel. Les coordonnées complètes restent dans la base de données et ne sont pas enregistrées dans le code source.

L’envoi d’emails nécessite `RESEND_API_KEY`, un expéditeur autorisé dans `EMAIL_FROM`, l’adresse de réception des notifications d’OA Événementiel dans `NOTIFICATION_EMAIL` et l’URL définitive du site dans `NEXT_PUBLIC_SITE_URL`. L’environnement actuel utilise `contact@oa-evenementiel.fr` comme expéditeur et destinataire des notifications. La clé Resend reste à renseigner, et l’expéditeur doit être autorisé chez Resend avant l’envoi réel. Les autres sections incomplètes des CGV restent à compléter séparément.

En l’absence de tout moyen de paiement, le site indique que la commande est indisponible et propose le contact. Aucun faux paiement ni livraison gratuite implicite n’est accepté.

## Vérification

```sh
npm run build
node scripts/test-direct-orders.mjs
node scripts/test-direct-orders-http.mjs
node scripts/test-realisations.mjs
```

Les tests utilisent des bases temporaires et des prestataires simulés. Ils n’envoient aucun véritable email, ne débitent aucun compte et ne modifient pas la base du site. `node scripts/test-direct-orders-http.mjs --preview` conserve un serveur de vérification sur `http://127.0.0.1:3100` pour le contrôle navigateur. L’admin de cet environnement de test utilise uniquement `preview@oa.test` / `oa-preview-local`.
