# Architecture de développement — Cadence

Ce document sert de carte rapide pour retrouver où modifier quoi.

## Principe général

Cadence est organisée en trois couches principales :

```txt
src/
  interface/   composants React visibles ou fenêtres
  hooks/       orchestration entre interface, stockage et domaine
  actions/     mutations de campagne/scène
  domain/      petites règles métier isolées
```

`App.jsx` doit rester un assembleur : il connecte les hooks, la scène principale et les fenêtres superposées, mais il ne doit pas redevenir un gros composant contenant toute l’interface.

## Interface

```txt
src/interface/
  app/         couches globales de l’application
  commun/      composants génériques réutilisables
  dialogues/   fenêtres ponctuelles
  fiches/      fiches et fichettes de personnages
  icones/      SVG et styles d’icônes
  menu/        menu principal
  scene/       rendu de la scène active
  suivis/      compteurs, horloges, barres, cases
```

### À garder en tête

- Les composants d’interface utilisent des noms français.
- Les anciennes APIs anglaises `Sheet`, `Status`, `Tracker`, etc. ont été supprimées.
- Les styles CSS existants n’ont pas tous été renommés : beaucoup de classes restent en anglais pour éviter de gros changements visuels inutiles.

## Fenêtres superposées

`src/interface/app/FenetresSuperposees.jsx` regroupe toutes les fenêtres modales ou feuilles qui flottent au-dessus de la scène : fiche détaillée, édition, ajout d’état, menu, compteur global, etc.

Cela évite de surcharger `App.jsx`.

## Hooks

### `useCampaign`

Gère l’état global de campagne : scènes, thème, historique de restauration, round courant, scène active.

### `useCharacterInteractions`

Centralise les actions qui doivent marcher à la fois pour :

- les participants en initiative ;
- les fiches hors initiative.

### `useTemplates`

Gère la sauvegarde locale des templates de personnages.

## Points sensibles

### Compteur global

Le rendu du compteur global est fragile visuellement, notamment :

- l’anneau principal ;
- l’anneau de débordement ;
- le badge `×N` ;
- l’état de cycle exact `10/10`, `20/10`, etc.

Éviter de toucher à son CSS sans test ciblé.

### Service worker / PWA

Le service worker a déjà causé des pages blanches à cause d’anciens assets hashés. Ne pas réactiver de cache/PWA sans stratégie claire.

### Saisie numérique

Plusieurs champs numériques doivent rester éditables sur mobile. Éviter les corrections immédiates trop agressives pendant la frappe : l’utilisateur doit pouvoir vider temporairement un champ.

## Checklist rapide après refactor

Tester au minimum :

- navigation précédent/suivant ;
- passage de round ;
- horloge bloquante ;
- compteur global ;
- ajout/édition/suppression de fiche ;
- états temporaires et permanents ;
- templates ;
- menu ;
- affichage mobile.
