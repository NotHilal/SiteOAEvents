# Réinitialisation du mot de passe client

## Parcours

Le lien **Mot de passe oublié ?** de `/mon-compte/connexion` ouvre `/mon-compte/mot-de-passe-oublie`.

Le client saisit son email. La réponse est identique pour une adresse connue, inconnue ou un compte désactivé. Une adresse active peut recevoir un lien valable **30 minutes**, à usage unique. Le client saisit deux fois son nouveau mot de passe puis se reconnecte normalement ; aucune connexion automatique n’est créée après la réinitialisation.

Le mot de passe doit contenir entre 8 et 128 caractères, avec au moins une lettre et un chiffre, comme pour les nouveaux comptes. Les mots de passe existants continuent d’être vérifiés avec leur empreinte scrypt.

## Sécurité et stockage

- Les requêtes publiques sont limitées par IP ; les demandes d’un compte ont un délai de 60 secondes et une limite de trois nouvelles demandes par heure dans la base.
- La table `customer_password_resets` stocke l’identifiant aléatoire de la demande, l’empreinte SHA-256 du jeton, les dates et les états d’envoi/utilisation. Elle ne stocke ni le jeton brut ni le lien d’accès complet.
- Le jeton est produit côté serveur à partir d’un HMAC avec un secret d’authentification client (`CUSTOMER_JWT_SECRET`, ou `JWT_SECRET`), distinct de son identifiant de demande. Une copie de la seule base ne permet pas de recréer le jeton.
- Le lien contient le jeton dans le fragment `#token=…`, qui n’est pas envoyé dans la requête HTTP de chargement de page. La page utilise `no-referrer`, `no-store` et `noindex`. Les liens ne sont pas ajoutés au sitemap.
- La consommation du lien, la mise à jour de l’empreinte du mot de passe, l’invalidation des autres liens et l’incrément de version de session sont réalisés dans une transaction.
- Les anciennes sessions sont refusées par les API de session et de profil après le changement. La session du navigateur qui réinitialise est également effacée.
- Aucun mot de passe ou jeton n’est écrit dans les journaux ou retourné par les API de demande.
- Le lien de réinitialisation et l’email de notification de changement sont envoyés uniquement à l’adresse enregistrée sur le compte, jamais à une adresse transmise dans l’appel de changement de mot de passe.

## Emails et configuration encore en attente

L’activation réelle des emails reste mise de côté à la demande du client. La clé Resend est déjà enregistrée dans la configuration privée ; elle ne doit pas être copiée dans ce document.

L’origine des liens provient de `PASSWORD_RESET_ORIGIN` si elle est renseignée, sinon de `NEXT_PUBLIC_SITE_URL`. L’en-tête `Host` fourni par la requête n’est jamais utilisé pour construire le lien. HTTPS est requis, sauf pour localhost. Les valeurs d’exemple (`exemple.fr`, `example.com`, etc.) sont refusées : le formulaire indique alors une indisponibilité temporaire sans rechercher ni divulguer le compte.

Le domaine Resend doit être vérifié et l’expéditeur autorisé avant les essais d’envoi réel. En cas d’erreur d’envoi, la demande conserve un état d’échec générique, sans URL ni réponse brute du prestataire. Aucun succès d’envoi n’est enregistré lorsque Resend n’est pas configuré. Un nouveau lien peut être demandé après le délai de protection ; il expire toujours 30 minutes après sa création. Les liens expirés ne doivent pas être envoyés en rattrapage lors de l’activation des emails.

Le changement de mot de passe reste acquis même si son email de notification échoue. L’erreur d’envoi ne doit pas provoquer une seconde modification ni annoncer à tort l’échec du changement de mot de passe.

La durée de conservation et la purge de l’historique technique restent à fixer avec la politique de confidentialité. L’expiration d’un lien ne constitue pas à elle seule une suppression de sa ligne de suivi.

## Vérification

```sh
npm run build
node scripts/test-password-reset.mjs
```

Le script lance un serveur de production sur un port libre, une base temporaire et un faux service d’email. Il contrôle les réponses génériques, les liens, l’expiration, l’usage unique et concurrent, le changement de mot de passe, l’invalidation des sessions, les comptes désactivés, les limites de fréquence et les en-têtes. Il ne contacte pas Resend et n’utilise aucun compte réel.

`node scripts/test-password-reset.mjs --preview` conserve le serveur de test sur le port 3100 pour vérifier les pages dans le navigateur. Les données de test sont jetables ; ce serveur ne doit pas être utilisé pour l’exploitation du site.

Référence de conception : [OWASP — Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
