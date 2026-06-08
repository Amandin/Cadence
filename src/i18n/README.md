# Textes d'interface

Les textes migrés sont rangés dans `translations.csv`.

- `key` contient l'identifiant stable utilisé dans le code.
- `fr` contient le texte français actuel.
- Les prochaines langues peuvent être ajoutées en créant une nouvelle colonne.

Pour un nouveau texte d'interface, ajouter une clé dans le CSV puis l'appeler avec `t('cle')`.
Pour un texte variable, utiliser une valeur comme `Ajouter un état · {name}` puis `t('cle', { name })`.

Le code contient encore des textes historiques non migrés. La migration doit se faire progressivement, par zone d'interface, pour éviter de mélanger traduction et changements fonctionnels.
