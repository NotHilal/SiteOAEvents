# 1. Emails — ce qu’il reste à faire

**Statut : activation mise en attente à la demande du client.**

## Déjà en place

- Service Resend intégré au site.
- Clé API fournie et enregistrée dans la configuration privée locale, hors Git. **La clé ne manque plus.**
- Expéditeur configuré : **OA Événementiel <contact@oa-evenementiel.fr>**.
- Réception des notifications de commandes configurée sur **contact@oa-evenementiel.fr**.
- Identifiant de connexion admin séparé de l’adresse des notifications.
- Domaine `oa-evenementiel.fr` ajouté dans Resend, région Irlande.
- Préparation des emails de création de commande et de confirmation après réception du premier versement, pour le client et OA.
- File d’attente des emails avec reprise des envois échoués lors de certains accès au site.
- Tests avec services simulés. Aucun email réel n’a été envoyé pendant ces vérifications.

## Informations et accès nécessaires

- [ ] Confirmer si `oa-evenementiel.fr` a été acheté, par qui et chez quel fournisseur. Au dernier contrôle, aucune entrée DNS NS/MX n’a été trouvée et l’annuaire Afnic a répondu « domaine introuvable ».
- [ ] Si nécessaire, enregistrer/activer le domaine : aucun achat n’a été effectué par l’agent.
- [ ] Identifier la personne disposant des accès de gestion DNS.
- [ ] Confirmer où sera hébergée la boîte **contact@oa-evenementiel.fr** et qui pourra la consulter. Le service d’envoi Resend ne crée pas automatiquement cette boîte mail.

## Actions techniques à reprendre ensuite

- [ ] Ajouter les trois enregistrements DNS affichés dans Resend : un TXT DKIM et deux CNAME. Valeurs exactes : [configuration DNS préparée](../resend-dns.md).
- [ ] Conserver les enregistrements de réception de la boîte mail existante ; l’option de réception dans Resend n’a pas été activée.
- [ ] Obtenir le statut **Verified** du domaine dans Resend.
- [ ] Reporter la clé et les paramètres dans la configuration privée de l’hébergement de production : `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICATION_EMAIL`, `NEXT_PUBLIC_SITE_URL`.
- [ ] Envoyer un email de test convenu avec l’équipe ; vérifier la réception, le dossier indésirables, le nom d’expéditeur, les réponses et les liens.
- [ ] Tester les emails déclenchés par une vraie commande de test et par sa confirmation de paiement, sans facturer un client réel.

## Emails supplémentaires à définir et développer

Ces éléments ne font pas partie des emails de commande déjà implémentés :

- [x] Email de bienvenue après création d’un compte client développé et testé avec un service simulé. L’inscription fonctionne même en cas d’échec d’envoi, avec une nouvelle tentative à la connexion suivante. Voir [le fonctionnement](../email-bienvenue.md).
- [ ] Activer et tester réellement l’email de bienvenue après validation du domaine et configuration de l’URL de confiance. Cet email ne vérifie pas la propriété de l’adresse du client.
- [x] Parcours et emails de réinitialisation du mot de passe développés et testés avec un service simulé : lien temporaire, nouveau mot de passe et notification de changement. Voir [le fonctionnement](../reinitialisation-mot-de-passe.md).
- [ ] Activer et tester réellement les emails de réinitialisation après validation du domaine Resend et configuration de l’URL de confiance. L’URL d’exemple actuellement configurée est refusée pour l’envoi de ces liens.
- [ ] Décider des autres notifications souhaitées : rappels de paiement, échec d’une échéance, expiration, modification ou annulation, rappel avant livraison.
- [ ] Fournir ou valider le texte et le destinataire de chaque notification retenue.

Ne pas ajouter de secrets dans ce dossier. Les limites de la clé actuelle empêchent de consulter les domaines via l’API ; leur vérification a été poursuivie dans le navigateur.
