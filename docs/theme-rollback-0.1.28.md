# Rollback thème — état 0.1.28

Ce fichier garde une trace du thème actuel avant la proposition globale de recoloration.

## État de référence

Commit de référence :

```txt
7affbe3706e0176818251acd20cd9ee489c1bd54
```

Version visible :

```txt
0.1.28
```

Ce commit contient le style avec :

- l’ancienne base globale gris/bleu ;
- la barre basse déjà recolorée avec la palette des logos ;
- le contraste renforcé en mode sombre.

## Pour revenir en arrière

Option simple : revenir au commit ci-dessus.

Option ciblée : restaurer seulement les fichiers de style depuis ce commit :

```bash
git checkout 7affbe3706e0176818251acd20cd9ee489c1bd54 -- src/styles.css src/overrides.css src/constants.js
```

Puis commiter le rollback.
