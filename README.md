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
