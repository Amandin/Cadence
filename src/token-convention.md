# Convention des tokens CSS Cadence

Cette note fixe la hiérarchie minimale des tokens CSS existants pour préparer les futures apparences sans changer le rendu actuel.

## Familles de tokens

- `--theme-*` : palette brute source. Ces variables portent les couleurs de base et servent de matière première.
- `--skin-*` : couche sémantique de thème ou d'ambiance. Cette couche traduit la palette brute en intentions visuelles stables.
- `--ui-*` : contrat public consommé par l'interface. Les composants doivent viser cette famille en priorité.
- variables locales de composants : réservées aux besoins isolés d'un composant, par exemple `--threshold-a`, `--threshold-b`, `--clock-progress`, `--overflow-progress`, `--marker-color`.
- `--cadence-brand-*` : alias historiques de marque. Ils restent supportés à court terme, mais doivent être réduits progressivement.

## Règles pratiques

- Les nouveaux styles UI doivent viser `--ui-*` en premier.
- Les couleurs métier liées aux suivis, seuils, horloges ou personnages ne doivent pas être converties aveuglément vers un token global.
- Un fallback local est acceptable seulement si le composant a un besoin réellement isolé.
- Aucun nouveau préfixe de token ne doit apparaître sans justification claire.
- Les remplacements futurs doivent préférer la couche sémantique la plus haute possible sans casser les cas métier existants.

## Zones à surveiller

Les fichiers suivants concentrent les risques de mélange entre palette brute, sémantique et usages métier :

- `src/theme-system.css`
- `src/theme-cadence.css`
- `src/styles.css`
- `src/refinements.css`
- `src/trackers-clarity.css`
- `src/overrides.css`

## Notes de prudence

- `--cadence-brand-*` sert d'interface historique et ne doit pas devenir la destination finale des nouveaux usages.
- Les variables locales de composants restent légitimes quand elles pilotent un état purement interne.
- Cette convention n'introduit ni nouveau thème ni sélecteur d'apparence.
- `data-theme="default"` est l'ancrage technique prévu sur la racine applicative pour cibler plus tard des apparences sans changer le thème courant.
