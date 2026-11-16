# Prince-Abraham

## Lancer en local

```bash
ADMIN_PASSWORD="choisir-un-mot-de-passe" npm start
```

Le site est disponible sur `http://localhost:3000` et l'administration sur `/admin.html`.

## Déployer sur Vercel

1. Importer ce dépôt dans Vercel.
2. Ajouter une intégration Neon Postgres au projet Vercel.
3. Ajouter la variable d'environnement `ADMIN_PASSWORD` avec le mot de passe administrateur choisi.
4. Déployer sans commande de build particulière.

La fonction `api/[...path].js` crée automatiquement les tables et les contenus initiaux au premier appel. Les pages publiques lisent les textes depuis `/api/public/pages`, tandis que le dashboard utilise les routes protégées.

Ne jamais committer un fichier `.env` ou un mot de passe dans le dépôt.

## Direction visuelle et vérification

Le site public conserve ses pages HTML, ses contenus administrables et ses interactions existantes. La direction « atelier éditorial » associe papier chaud, encre, bordeaux et typographie Fraunces/Archivo. L'accueil met en avant une œuvre existante ; les images de galerie et leurs textes alternatifs restent ceux du portfolio. La grille et les cadrages s'adaptent aux écrans étroits, et les règles de mouvement réduit existantes sont conservées. Les styles de l'administration restent séparés.

L'introduction bloquante a été retirée pour rendre le contenu immédiatement accessible. Le chargement automatique de Google Analytics sur l'accueil a également été retiré : aucune collecte de mesure d'audience non essentielle ne doit démarrer sans mécanisme de consentement approprié. Pour réactiver la mesure, mettre en place et vérifier au préalable un dispositif de consentement adapté.

La vérification complète du rendu sur appareils réels, des lecteurs d'écran et des performances Core Web Vitals reste à effectuer dans un environnement de test navigateur ; aucune conformité WCAG ou valeur Lighthouse n'est présumée.
