# Cadence

Cadence est une webapp/PWA React pour gérer des scènes de JDR : initiative, rounds, suivis, horloges, états, scènes multiples, sauvegarde locale et export/import de campagne.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir l’adresse indiquée par Vite, souvent `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

Le dossier produit est `dist/`.

## Tests automatisés

Les tests unitaires utilisent Vitest.

```bash
npm test
```

Ils couvrent notamment :

- la logique d’initiative classique ;
- les phases SR5-like ;
- les égalités et groupes simultanés ;
- le tri de la réserve ;
- les trackers, cases, horloges et états temporaires ;
- le compteur global de scène.

Avant une modification importante, lancer :

```bash
npm run verify
```

Ce script exécute :

```bash
npm test
npm run build
```

Une GitHub Action `Quality` lance automatiquement les tests puis le build sur chaque push ou pull request vers `main`.

## Cloudflare Pages

Réglages recommandés :

- Build command : `npm run build:cloudflare`
- Build output directory : `dist`
- Root directory : vide si le projet est à la racine du dépôt

Le script `build:cloudflare` lance d’abord les tests, puis le build. Si les tests échouent, Cloudflare arrête le déploiement.

## Sauvegarde

L’application sauvegarde automatiquement en `localStorage`. Le menu permet aussi l’export/import JSON de campagne.

## Organisation actuelle

```txt
src/
  App.jsx
  constants.js
  logic.js
  refinements.css
  actions/
  components/
  domain/
  hooks/
  interface/
  utils/
```
