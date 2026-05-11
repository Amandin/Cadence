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

## Tests

```bash
npm test
```

## Cloudflare Pages

Réglages recommandés :

- Build command : `npm run build`
- Build output directory : `dist`
- Root directory : vide si le projet est à la racine du dépôt

## Sauvegarde

L’application sauvegarde automatiquement en `localStorage`. Le menu permet aussi l’export/import JSON de campagne.

## Organisation

```txt
src/
  App.jsx
  constants.js
  data/defaultCampaign.js
  components/
  utils/
```
