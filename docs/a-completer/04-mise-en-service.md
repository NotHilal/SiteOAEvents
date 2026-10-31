# 4. Autres points avant mise en service

Cette fiche complète le suivi des emails et des pages légales. Elle n’autorise pas un achat ou une mise en ligne et ne signifie pas que les opérations ci-dessous ont déjà été faites.

## Paiements

- [x] RIB fourni enregistré dans les réglages de l’environnement actuel au nom d’OA Événementiel. Les coordonnées complètes ne figurent pas dans les documents du dépôt.
- [ ] Confirmer que le gérant saura constater les virements dans l’admin via **Marquer reçu**.
- [ ] Si le paiement par carte est retenu : configurer le compte Stripe de l’entreprise, la clé publique, la clé secrète et le secret du webhook.
- [ ] Déclarer le webhook `/api/payments/webhook` dans Stripe.
- [ ] Effectuer le parcours de bout en bout en mode test Stripe : succès, refus, authentification bancaire, échéances et notifications répétées.
- [ ] Valider les règles commerciales de paiement avec les CGV : voir [fiche 3](03-cgv-et-confidentialite.md).

## Hébergement et exploitation

- [ ] Choisir l’hébergeur du site et celui de la base de données.
- [ ] Prévoir la migration des données et réglages de l’environnement actuel ; les données et secrets locaux ne sont pas partagés par un push Git.
- [ ] Définir les sauvegardes de la base et des médias, leur fréquence et leur restauration.
- [ ] Configurer les accès administrateur de production et les variables privées chez l’hébergeur.
- [ ] Définir l’URL de production (`NEXT_PUBLIC_SITE_URL`) et configurer le HTTPS lorsque la mise en ligne sera reprise. La configuration consultée affiche encore une URL d’exemple (`www.exemple.fr`) : elle ne doit pas être conservée pour les liens et métadonnées de production.
- [ ] Confirmer l’origine des liens de réinitialisation (`PASSWORD_RESET_ORIGIN`, ou `NEXT_PUBLIC_SITE_URL` par défaut) : HTTPS hors localhost, aucun domaine d’exemple. Tester un lien réel reçu dans la boîte du client une fois les emails activés.
- [ ] Vérifier les envois en attente et décider avec l’équipe des emails à envoyer lors de l’activation. Ne pas expédier de données de test à des clients réels.

## Contenus et validation

- [ ] Ajouter au moins une vraie réalisation dans **Espace OA → Nos réalisations** : titre, description, récit, couverture, photos et vidéos éventuelles.
- [ ] Confirmer les autorisations de publication des contenus et les crédits nécessaires.
- [ ] Valider les tarifs, quantités disponibles, frais de livraison et paramètres des échéanciers avec OA.
- [ ] Tester les parcours sur ordinateur et téléphone avec la configuration de production : catalogue, panier, commande, paiement, suivi, emails, admin et réalisations.
- [ ] Compléter les champs manquants des pages légales et valider les contenus avant publication.
- [ ] Enregistrer les changements dans Git, les pousser puis effectuer le déploiement prévu. Aucun déploiement n’a été effectué dans les étapes documentées ici.

## Périmètre déjà développé

- Gestion des réalisations dans l’admin et affichage public.
- Commande directe de matériel avec contrôle du stock et des prix côté serveur.
- Prestations sur mesure orientées vers une demande de devis.
- Confirmation après réception du premier versement et expiration des commandes impayées.
- Préparation des emails de création / confirmation ; activation réelle encore bloquée par le domaine.
- Parcours de réinitialisation du mot de passe client et déconnexion des anciennes sessions après changement ; validation avec emails simulés.
- Email de bienvenue à l’inscription, avec reprise en cas d’échec lors d’une connexion ultérieure ; validation avec emails simulés, activation réelle en attente.

Les nouveaux emails de compte client et autres notifications à ajouter sont listés dans [la fiche emails](01-emails.md).
