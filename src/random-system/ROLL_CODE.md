# Langage expert des tirages

## Paramètres et sources

```text
number pool=5;
source de={d6;d8;d10};
[pool]d@de
```

Une référence numérique s’écrit `[nom]`. `[nom=3]` crée un paramètre implicite ayant `3` pour valeur par défaut.

## Dés et calculs

```text
4d6
max([pool]-[sang],0)d10s>6+[sang]d10s>6
arrondi.sup([pool]/2)d8
si([niveau]>=3,2,1)d6
```

Opérateurs : `+`, `-`, `*`, `/`, `%`. Fonctions : `min`, `max`, `abs`, `signe`, `puissance`, `arrondi.inf`, `arrondi.sup` et `si(condition, valeur, sinon)`.

Les quantités de dés, limites et nombres de résultats conservés doivent être entiers. Un calcul décimal doit employer explicitement `arrondi.inf` ou `arrondi.sup`.

## Modificateurs d’un jet

```text
4d10s>=6
4d10>=6
4d10s(>=6 et non =10)
4d6kh3
4d6kl2
d6r=1
d6rr<=2
d6!>=5n3c=1
```

`s` compte les succès. Une comparaison placée directement après le dé est son raccourci. `kh`, `kl`, `r`, `rr`, `!`, `n` et `c` règlent respectivement la conservation, les relances, les explosions, leur limite et l’écrasement d’une chaîne.

Le suffixe `?` transforme l’opération en décision après le tirage : `!?`, `r?=1` ou `kh1?`.

## Formules, choix et répétitions

```text
test=2d20kh1+[bonus];
serie=[nombre]@test
```

Les appels répétés restent indépendants : les conservations et choix sont appliqués séparément à chaque appel. `++` rend la définition entière répétable avec des paramètres indépendants.

```text
choice(normal) {
  désavantage: 2d20kl1;
  normal: d20;
  avantage: 2d20kh1
}
```

`choice` reste exclusif. Pour proposer plusieurs interrupteurs indépendants dans le questionnaire, ajoutez `option(...)` juste après l’opération concernée :

```text
1d6! option(explosion, Explosion, oui) r=1 option(relance, Relance)
```

Chaque `option` crée un interrupteur. Son premier mot est son identifiant ; les mots suivants forment son libellé. Le dernier mot facultatif `oui` ou `non` fixe la valeur initiale (`non` par défaut). La même option peut être réutilisée sur plusieurs opérations.

## Cartes

```text
source paquet=mon-paquet;
2c@paquet
4c@paquet(remise)
```

`c@` pioche dans l’état réel du paquet et alimente sa défausse. `(remise)` effectue des tirages indépendants sans modifier la pioche.

## Traitements

Les traitements suivent l’expression, séparés par des points-virgules.

```text
4d10s>=6;
valeur(si=1,devient=0,sur=1);
marque(echec,si=1,sur=1)
```

Formes prises en charge :

- `valeur(si=1,devient=0,sur=1)` remplace la valeur calculée des faces concernées ;
- `marque(echec,si=1,sur=1)` ajoute un marqueur ;
- `marqueurs(4d6,echec)` compte un marqueur dans une expression ;
- `bonus.occurrence(si=10,tous=2,ajouter=2,sur=1)` ajoute un bonus au résultat ;
- `bonus.occurrence(...,sur=1,compteur=2)` vise un compteur de succès précis ;
- `table(@source)` remplace le résultat principal par l’entrée correspondante d’une table.

`sur=1` vise le premier groupe actif ; `sur={1;3}` en vise plusieurs. Sans `sur`, le traitement porte sur tous les groupes.
