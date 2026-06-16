# Textes d'interface

Les textes migrés sont rangés dans `translations.csv`.

- `key` contient l'identifiant stable utilisé dans le code.
- `fr` contient le texte français actuel.
- Les prochaines langues peuvent être ajoutées en créant une nouvelle colonne.

Convention retenue pour Cadence :

- `common.*` pour les actions partagées et les libellés génériques.
- `app.*` pour les textes très courts du socle applicatif, quand aucun autre namespace n'est plus précis.
- `errors.*` et `onboarding.*` pour les petites zones applicatives fermées qui ne sont ni du métier ni un dialogue générique.
- `characterAdd.*` pour la petite fenêtre d'ajout de personnage.
- `export.*` pour la petite fenêtre d'export de campagne.
- `initiativeAdjust.*` pour la petite fenêtre d'ajustement d'initiative.
- `declarations.*` pour la petite fenêtre de déclaration des actions.
- `hub.*` pour l'écran Hub et ses sous-zones stables, avec des sous-groupes comme `hub.tabs.*`, `hub.scenes.*` et `hub.campaigns.*`.
- `templates.*` pour les sous-écrans de modèles, avec des sous-groupes comme `templates.hub.*`, `templates.tabs.*`, `templates.personnages.*`, `templates.sections.*` et `templates.editor.*`.
- `sheet.*` pour la fenêtre d'édition de fiche et ses sous-zones stables, avec des sous-groupes autorisés comme `sheet.trackers.*`, `sheet.thresholds.*`, `sheet.actions.*`, `sheet.clock.*` ou `sheet.boxes.*` quand cela évite de mélanger des clés sans ouvrir un nouveau namespace top-level.
- `rules.*` pour l'onglet des règles, avec `rules.compat.*` et `rules.summary.*` pour les sous-zones déjà stabilisées.
- Un namespace métier par zone déjà stabilisée quand c'est plus lisible que `dialogs.*`, par exemple `status.*`, `initiativeCost.*`, `reserve.*`, `timerDone.*` et `fileChoice.*`.
- `rules.compat.*` pour les messages de compatibilité et `rules.summary.*` pour les résumés.
- Quand une future passe migre une nouvelle zone, elle doit garder le même groupe de clés sur toute la zone avant d'en ouvrir une autre.

Pour un nouveau texte d'interface, ajouter une clé dans le CSV puis l'appeler avec `t('cle')`.
Pour un texte variable, utiliser une valeur comme `Ajouter un état · {name}` puis `t('cle', { name })`.

Le code contient encore des textes historiques non migrés. La migration doit se faire progressivement, par zone d'interface, pour éviter de mélanger traduction et changements fonctionnels.
