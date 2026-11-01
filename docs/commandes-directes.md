# Commandes de location directes

## Parcours client

Le client fonctionne comme sur un site marchand classique : il commande et paie, puis la commande est confirmée. Personne ne la valide à la main.

1. Le client ajoute des articles au panier depuis le catalogue : tiroir panier, fiche produit ou aperçu rapide. Les dates vérifiées sur une fiche produit restent attachées au panier.
2. **Commander** ouvre `/commande`, une page unique en trois blocs, avec le panier modifiable à côté :
   - la date de l'événement : calendrier, période d'au plus *N* jours consécutifs (Réglages) ;
   - la livraison et les coordonnées : l'adresse est proposée en autocomplétion, et les frais sont calculés tout de suite ;
   - le paiement, avec le Payment Element de Stripe.
3. Le bouton **Payer X €** crée la commande sur le serveur, puis confirme le paiement. Le client arrive ensuite sur `/commande/confirmation`, avec son numéro de commande et le récapitulatif. Le panier est alors vidé.

`/reservation` redirige vers `/commande`. Les prestations sur mesure passent par `/contact`.

Les points suivants sont tous recontrôlés côté serveur, dans une transaction d'écriture libSQL : prix, stock par jour, jours bloqués et frais de livraison. Une journée partiellement bloquée dans **Blocages** n'est plus réservable. Si le client clique plusieurs fois sur le même panier, la même commande et le même paiement sont repris. S'il modifie son panier après un échec, une nouvelle commande est créée et la précédente libère son stock tout de suite.

## Moyens de paiement

Stripe propose automatiquement tous les moyens activés dans le **tableau de bord Stripe → Paramètres → Moyens de paiement** : carte, Apple Pay, Google Pay, **PayPal**, etc. Il n'y a rien à coder pour en ajouter un. Pour PayPal, il suffit de l'activer chez Stripe.

Le paiement par virement et le paiement en plusieurs fois ont été retirés.

## Statuts

- `awaiting_payment` : la commande vient d'être créée et le stock est retenu 30 minutes, le temps du paiement.
- `confirmed` : le paiement a réussi. La confirmation vient du webhook signé, ou de la page de retour, qui relit le paiement chez Stripe. Un email part au client et à `NOTIFICATION_EMAIL`.
- `expired` : la commande n'a pas été payée à temps. Le paiement Stripe est annulé et le stock libéré. Avant d'expirer, le serveur vérifie chez Stripe : un paiement réussi est conservé, et un paiement en cours de traitement garde le stock.
- `cancelled` : la commande a été annulée par OA et remboursée intégralement.

## Côté Espace OA

L'onglet **Commandes** liste les commandes. Il n'y a rien à valider. La seule action possible est **Annuler et rembourser** : le remboursement Stripe est total, le client est prévenu par email et le stock redevient disponible. Un remboursement total fait directement dans le tableau de bord Stripe annule aussi la commande (événement `charge.refunded`).

## Configuration avant mise en service

- `.env` : `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` et `STRIPE_WEBHOOK_SECRET`. Sans les deux premières, la page de commande affiche « paiement bientôt disponible ». Il faut recompiler après tout changement de clé publique.
- Webhook Stripe : `https://oa-evenementiel.fr/api/payments/webhook`, avec les événements `payment_intent.succeeded`, `payment_intent.payment_failed` et `charge.refunded`.
- Emails : `RESEND_API_KEY`, `EMAIL_FROM` (expéditeur autorisé chez Resend), `NOTIFICATION_EMAIL` et `NEXT_PUBLIC_SITE_URL`. Les emails sont mis en file dans `order_emails` et renvoyés si l'envoi échoue.
- Pour les essais, utiliser les clés **test** de Stripe et la carte `4242 4242 4242 4242`.

## Vérification

```sh
node scripts/test-direct-orders.mjs
```

Ce test utilise une base temporaire et des prestataires simulés (Stripe, géocodage, emails). Il n'envoie aucun véritable email et ne débite rien.
