# Chemin de vérification de l’interface Cadence

Date de création : 2026-07-09  
Version auditée : 0.15.2  
But : disposer d’un parcours stable pour ne pas oublier une surface, un symbole ou un comportement responsive lors des retouches UI.

## Règle de maintenance

Tout nouvel écran, nouvel onglet, nouveau dialogue, nouveau mode responsive ou nouveau symbole visible doit être ajouté à ce chemin avant d’être considéré comme terminé.

Quand une modification visuelle est volontaire, elle doit être relue à trois niveaux :

1. dans le navigateur local, pour vérifier l’usage réel ;
2. dans la page de référence visuelle, pour vérifier que le vocabulaire graphique est documenté ;
3. dans la matrice Playwright, pour vérifier que la surface est couverte par un snapshot ou un contrôle structurel.

## Commandes de contrôle

- `npm.cmd run build`
- `npm.cmd test`
- `npm.cmd run test:uiux`
- `npm.cmd run test:visual`
- `git diff --check`

Les snapshots visuels sont décrits dans `tests/visual/README.md`. Ils couvrent actuellement :

- Hub : référence clair/sombre, étroit sombre, large sombre ;
- Tirages / RandomSystem : référence clair/sombre, étroit sombre, large sombre ;
- Règles et tirages : référence clair/sombre ;
- Modèles : référence clair/sombre ;
- Scène : référence clair/sombre, étroit sombre, large sombre ;
- Modale de lancer de dés : référence clair/sombre ;
- Configuration RandomSystem : large sombre ;
- structure accessible : hub, random, règles, modèles, scène, modale, configuration.

La routine UI/UX complète s’exécute avec `npm.cmd run test:uiux`. Elle parcourt une matrice plus large de règles, d’indicateurs et de fenêtres, puis écrit :

- `test-results/uiux/uiux-report.md` : rapport lisible ;
- `test-results/uiux/uiux-report.json` : données brutes ;
- fonctions JavaScript appelées / non appelées dans les fichiers chargés via la couverture précise Chromium.

Une fonction non appelée dans ce rapport ne doit pas être supprimée automatiquement. Elle doit être classée dans une des deux catégories suivantes :

1. scénario manquant dans cette routine ;
2. code probablement mort.

## Parcours manuel recommandé

### 1. Hub / Scènes

- Ouvrir Cadence sur `http://localhost:5173/`.
- Vérifier l’en-tête : logo réel, nom de campagne, version, bascule thème.
- Parcourir l’onglet Scènes :
  - carte de scène ;
  - actions ouvrir / modifier / dupliquer / supprimer ;
  - lisibilité étroite et large.

### 2. Tirages / RandomSystem

- Ouvrir l’onglet Tirages.
- Vérifier :
  - en-tête RandomSystem ;
  - source active ;
  - résultat ;
  - historique ;
  - icônes de tirage, retour, cartes, dés spéciaux.

### 3. Règles et tirages

- Ouvrir l’onglet Règles.
- Vérifier :
  - titre et preset actif ;
  - édition / sauvegarde du preset ;
  - déroulement ;
  - temporalité ;
  - surprise ;
  - initiative ;
  - ordre d’initiative ;
  - actions multiples ;
  - portée des créneaux manuels : tous / actions multiples pour les Élites, y compris un Type personnalisé héritant d’Élite ;
  - déclaration ;
  - organisation ;
  - ordre des types avec flèches verticales.
  - ajout, héritage comportemental, renommage et suppression des Types personnalisés.

### 4. Modèles

- Ouvrir l’onglet Modèles.
- Vérifier :
  - catégories ;
  - édition inline ;
  - ajout ;
  - duplication ;
  - suppression ;
  - flèches monter / descendre.

### 5. Options / Campagnes

- Ouvrir l’onglet Options / Campagnes.
- Vérifier :
  - apparence ;
  - performance ;
  - statistiques ;
  - fichiers Cadence ;
  - accès à l’admin presets règles/tirages ;
  - accès à la référence visuelle ;
  - accès campagne de test ;
- réinitialisation.

Note technique : dans le code, cet onglet est identifié par la clé `campagnes`, même s’il porte les options et outils de campagne dans l’interface. Toute routine automatisée doit donc utiliser `campagnes`, pas `options`.

### 6. Admin presets règles/tirages

- Ouvrir “Admin presets règles/tirages” depuis les actions avancées des options.
- Vérifier en mode large :
  - tableau des presets de règles ;
  - tableau des ensembles de tirages ;
  - correspondances presets → kits ;
  - état catalogue / local ;
  - état chargé / actif des kits ;
  - panneau de détail pour chaque ligne sélectionnée ;
  - contenu complet des règles du preset ;
  - mode d’actions multiples et portée manuelle `all` / `elite-only` ;
  - ordre et définitions des Types de participants lorsqu’ils sont présents dans un preset ;
  - sources et tirages inclus dans chaque kit ;
  - édition JSON, réinitialisation et sauvegarde locale ;
  - création d’une copie locale depuis un élément catalogue ;
  - suppression d’un élément local ;
  - actions “Charger” et “Activer” pour les kits ;
  - absence de débordement global hors scroll interne des tableaux.

### 7. Référence visuelle

- Ouvrir “Référence CSS et symboles”.
- Vérifier :
  - familles de boutons ;
  - radios de portée « Tous les participants / Actions multiples pour les Élites » ;
  - badges ;
  - suivis ;
  - RandomSystem ;
  - couleurs ;
  - inventaire des symboles ;
  - correspondances anciens symboles → icônes Cadence ;
  - icônes non utilisées ;
  - candidats à retravailler.

### 8. Scène

- Ouvrir une scène.
- Vérifier :
  - en-tête de scène ;
  - bouton nouveau round ;
  - initiative ;
  - mode souple et actions supplémentaires ;
  - retour précédent / annulation ;
  - fiches ;
  - réserve ;
  - suivis ;
  - états ;
  - barre du bas ;
  - menu.

### 9. Dialogues principaux

- Depuis la scène et le hub, ouvrir au minimum :
  - lanceur de dés ;
  - édition de fiche ;
  - ajout / édition d’état ;
  - sélecteur d’impact d’état ;
  - compteur global ;
  - menu de scène ;
  - saisie d’initiative ;
  - saisie multi-actions pour une Élite et saisie limitée à un créneau pour un autre Type ;
  - ajustement et modification d’initiative ;
  - paiement d’un coût d’initiative ;
  - initiative dépassée et choix de rattrapage ;
  - entrée/rejointe en initiative ;
  - déclaration des actions et résolution ;
  - résolution d’une horloge déclenchée ;
  - information et confirmation de suppression ;
  - sauvegarde de modèle ;
  - export de campagne ;
  - reset Cadence.

- Depuis le hub, ouvrir également :
  - création, édition et suppression de scène ;
  - édition et sauvegarde d’un preset de règles ;
  - configuration de l’initiative textuelle ;
  - création et édition de chaque famille de modèle ;
  - import et export de campagne ou bibliothèque ;
  - assistant de profil de campagne.

Cette liste couvre toutes les fenêtres produit présentes dans `src/interface/dialogues`, ainsi que les overlays de fiche, modèles, scène et campagne. Les composants internes (champ d’initiative, phases, informations rapides, suivis, icônes et barre d’action) sont vérifiés dans leur écran hôte et ne constituent pas des surfaces autonomes à omettre ou ajouter séparément.

### Tutoriel de première scène

- Au résumé final de l’accueil, vérifier les deux choix : démarrage direct et petit tutoriel.
- Avec le tutoriel :
  - vérifier que le guide demande d’utiliser le vrai bouton Ajouter et ne déclenche aucune action lui-même ;
  - ouvrir la création et vérifier le choix fiche vierge / modèle et initiative / réserve ;
  - ouvrir la fiche et parcourir identité, Type et informations rapides ;
  - utiliser le vrai bouton Ajouter un indicateur puis configurer son modèle ou son type personnalisé ;
  - valider avec le vrai bouton de la fiche et confirmer le passage automatique à l’étape finale ;
  - vérifier les mises en avant des contrôles réels à chaque étape ;
  - recharger la page à chaque étape pour vérifier la reprise ;
  - tester Ignorer et Terminer ;
  - revenir au hub et confirmer que le tutoriel n’y apparaît pas.

### 10. Responsive

Vérifier au moins :

- étroit : 320 × 720 ;
- référence mobile : 390 × 844 ;
- large : 1440 × 900.

À chaque largeur, contrôler :

- absence de débordement horizontal ;
- taille des icônes ;
- lisibilité des boutons compacts ;
- accès aux actions importantes sans chasse excessive ;
- cohérence de la barre du bas.

## Audit du 2026-07-09

Vérifications effectuées :

- navigateur local sur `http://localhost:5173/` ;
- onglets Options, Scènes, Tirages, Règles, Modèles ;
- scène ouverte ;
- modale de lancer de dés ;
- contrôle large / étroit ponctuel ;
- recoupement statique des usages `uiGlyphs.*` et `uiSymbols.*` hors page de référence ;
- `npm.cmd run test:visual` : 27 tests passés.
- `npm.cmd run test:uiux` : routine complète générée et stabilisée, rapport produit dans `test-results/uiux/uiux-report.md`.

### Couverture UI/UX automatisée du 2026-07-09

La routine `test:uiux` parcourt maintenant 16 scénarios en deux largeurs, 390 × 844 et 1440 × 900. Elle couvre :

- première ouverture / onboarding, choix direct ou tutoriel et arrivée guidée sur la scène vierge ;
- hub et navigation d’onglets ;
- usage simple du RandomSystem ;
- configuration RandomSystem : tirages disponibles, types de tirage, dés/cartes/tables ;
- statistiques RandomSystem depuis Options ;
- règles en classique, souple avec déclaration, phases automatiques, phases cochées et coût d’initiative ;
- actions multiples manuelles globales et limitées aux comportements Élite ;
- modèles et ouverture d’un éditeur ;
- référence visuelle ;
- scène en classique, souple et phases ;
- menu de scène, lanceur de dés, indicateur de scène, état de scène ;
- action suivante / nouveau round.

Dernière passe connue :

- scénarios : 16 ;
- surfaces observées : 122 ;
- actions automatisées : 128 / 128 OK ;
- erreurs console / warnings React : 0 ;
- anomalies structurelles hautes : 0 (les alertes moyennes restantes correspondent à l’inventaire volontaire des glyphes texte) ;
- débordements horizontaux détectés : 0 ;
- contrôles visibles sans nom accessible : 0 ;
- fichiers source chargés : 176 ;
- fonctions nommées appelées : 727 ;
- fonctions nommées non appelées dans des fichiers chargés : 1211 ;
- fichiers source inventoriés mais non chargés : 0 après suppression du vieux conteneur autonome RandomSystem.

Le vieux conteneur autonome `src/random-system/RandomSystemPage.jsx` a été supprimé après validation. Le RandomSystem produit est maintenant couvert via son intégration dans `HubCampagne.jsx`.

Conclusion de méthode : un morceau de code non couvert par `test:uiux` ne doit pas être supprimé automatiquement. Il doit être classé dans une des trois catégories suivantes :

1. scénario manquant dans cette routine ;
2. code probablement mort ;
3. chemin rare/non automatisable à conserver explicitement.

### Anomalies détectées par la routine UI/UX complète

| Priorité | Zone | Observation | Statut / piste |
| --- | --- | --- | --- |
| Haute | Actions multiples | Warning React reproductible initialement : clé dupliquée quand plusieurs créneaux/actions existaient pour le même participant. | Corrigé : l’identité d’affichage utilise désormais l’id de créneau d’action. Test de domaine ajouté. |
| Haute | Accessibilité | La routine remontait des boutons de suppression et des champs de seuil sans nom accessible. | Corrigé : seuils d’indicateur, infos rapides et exemples de la référence visuelle ont reçu des libellés accessibles. |
| Moyenne | Code mort probable | `src/random-system/RandomSystemPage.jsx` n’était plus importé par l’application et restait le seul fichier non chargé par le parcours. | Supprimé après validation. |
| Moyenne | Symboles anciens | Les glyphes typographiques `+`, `-`, `☀☾`, infini, pause, boucle et quelques symboles cartes restent visibles sur certaines surfaces. | Voir la table “Anomalies et retouches relevées” : ils doivent être classés entre langage typographique assumé et icônes à remplacer. |

### Anomalies et retouches relevées

| Priorité | Zone | Observation | Piste |
| --- | --- | --- | --- |
| Haute | Référence visuelle | La page inventorie les symboles centralisés, mais ne distingue pas assez clairement les symboles encore utilisés en production de ceux remplacés partout. | Ajouter une section “encore visibles dans l’UI” alimentée par le chemin ci-dessus. |
| Haute | Suivis / horloges / compteurs | Plusieurs contrôles utilisent encore `uiSymbols.add` et `uiSymbols.subtract` visibles comme `+` / `-` : `Suivi.jsx`, `CompteurGlobal.jsx`, actions de créneaux dans `FenetreEditionFiche.jsx`, ajustement de temps dans `MenuPrincipal.jsx`. | Décider si `ajouter.svg` / `supprimer.svg` conviennent pour incrémenter/décrémenter, ou créer une paire dédiée plus claire. |
| Haute | Scène | Les boutons “+ état” restent textuels. C’est lisible, mais moins cohérent avec la nouvelle famille d’icônes. | Utiliser `IconeCadence name="add"` en complément du libellé ou créer un bouton hybride standard. |
| Moyenne | Thème | La bascule thème utilise encore `uiGlyphs.themeLight` / `uiGlyphs.themeDark` (`☀☾`) dans `MenuOptions.jsx`, `FirstRunOnboarding.jsx` et la référence visuelle. | Créer ou intégrer deux icônes Cadence thème clair/sombre, ou documenter explicitement ces glyphes comme volontairement conservés. |
| Moyenne | Scène / horloge bloquante | `uiGlyphs.pause` reste utilisé dans `EnteteScene.jsx` quand une horloge bloque l’action suivante. | Prévoir une icône pause Cadence, ou un état visuel bloquant plus marqué. |
| Moyenne | Édition de fiche | `uiGlyphs.duplicate` reste rendu dans `FenetreEditionFiche.jsx` pour dupliquer un suivi/template interne, alors que l’icône `duplicate` existe. | Remplacer ce rendu par `IconeCadence name="duplicate"`. |
| Moyenne | États | `uiGlyphs.infinity`, `uiGlyphs.loop` et `uiGlyphs.middleDot` restent visibles dans les états et champs de durée. | Décider s’ils font partie du langage typographique accepté ou s’ils doivent recevoir des pictos dédiés. |
| Moyenne | RandomSystem cartes | Les symboles de cartes, joker et tarot (`spades`, `hearts`, `diamonds`, `clubs`, `joker`, `tarotTrump`) restent des glyphes métier dans `cardSourceDefaults.js`. | Les documenter comme symboles métier conservés, ou prévoir une famille cartes plus complète. |
| Moyenne | Options mobile | À 390 px, le bouton “Référence CSS et symboles” est sous la ligne de flottaison dans Options. Ce n’est pas bloquant, mais il est peu découvrable. | Ajouter un accès plus haut, ou regrouper les outils de diagnostic dans une section visuellement plus marquée. |
| Basse | Hub / Scènes | L’onglet Scènes ouvert dans le navigateur local affichait peu d’icônes sur la carte principale ; les actions restent majoritairement textuelles. | Pas forcément à corriger : garder les actions textuelles peut être meilleur pour la clarté. À confirmer par intention UI. |
| Basse | Référence visuelle | L’accès à la page de référence a été instable à cibler via automation texte dans le navigateur intégré, malgré un bouton visible. | Ajouter un attribut de test stable si cette page doit devenir un passage automatisé direct. |

### Éléments confirmés comme sains

- Pas de débordement horizontal détecté sur les surfaces observées à 390 px.
- Les snapshots officiels couvrent déjà les surfaces principales en clair/sombre et plusieurs largeurs.
- Les icônes récentes sont visibles dans Règles, Modèles, Tirages et Scène : édition, sauvegarde, flèches verticales, retour, dés, menu, action supplémentaire, nouveau round.
- Le remplacement `uiSymbols.confirm` → `valid` est bien noté dans la correspondance de la référence visuelle.
- La page de référence visuelle marque désormais `uiSymbols.moveUp/moveDown` → `nextStrong`, compte `valid` et `nextStrong` comme icônes utilisées, et indique explicitement qu’aucune icône SVG Cadence importée ne reste inutilisée.
- `--ui-surface` et `--ui-surface-soft` ont été réécartés en clair/sombre pour éviter deux surfaces visuellement jumelles ; le résumé d’audit de la référence utilise aussi des textes plus contrastés en mode sombre.
- La durée restante des états est documentée comme remplacée par `IconeCadence.timer` / le nouveau sablier SVG ; le symbole statistiques reste le seul usage partiel du sablier en attendant une icône dédiée.

## À ajouter au chemin dès qu’une nouvelle surface apparaît

Pour chaque nouvel ajout, noter :

- nom de la surface ;
- point d’entrée pour l’ouvrir ;
- largeur(s) à vérifier ;
- thème(s) à vérifier ;
- modale(s) liées ;
- symboles nouveaux ou anciens utilisés ;
- snapshot existant ou à créer ;
- anomalies connues ou dette assumée.
