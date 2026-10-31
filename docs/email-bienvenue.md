# Email de bienvenue client

État au 31 octobre 2026 : développé et testé avec un service d’envoi simulé. Aucun email réel n’a été envoyé pendant ces tests. Aucun déploiement effectué.

## Fonctionnement

Une nouvelle inscription prépare un email « Bienvenue chez OA Événementiel », adressé au client depuis l’expéditeur configuré. Il contient le prénom, un lien vers l’espace client, un lien vers le suivi de commande et l’adresse de contact. Il ne contient aucun mot de passe et ne constitue pas une vérification de l’adresse email.

Le compte et les métadonnées d’envoi sont créés dans une même transaction. Une tentative d’envoi dure au maximum deux secondes côté service mail. L’échec de cette tentative ne bloque pas la création du compte ni la connexion.

Les métadonnées sont conservées dans `customer_welcome_emails` : identifiant du compte, date de création, date d’acceptation de l’envoi par le fournisseur et éventuel code d’erreur générique. Une acceptation par le fournisseur ne garantit pas la réception dans la boîte du client.

Si l’envoi reste en attente, une connexion réussie du client déclenche une nouvelle tentative. Il n’y a pas de tâche planifiée de reprise. Un envoi déjà marqué comme accepté n’est pas retenté. Une même clé d’idempotence Resend est utilisée lors des nouvelles tentatives ; la déduplication côté fournisseur dépend aussi de sa fenêtre de conservation. Les comptes désactivés sont exclus.

Les comptes créés avant cette fonctionnalité ne reçoivent pas automatiquement cet email. Aucun envoi collectif rétroactif n’est prévu.

## Activation restante

- Valider le domaine d’envoi dans Resend, étape reportée à la demande du client.
- Configurer une URL de confiance réelle : `PASSWORD_RESET_ORIGIN`, ou `NEXT_PUBLIC_SITE_URL` à défaut. Les liens de cet email partagent actuellement les règles de validation des liens de récupération de mot de passe : HTTPS en production, aucun domaine d’exemple, aucun lien construit depuis l’en-tête Host d’une requête.
- Reporter les variables privées sur l’hébergement de production, sans les publier dans Git.
- Décider du traitement des envois de test en attente avant activation, puis convenir d’un test réel avec l’équipe.

L’URL d’exemple de la configuration actuelle est refusée : ajouter uniquement une clé API ne suffit donc pas à activer ces emails. La réception et la consultation de la boîte contact restent une configuration distincte du service d’envoi.

## Vérifications

`node scripts/test-customer-welcome.mjs` vérifie l’inscription, les liens et le contenu échappé, le destinataire, l’expéditeur, l’absence de doublon après succès, la panne du fournisseur, la reprise à la connexion, la transaction compte/métadonnées et les configurations manquantes. Le script utilise une base temporaire et intercepte les appels au fournisseur : aucun email réel.

`node scripts/test-password-reset.mjs` vérifie également que le parcours de récupération continue de fonctionner avec les nouveaux emails d’inscription.

Le suivi des informations manquantes reste dans [la fiche emails](a-completer/01-emails.md).
