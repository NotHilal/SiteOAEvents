# SEO — structure du site et actions à mener

## Structure en place

| Type de page | URL | Contenu |
| --- | --- | --- |
| Catégories | `/location/<slug>` | Liste + textes de `src/lib/seo/catalogue.js` |
| Produits | `/catalogue/<slug>` | Fiche + texte de `src/lib/seo/catalogue.js` |
| Zones | `/location-materiel-evenementiel/<slug>` | `ZONES` dans `src/lib/seo/landings.js` |
| Événements | `/evenements/<slug>` | `EVENTS` dans `src/lib/seo/landings.js` |
| Guides | `/guides/<slug>` | `GUIDES` dans `src/lib/seo/landings.js` |
| FAQ | `/faq` | `FAQ_GROUPS` dans `src/lib/seo/landings.js` |

Le sitemap (`/sitemap.xml`) reprend ces pages automatiquement. Une catégorie créée dans l'admin obtient sa page, avec un texte générique tant qu'elle n'a pas d'entrée dans `catalogue.js`. Le footer liste les catégories de `catalogue.js` : y retirer une catégorie supprimée de l'admin.

Règles de contenu : pas d'avis, de clients ou d'événements inventés ; pas de page de ville dupliquée en changeant seulement le nom (risque de sanction « doorway pages »).

## À faire au lancement

1. **Google Search Console** : ajouter le domaine (vérification DNS), envoyer `https://oa-evenementiel.fr/sitemap.xml`. Idem sur Bing Webmaster Tools.
2. **Fiche Google Business Profile** : catégorie « Service de location de matériel pour événements », zones desservies, photos réelles, horaires. C'est le levier principal pour les recherches locales.
3. **Téléphone** : renseigner `NEXT_PUBLIC_SITE_PHONE` ; il apparaît alors dans le footer et les données structurées.
4. **Réseaux sociaux** : renseigner `SITE.social` dans `src/lib/site.js`.
5. **Vérifier les résultats** : [test des résultats enrichis](https://search.google.com/test/rich-results) sur l'accueil, une catégorie et un produit.

## À faire ensuite, en continu

- **Avis Google** : demander un avis après chaque événement et y répondre.
- **Réalisations** : publier chaque événement avec photos réelles, lieu et matériel loué, en liant les fiches produits. La page reste en `noindex` tant qu'elle est vide.
- **Liens entrants** : annuaires du mariage et de l'événementiel (Mariages.net, Zankyou), lieux de réception et traiteurs partenaires, presse locale, chambre de commerce.
- **Identité identique partout** : nom, adresse et téléphone strictement identiques sur chaque annuaire.
- **Nouveaux guides** : un par mois, à partir des requêtes vues dans Search Console.
- **Suivi** : regarder chaque mois les requêtes et positions dans Search Console, et les Core Web Vitals une fois les données terrain disponibles.

## Chantier technique restant

Performance mobile (Lighthouse simulé autour de 70) : servir les images en tailles adaptées (`next/image`) et alléger le CSS global (Bootstrap + template, environ 400 Ko non compressés).
