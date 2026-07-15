# Code de jet Random System

Le code de jet est la notation experte de Cadence. Il ne crée pas de source : il compose les sources déjà présentes dans le Random System.

## Exemple complet

```text
number pool = 5;
number bonus = 2;
source damage = d6;

1d10! + [pool]d@damage - 3d4k2 + [bonus]
```

Les variables n'ont que deux types :

- `number` contient un nombre ;
- `source` référence une source existante.

Chaque déclaration devient un paramètre modifiable au moment du lancer. Une variable numérique s’utilise entre crochets (`[pool]`, `[bonus]`) et une source variable après `@` (`d@damage`). Une source standard existante s’écrit `d6`, `d20`, etc.

La déclaration préalable est facultative pour une variable numérique utilisée entre crochets :

- `[nb]` crée automatiquement un champ numérique obligatoire, sans valeur initiale ;
- `[seuil=1]` crée automatiquement le champ `seuil` avec `1` comme valeur par défaut ;
- les utilisations suivantes de `[nb]` ou `[seuil]` réemploient le même champ.

Une source peut être limitée à une présélection. Le premier élément est la valeur par défaut :

```text
source damage = {d6; d8; d10};
```

L’utilisateur ne pourra alors choisir que ces trois sources. Avec `source damage = d6;`, d6 reste la valeur par défaut mais toutes les sources de tirage restent proposées.

Une présélection locale peut être placée directement après `d` : `d{d4;d6;d8}`. Elle crée un sélecteur « Dé » dont le premier élément est la valeur initiale. Plusieurs présélections locales strictement identiques dans une même formule partagent le même sélecteur.

Un choix entre plusieurs formules se décrit avec `choice(défaut) { ... }`. Seule la branche choisie est lancée :

```text
number mod = 0;
choice(normal) {
  désavantage: 2d20kl1 + [mod];
  normal:       1d20    + [mod];
  avantage:     2d20kh1 + [mod]
}
```

Le nom entre parenthèses désigne explicitement la branche sélectionnée par défaut.

Pour alléger le cas courant, les parenthèses et le nom de la branche par défaut peuvent être omis ensemble. L’unique branche sans nom devient alors la valeur par défaut et apparaît comme « Par défaut » dans l’interface :

```text
choice {
  désavantage: 2d20kl1 + [mod];
               1d20    + [mod];
  avantage:     2d20kh1 + [mod]
}
```

Une branche implicite peut aussi être `none`, par exemple `choice { bonus: 1d6; none }`. La forme courte exige exactement une branche sans nom ; cela évite qu’un choix par défaut soit ambigu. Avec la forme explicite `choice(normal)`, toutes les branches restent nommées.

Les choix sont des expressions et peuvent donc être composés. Exemple Cosmère RPG :

```text
number mod = 0;
source intrigue = d6;

choice(normal) {
  désavantage: 2d20kl1 + [mod];
  normal:       1d20    + [mod];
  avantage:     2d20kh1 + [mod]
} + choice(non) {
  monter les enjeux: 1d@intrigue;
  non: none
}
```

Avec les choix par défaut, seul le d20 normal est lancé. Si « avantage » et « monter les enjeux » sont sélectionnés, le résultat vaut le meilleur des deux d20, plus `[mod]`, plus le tirage d’intrigue.

Le littéral `none` signifie « ne rien faire ». Il ne lance aucune source et disparaît lors d’une composition arithmétique, contrairement au nombre `0` qui reste une valeur numérique explicite.

## Jets récursifs

Le suffixe final `++` rend une formule répétable dans le lanceur :

```text
number mod = 0;
source die = {d4; d6; d8; d10; d12};

1d@die + [mod]++
```

L’utilisateur commence avec un jet, puis peut en ajouter ou en retirer. Chaque jet ajouté est une nouvelle exécution de la formule : il possède ses propres variables numériques, ses propres sources et ses propres choix. Tous les résultats sont finalement additionnés. Cela permet notamment de composer les dégâts d’une arme, d’un critique et de plusieurs types de dégâts sans dupliquer la formule dans le code.

`++` est uniquement accepté comme suffixe de la formule finale. Il ne modifie donc pas le sens arithmétique de `+` à l’intérieur d’une expression. Le lanceur accepte au maximum vingt occurrences d’une même formule.

## Tirages nommés

Une formule peut être nommée puis réutilisée avec `@nom`. La dernière formule nommée constitue le résultat exposé :

```text
number mod = 0;
source intrigue = d6;

d20a = choice(normal) {
  désavantage: 2d20kl1 + [mod];
  normal:       1d20    + [mod];
  avantage:     2d20kh1 + [mod]
};

cosmere = @d20a + choice(non) {
  monter les enjeux: d@intrigue;
  non: none
}
```

`2@d20a` exécute deux fois la formule avec des tirages indépendants puis additionne ses résultats. Les choix utilisateur de la formule sont partagés entre les appels.

La résolution de `@nom` est volontairement souple : une formule nommée est prioritaire ; à défaut, une source de ce nom est tirée. `d@nom` force toujours l’utilisation de la source, même lorsqu’une formule porte le même nom.

## Grammaire pratique

| Code | Sens |
| --- | --- |
| `d20` ou `1d20` | un tirage de la source standard d20 |
| `5d6` | cinq d6, additionnés |
| `[pool]d@damage` | `[pool]` tirages de la source `damage` |
| `[nb]` | variable numérique demandée à l’utilisateur, sans déclaration préalable |
| `[seuil=1]` | variable demandée avec `1` comme valeur par défaut |
| `[nb]d{d4;d6;d8}` | `[nb]` tirages d’une source choisie dans la présélection locale |
| `d10!` | jet explosif sur le maximum |
| `d10!>=8` | jet explosif sur tout résultat supérieur ou égal à 8 |
| `d10!>=[explosion=8]` | même seuil d’explosion, modifiable au lancer et initialisé à 8 |
| `d10!?` | explosion proposée comme option au lancer |
| `d10!c=1` | si un dé d’explosion donne 1, la chaîne entière vaut 1 |
| `d10!?c=1` | même effondrement, avec explosion proposée au lancer |
| `4d6k3` ou `4d6kh3` | garder les trois plus hauts |
| `4d6kl2` | garder les deux plus bas |
| `4d6r=1` | relancer une fois les résultats égaux à 1 |
| `4d6rr=1` | relancer les 1 jusqu’à obtenir une autre valeur |
| `4d6r?=1` / `4d6rr?=1` | relance simple ou récursive proposée au lancer |
| `8d6s>=5` | compter les résultats supérieurs ou égaux à 5 |
| `8d6s>=5s=1` | produire deux compteurs ; le premier est la valeur du terme |
| `+ - * / %` | calculs arithmétiques usuels |
| `( ... )` | priorité explicite |
| `(A; B)kh1` | lancer deux candidats et garder le plus haut |
| `(A; B)kl1` | lancer deux candidats et garder le plus bas |
| `(A; B; C)kh2` | garder puis additionner les deux meilleurs candidats |
| `expression++` | permettre d’ajouter des occurrences indépendantes de la formule et sommer leurs résultats |

`!` est exclusivement le modificateur d’explosion et `*` est exclusivement la multiplication. Les espaces ne changent jamais leur sens : `1d6*2` et `1d6 * 2` sont équivalents.

Les comparaisons acceptées après `!`, `r`, `rr` et `s` sont `=`, `==`, `!=`, `<`, `<=`, `>` et `>=`. Sans comparaison, `!` utilise le maximum de la source. Le seuil et le nombre conservé peuvent être des variables numériques : `d10!>=[explosion=8]`, `6d6k[keep]` ou `8d6s>=[target]`.

## Grammaire formelle simplifiée

```ebnf
program     = declaration*, (expression | namedRoll, { ";", namedRoll }), ["++"], [";"] ;
namedRoll   = identifier, "=", expression, [";"] ;
rollCall    = [integer], "@", identifier ;
declaration = ("number", identifier, "=", number
            |  "source", identifier, "=", source), ";" ;
expression  = product, { ("+" | "-"), product } ;
product     = unary, { ("*" | "/" | "%"), unary } ;
unary       = ["+" | "-"], primary ;
primary     = number | "[", numberVariable, ["=", number], "]" | roll | selection
            | "(", expression, ")" ;
selection   = "(", expression, { ";", expression }, ")",
              ("kh" | "kl" | "k"), numericValue ;
userChoice  = "choice", [ "(", identifier, ")" ], "{",
              choiceBranch, { ";", choiceBranch }, "}" ;
choiceBranch = [ label, ":" ], expression ;
roll        = [count], ("d", sides | "d@", sourceVariable
            | "d", "{", source, { ";", source }, "}"), modifier* ;
modifier    = "!", ["?"], [comparison, numericValue],
              ["c", comparison, numericValue]
            | ("k" | "kh" | "kl"), numericValue
            | ("r" | "rr"), ["?"], comparison, numericValue
            | "s", comparison, numericValue ;
```

Le typage est strict : une variable `source` ne peut pas participer à un calcul et une variable `number` ne peut pas être placée après `d@`. Une source absente est signalée à l'enregistrement, avant tout lancer. Ainsi `d16` fonctionne seulement si une source uniforme d16 existe dans le Random System ; le langage ne la crée pas implicitement.
