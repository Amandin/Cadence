# Régression visuelle

Les scénarios Playwright couvrent les vues principales de Cadence aux largeurs de référence `320`, `390` et `1440` pixels, en modes clair et sombre.

## Commandes

- `npm run test:visual` compare l’interface aux images de référence.
- `npm run test:visual:update` régénère les images après une modification visuelle volontaire.

Les changements dans `tests/visual/__screenshots__` doivent être relus comme du code. Une référence ne doit être mise à jour qu’après avoir vérifié que la différence est souhaitée.

La campagne de test est injectée avant le premier rendu. Les captures n’utilisent donc ni les données locales du navigateur, ni un état dépendant de l’utilisateur.

La CI exécute la comparaison sur `windows-latest`, avec Chromium fourni par Playwright, afin de limiter les variations de rendu entre la génération locale et la vérification distante.

Le parcours complet à maintenir quand une surface, un dialogue ou un symbole est ajouté est documenté dans [`docs/interface-verification-path.md`](../../docs/interface-verification-path.md).
