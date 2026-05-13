# Propositions de thème global Cadence

Objectif : rendre l’ensemble de l’interface cohérent avec les logos, pas seulement la barre basse.

## Palette source

### Logo clair

```txt
#311236  violet sombre
#51165a  violet principal
#c75e19  orange accent
#c85919  orange profond
#e9d8c9  fond clair utilisé autour du logo
```

### Logo sombre

```txt
#24130f  brun sombre
#f0ddb6  ivoire
#d2a456  or
#dddbd9  gris chaud
```

## Proposition A — Parchemin mystique

C’est la proposition actuellement codée dans `src/theme-proposal-logo.css`.

### Idée

- Mode clair : parchemin chaud, violet profond pour les actions principales, orange pour les moments importants.
- Mode sombre : brun nocturne, ivoire/or, très peu de bleu/gris froid.

### Avantages

- Très cohérent avec les logos.
- Ambiance plus marquée et moins “interface générique”.
- Bonne base pour un style JDR/mystique.

### Risques

- L’app devient plus typée visuellement.
- Certains marqueurs fonctionnels historiques changent de couleur : horloges, points, boutons sélectionnés.

## Proposition B — Sobre chaud

Non codée pour l’instant.

### Idée

- Garder une structure proche du style actuel.
- Remplacer seulement les bleus/gris froids par des neutres chauds.
- Violet/orange seulement pour les accents.

### Avantages

- Moins risqué.
- Plus proche de l’interface validée jusqu’ici.
- Probablement meilleur si l’objectif est utilitaire avant tout.

### Risques

- Moins identifiable visuellement.
- Le lien avec le logo sera plus discret.

## Proposition C — Nuit rituelle

Non codée pour l’instant.

### Idée

- Mode sombre très dominant, presque noir-brun.
- Ivoire/or pour les textes et contours.
- Rouge-orange réservé aux alertes et nouveaux rounds.

### Avantages

- Très élégant en partie de JDR sombre.
- Forte identité.

### Risques

- Peut être trop sombre sur mobile.
- Mode clair plus difficile à rendre aussi convaincant.

## Recommandation actuelle

Tester la proposition A sur mobile et en partie simulée.

Si elle semble trop chargée, repartir vers une proposition B : structure actuelle conservée, palette réchauffée.
