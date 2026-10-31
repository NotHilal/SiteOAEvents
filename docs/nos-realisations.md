# Nos réalisations

Dans **Espace OA → Nos réalisations** (menu principal), cliquer sur **Ajouter une réalisation**.

- Renseigner le titre, l’adresse, la courte description et le récit.
- Choisir une photo de couverture puis ajouter les photos et vidéos complémentaires.
- Ajouter des légendes et, pour une vidéo parlée, sa transcription dans le récit.
- **Enregistrer et publier** rend la fiche visible immédiatement dans la liste, sur l’accueil (les six dernières réalisations) et dans le sitemap.
- **Modifier** permet de corriger tous les champs. Changer l’adresse rend l’ancien lien inaccessible.
- **Supprimer** retire la fiche du site après confirmation.

Formats : JPG, PNG, WebP, AVIF, GIF, MP4 et WebM. Limite de 10 Mo par fichier et de 40 médias complémentaires par fiche. Les vidéos utilisent le lecteur natif, sans lecture automatique.

Les anciennes routes `/galerie` et `/nos-experiences` redirigent définitivement vers `/nos-realisations`. Les données `images_galerie` et les anciens emplacements `images_home.realisation_*` sont conservés, sans être convertis en réalisations réelles. La nouvelle rubrique reste vide jusqu’à l’ajout de contenus confirmés.

Les fiches sont stockées dans `site_content`, sous des clés `realisation:<uuid>`. Les médias utilisent la table `files` et `/uploads/`, comme les autres images du CMS. Retirer une fiche ou un média de sa fiche ne détruit pas le fichier, qui peut être partagé par d’autres contenus.

## Vérification

```sh
npm run build
node scripts/test-realisations.mjs
```

Le script lance un serveur de production sur un port libre avec une base SQLite temporaire et un secret de test généré pour cette exécution. Il vérifie les opérations CMS, les permissions, les adresses uniques (y compris deux créations simultanées), les routes, le rendu serveur, le sitemap et le service des vidéos. Il arrête son serveur et retire sa base temporaire à la fin.
