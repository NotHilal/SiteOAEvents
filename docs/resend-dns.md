# Domaine d’envoi Resend — OA Événementiel

Le domaine `oa-evenementiel.fr` a été ajouté au compte Resend ouvert dans le navigateur, en région Irlande (`eu-west-1`). La réception via Resend reste désactivée : il ne faut pas remplacer les MX de la boîte mail existante.

Lors du contrôle du 30 octobre 2026, aucune entrée NS ou MX n’a été trouvée pour ce domaine et l’endpoint RDAP officiel de l’Afnic a renvoyé HTTP 404. Il faut confirmer que ce nom de domaine est bien enregistré avant de pouvoir configurer ses DNS. Aucun achat n’a été réalisé.

Les enregistrements suivants sont ceux affichés par Resend pour cette configuration. La clé DKIM est une **clé publique DNS**, pas la clé API privée.

| Type | Nom | Valeur | TTL |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCv4v4j1R0Ngj1suWwo6KSS0yYye4+jzYnyyrMnl3yPvWpBAjPEXAwM14vD9ss1UQ3U4vpK0rQ8Yssigus9Pl8/vZk4gpMP8Ee5gbHrMb/bgAcW8Sa1ZEZ/krtJ2jZgASzjv2C+94wmH4t6jucOdtQa3xcFmywXP5x75gfNgZr7vwIDAQAB` | Auto |
| CNAME | `rsend` | `rsend-euw1.forge.rmta.net` | Auto |
| CNAME | `send` | `send.forge.rmta.net` | Auto |

Ces noms sont relatifs à la zone `oa-evenementiel.fr`. Vérifier l’absence de conflit avec les enregistrements existants avant de les ajouter. Le DMARC facultatif proposé par Resend n’a pas été ajouté ; une politique DMARC existante doit être conservée.

Une fois les DNS publiés, revenir sur la fiche du domaine dans Resend et lancer la vérification. Attendre le statut **Verified** avant d’envoyer depuis `contact@oa-evenementiel.fr`. La clé API est déjà stockée dans la configuration privée du site, hors Git.
