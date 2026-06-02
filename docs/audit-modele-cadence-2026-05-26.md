# Audit Cadence - modèle initiative/JDR

Date : 2026-05-26  
Racine auditee : `E:\Cadence\Cadence-Git`  
Version constatee : `0.3.3`  
Verification : `npm.cmd test` OK, 91 tests ; `npm.cmd run build` OK.

## 1. Synthese courte

Cadence est deja assez proche de l'esprit vise : l'application reste legere, les personnages portent bien leurs suivis/etats, la reserve existe, le round est explicite dans les libelles principaux, les phases cochees et automatiques sont distinguees, et plusieurs comportements sensibles sont deja couverts par tests.

Le risque principal n'est pas un manque de fonctionnalites, mais un melange progressif de notions : activation, round, phase, cout d'action, actions multiples et mode souple sont encore relies par des raccourcis communs (`activeId`, `actionSlots`, `_activationAutomationsDone`, `promptInitiativeOnNext`). Ces raccourcis fonctionnent pour l'etat actuel, mais rendront les evolutions conceptuelles risquées si elles sont empilees sans isolation.

Niveau de compatibilite avec le modele cible : moyen. Les fondations sont bonnes pour les rounds, la reserve, les etats et les creneaux multiples, mais les garde-fous de compatibilite, le cout d'action, l'ajout en cours de round, le mode souple et la preparation PWA demandent des decisions avant implementation.

Risque avant futures evolutions : important. Le code passe les tests, mais plusieurs options incompatibles peuvent etre combinees dans la page Regles. Les fichiers centraux (`sceneActions.js`, `App.jsx`, `logic.js`, `FenetreEditionFiche.jsx`, `HubCampagne.jsx`) concentrent trop de responsabilites.

## 2. Compatibilites deja presentes

### C1 - Round principal explicite

- Fichiers : `src/App.jsx`, `src/interface/scene/BarreActionBas.jsx`, `src/interface/commun/ComposantsCommuns.jsx`.
- Comportement actuel : les libelles principaux affichent `Nouveau round`, notamment dans `nextLabel`, `libelleBas`, le bouton bas et le badge de round.
- Cohérence : le bouton final n'utilise pas `Nouveau tour` pour le passage de round principal, ce qui correspond au modele.

### C2 - Nouveau round declenche par clic MJ

- Fichiers : `src/actions/sceneActions.js`, `src/App.jsx`.
- Comportement actuel : le nouveau round est declenche par `nextTurn(1)` ou `advanceRound()`, donc par une action explicite de l'utilisateur.
- Cohérence : le code ne lance pas un nouveau round par minuterie ou effet de consultation passive.

### C3 - Debut de round applique les automatismes de round

- Fichiers : `src/actions/tempoState.js`, `src/actions/sceneActions.js`, `src/logic.js`.
- Comportement actuel : `appliquerDebutNouveauRound`, `appliquerNouveauRoundSouple` et `appliquerNouveauRoundPhases` avancent les etats de round, les suivis automatiques de round et le suivi global configure sur round.
- Cohérence : les effets de debut de round sont centralises dans les transitions de round, pas dans l'affichage.

### C4 - Activation protegee contre les creneaux multiples par defaut

- Fichiers : `src/logic.js`, `src/actions/sceneActions.js`, `src/actions/tempoState.js`, `src/logic.test.js`.
- Comportement actuel : `_activationAutomationsDone` empeche `triggerActivation` de rejouer les etats/horloges a activation plusieurs fois dans le meme round.
- Cohérence : une fiche avec plusieurs creneaux ne retique pas ses automatismes d'activation par defaut. Le test "protects activation statuses and clocks from multiple action slots in the same round" le confirme.

### C5 - Creneaux multiples comme entrees d'ordre

- Fichiers : `src/domain/initiative.js`, `src/domain/initiative.test.js`.
- Comportement actuel : `ordreCreneauxClassique` expand les `actionSlots` en entrees d'ordre via `participantAvecCreneau`, sans dupliquer la fiche source.
- Cohérence : les PV, suivis et etats restent sur le participant ; seul l'affichage d'ordre est repete.

### C6 - Suppression de fiche retire ses creneaux

- Fichiers : `src/actions/sceneActions.js`.
- Comportement actuel : `deleteParticipant` retire le participant de `participants` et `reserve`, donc tous ses `actionSlots` disparaissent avec lui.
- Cohérence : la suppression de fiche n'abandonne pas de creneau fantome.

### C7 - Etats lies a la fiche et non au creneau

- Fichiers : `src/storage.js`, `src/domain/initiative.js`, `src/interface/scene/ListeInitiative.jsx`.
- Comportement actuel : les `statuses` sont stockes sur le participant ; les creneaux affiches reutilisent le participant enrichi.
- Cohérence : un etat apparait sur chaque occurrence d'une fiche ayant plusieurs creneaux.

### C8 - Etat a 0 garde un evenement visible avant suppression

- Fichiers : `src/logic.js`, `src/interface/commun/ComposantsCommuns.jsx`.
- Comportement actuel : `tickStatuses` passe l'etat a `remaining: 0, expired: true`, puis ne le supprime qu'au prochain evenement equivalent s'il ne boucle pas. L'etiquette affiche explicitement `0`.
- Cohérence : l'etat a 0 n'est pas supprime immediatement.

### C9 - Declencheurs d'etats limites a activation ou round

- Fichiers : `src/domain/statuses.js`, `src/storage.js`, `src/logic.js`, `src/interface/dialogues/FenetreEtat.jsx`.
- Comportement actuel : `advanceOn` est normalise en `round` ou `activation`. Les etats de scene forces depuis le menu utilisent `round`.
- Cohérence : il n'existe pas de declencheur d'etat par phase dans le modele de donnees.

### C10 - Phases automatiques et phases cochees existent et sont exclusives

- Fichiers : `src/domain/initiativeModes.js`, `src/interface/campaign/HubCampagne.jsx`, `src/actions/tempoState.test.js`.
- Comportement actuel : `phaseActionMode` vaut `automatic` ou `checked`, et la page Regles propose un choix radio.
- Cohérence : les deux variantes de phases ne sont pas actives en meme temps.

### C11 - Declaration/resolution separee

- Fichiers : `src/domain/initiativeModes.js`, `src/actions/sceneActions.js`, `src/interface/dialogues/FenetreDeclarationActions.jsx`.
- Comportement actuel : `declarationStage` distingue `declaration` et `resolution`, les declarations sont conservees dans `declarations`, puis `applyDeclarationChoices` lance la resolution.
- Cohérence : la declaration n'est pas le meme etat que la resolution.

### C12 - Declaration structuree

- Fichiers : `src/interface/dialogues/FenetreDeclarationActions.jsx`.
- Comportement actuel : l'utilisateur choisit parmi des boutons d'action (`Attaque`, `Defense`, `Mouvement`, `Soutien`, `Autre`) et non dans un grand champ libre.
- Cohérence : cela suit l'intention d'une declaration rapide et structuree.

### C13 - Initiative non numerique comme configuration d'ordre

- Fichiers : `src/domain/initiativeTextOrder.js`, `src/interface/campaign/FenetreInitiativeTextuelleEdition.jsx`, `src/interface/initiative/ChampInitiative.jsx`.
- Comportement actuel : l'initiative par labels est une configuration de saisie/tri (`initiativeTextOrder`), pas un mode de temporalite separe.
- Cohérence : cela correspond a l'idee "type de valeur d'ordre", meme si les garde-fous restent incomplets.

### C14 - Reserve hors initiative

- Fichiers : `src/actions/sceneActions.js`, `src/actions/sceneSupport.js`, `src/interface/scene/ReserveHorsInitiative.jsx`, `src/storage.test.js`.
- Comportement actuel : `leaveInit` deplace un participant vers `reserve`; `placerEnReserve` remet initiative a 0 et vide `actionSlots`.
- Cohérence : les sortants ne polluent pas l'ordre actif.

### C15 - Persistance large de l'etat courant

- Fichiers : `src/storage.js`, `src/hooks/useCampaign.js`.
- Comportement actuel : sauvegarde locale et export incluent scenes, round, phase, activeId, activeSlotId, declarations, creneaux, reserve, suivis, etats, regles et templates.
- Cohérence : le chargement restaure une scene riche, pas seulement une liste de personnages.

## 3. Incompatibilites fonctionnelles

### F1 - Un seul participant ne peut pas atteindre "Nouveau round" via Suivant

- Fichiers concernes : `src/logic.js`, `src/actions/sceneActions.js`, `src/App.jsx`.
- Regle concernee : apres le dernier personnage ou creneau, le bouton devient `Nouveau round`.
- Fonctionnement actuel : `nextTurnInfo` et `nextTurn` ne detectent un nouveau round que si `nextIndex === 0 && currentIndex !== 0`. Avec un seul creneau, `currentIndex` vaut 0, donc `roundDelta` reste 0 et le bouton reste dans une logique de participant suivant.
- Fonctionnement souhaite : un round avec un seul creneau doit proposer `Nouveau round` apres son activation.
- Difference concrete : le cas "un seul participant" est traite comme s'il n'y avait jamais de fin de sequence.
- Impact MJ/table : impossible de faire avancer proprement le round avec le bouton principal dans une scene solo ou un duel temporairement reduit.
- Gravite : important.
- Recommandation : appliquer tel quel.
- Suggestion future : remplacer le test `currentIndex !== 0` par une notion explicite "le creneau courant est le dernier de la sequence", couverte par test.

### F2 - Le premier actif au demarrage de scene ne declenche pas l'activation

- Fichiers concernes : `src/actions/sceneActions.js`, `src/logic.js`.
- Regle concernee : une activation correspond au moment ou une fiche devient active pour la premiere fois du round.
- Fonctionnement actuel : `demarrerScene` assigne le premier `activeId`, mais applique seulement `resetAutoTrackers(participant, 'round')`. Les automatismes d'activation du premier personnage ne sont pas declenches au lancement d'un round initial classique ou phases.
- Fonctionnement souhaite : quand le premier personnage devient actif, ses etats/horloges a activation devraient avancer une fois, comme lors des passages suivants.
- Difference concrete : le premier actif d'un combat peut etre moins "active" que les suivants.
- Impact MJ/table : un etat "diminue a l'activation" peut durer un cran de trop pour le premier personnage au lancement de la scene.
- Gravite : important.
- Recommandation : a confirmer, car le comportement historique a peut-etre ete conserve volontairement.
- Suggestion future : decider si le lancement de scene compte comme entree dans la sequence, puis ajouter un test pour le premier actif.

### F3 - Le mot "tour" reste expose dans des options et libelles techniques

- Fichiers concernes : `src/interface/dialogues/FenetreEtat.jsx`, `src/interface/campaign/OngletTemplates.jsx`, `src/interface/scene/EnteteScene.jsx`, `src/interface/dialogues/FenetreResolutionHorloge.jsx`, `src/interface/scene/BoutonTourPrecedent.jsx`, `src/interface/scene/BarreActionBas.jsx`.
- Regle concernee : le mot "tour" doit etre evite dans les options techniques, car il est ambigu.
- Fonctionnement actuel : l'evolution d'etat propose `Nouveau tour`, l'entete affiche `Tour actif` / `Tours simultanes`, le mode souple affiche `Marquer les tours dans la liste`, et plusieurs composants gardent `Tour` dans leur nom.
- Fonctionnement souhaite : les options techniques devraient distinguer `round`, `activation`, `phase` et `creneau`.
- Difference concrete : le terme `tour` couvre actuellement au moins activation, round et navigation.
- Impact MJ/table : un utilisateur peut configurer un etat "Nouveau tour" en croyant cibler l'activation d'un personnage ou le round.
- Gravite : important.
- Recommandation : appliquer tel quel pour les libelles visibles ; garder les noms de fichiers pour un ticket separe.
- Suggestion future : remplacer les libelles visibles par `Debut du round`, `Activation`, `Personnage actif` ou `Creneau actif` selon le contexte, sans renommer le code dans le meme ticket.

### F4 - L'activation est memorisee par un champ interne de fiche, pas par un etat de round clair

- Fichiers concernes : `src/logic.js`, `src/domain/initiativeModes.js`, `src/storage.js`.
- Regle concernee : les activations du round doivent etre remises a zero au debut du round et distinguees des fiches ouvertes/modifiees.
- Fonctionnement actuel : la protection effective repose sur `_activationAutomationsDone` dans chaque participant. En parallele, `activatedThisRound`, `markActivationAdvanced` et `resetRoundActivationMarks` existent mais ne sont pas utilises dans le flux principal.
- Fonctionnement souhaite : une seule source de verite devrait dire quelles fiches ont ete activees dans le round.
- Difference concrete : deux mecanismes conceptuels coexistent, dont un mort ou incomplet.
- Impact MJ/table : faible aujourd'hui, mais risque eleve lors de l'ajout de cout d'action, historique ou migration de sauvegarde.
- Gravite : mineur maintenant, important pour evolution.
- Recommandation : a confirmer.
- Suggestion future : choisir entre un marqueur par participant et une liste de round, puis supprimer ou migrer l'autre dans une refactorisation dediee.

### F5 - Le cout d'action actuel deplace le creneau au lieu de generer un nouveau creneau resolu

- Fichiers concernes : `src/interface/dialogues/FenetreAjustementInitiative.jsx`, `src/hooks/useCampaign.js`, `src/domain/initiativeModes.js`.
- Regle concernee : le cout d'action doit laisser le creneau actuel visible comme resolu et creer un nouveau creneau plus bas.
- Fonctionnement actuel : la fenetre "Ajuster l'initiative" applique un `Cout` en soustrayant une valeur de l'initiative courante, puis `adjustParticipantInitiative` remplace l'initiative du creneau courant.
- Fonctionnement souhaite : l'ancien creneau devrait rester dans l'ordre comme creneau resolu ; un nouveau creneau genere devrait representer le prochain moment d'action.
- Difference concrete : le creneau original disparait de sa position au lieu d'etre conserve comme trace du tour resolu.
- Impact MJ/table : le MJ perd la trace de l'action deja traitee et peut mal lire la sequence.
- Gravite : bloquant pour appeler cela "cout d'action".
- Recommandation : appliquer tel quel si le cout d'action est retenu ; sinon renommer/reduire l'option en simple ajustement.
- Suggestion future : separer `promptInitiativeOnNext` de tout futur mode cout d'action, puis modeliser les creneaux generes avec un statut resolu.

### F6 - Le cout/ajustement peut coexister avec des modes incompatibles

- Fichiers concernes : `src/App.jsx`, `src/interface/campaign/HubCampagne.jsx`, `src/interface/dialogues/FenetreAjustementInitiative.jsx`.
- Regle concernee : cout d'action incompatible avec mode souple, initiative non numerique, phases et creneaux multiples manuels.
- Fonctionnement actuel : la page Regles permet `Ajustement avant Suivant` avec phases automatiques, labels d'initiative et actions multiples ; seul le mode souple et les phases cochees bloquent l'ouverture de la fenetre au moment du clic.
- Fonctionnement souhaite : les options incompatibles devraient etre visibles mais desactivees avec explication, et impossibles a quitter actives ensemble.
- Difference concrete : la page Regles accepte des combinaisons que le modele cible refuse.
- Impact MJ/table : une campagne peut etre configuree dans un etat ambigu ou l'interface promet un cout d'action sans respecter sa semantique.
- Gravite : important.
- Recommandation : appliquer tel quel apres decision sur F5.
- Suggestion future : creer un validateur de compatibilite de regles, puis brancher la page Regles dessus.

### F7 - Cas "cout au-dela de la fin du round" implicite

- Fichiers concernes : `src/interface/dialogues/FenetreAjustementInitiative.jsx`, `src/hooks/useCampaign.js`, `src/domain/initiative.js`.
- Regle concernee : si le cout depasse la fin du round, le comportement doit etre configurable.
- Fonctionnement actuel : une initiative peut etre reduite silencieusement. Elle est ensuite triee comme n'importe quelle initiative, sans option dediee pour sortie du round, report ou maintien.
- Fonctionnement souhaite : le MJ doit choisir la politique de campagne.
- Difference concrete : le depassement est un effet numerique implicite, pas une decision de regles.
- Impact MJ/table : les actions lentes peuvent reapparaitre ou disparaitre d'une facon difficile a anticiper.
- Gravite : important si le cout d'action est garde.
- Recommandation : a confirmer.
- Suggestion future : ne traiter ce cas qu'apres une vraie modelisation des creneaux generes.

### F8 - Les phases peuvent declencher un suivi global

- Fichiers concernes : `src/domain/globalTracker.js`, `src/interface/suivis/CompteurGlobal.jsx`, `src/actions/sceneActions.js`.
- Regle concernee : les phases ne declenchent jamais les etats ni les horloges.
- Fonctionnement actuel : le suivi global accepte `trigger: 'phase'`, l'UI propose `Nouvelle phase`, et `sceneActions` appelle `stepAutoGlobalTracker(..., 'phase')` lors du passage de phase.
- Fonctionnement souhaite : les declencheurs automatiques doivent etre `manual`, `round` ou activation du porteur selon le type ; pas de phase.
- Difference concrete : une horloge globale peut avancer a chaque phase.
- Impact MJ/table : les phases deviennent un moteur d'horloge, alors qu'elles devraient seulement organiser l'ordre d'action.
- Gravite : important.
- Recommandation : appliquer tel quel si le modele cible est confirme.
- Suggestion future : retirer ou migrer le trigger `phase` apres demande de confirmation pour les campagnes existantes qui l'utilisent.

### F9 - Phases et creneaux multiples restent combinables

- Fichiers concernes : `src/interface/campaign/HubCampagne.jsx`, `src/interface/fiches/FicheParticipant.jsx`, `src/domain/initiativeModes.js`.
- Regle concernee : phases cochees et phases automatiques sont incompatibles avec creneaux multiples.
- Fonctionnement actuel : `multipleActionSlots` peut rester actif en mode phases ; les fiches peuvent afficher a la fois initiatives multiples et phases cochees.
- Fonctionnement souhaite : les actions multiples manuelles devraient etre desactivees en contexte de phases.
- Difference concrete : l'interface laisse construire deux systemes d'action concurrents.
- Impact MJ/table : le MJ peut saisir des creneaux qui ne pilotent pas vraiment le mode phases, ou croire qu'ils s'additionnent aux phases.
- Gravite : important.
- Recommandation : appliquer tel quel.
- Suggestion future : griser "Actions multiples" quand `temporalite === phases`, avec explication et conservation silencieuse des donnees non actives.

### F10 - Initiative non numerique autorisee avec phases automatiques

- Fichiers concernes : `src/interface/campaign/HubCampagne.jsx`, `src/domain/initiativeTextOrder.js`, `src/domain/initiative.js`.
- Regle concernee : initiative non numerique compatible seulement avec phases cochees, incompatible avec phases automatiques.
- Fonctionnement actuel : l'UI affiche seulement un avertissement ; le code convertit les labels en rangs numeriques via `initiativeToNumber`, donc les phases automatiques peuvent fonctionner silencieusement avec labels.
- Fonctionnement souhaite : l'option devrait etre desactivee ou bloquee avec explication dans les phases automatiques.
- Difference concrete : un cas de compatibilite refuse par le modele est actuellement autorise.
- Impact MJ/table : les labels peuvent produire des initiatives effectives artificielles, difficiles a comprendre.
- Gravite : important.
- Recommandation : appliquer tel quel.
- Suggestion future : centraliser la regle d'incompatibilite et proposer de passer en phases cochees ou de revenir au numerique.

### F11 - Transition declaration -> resolution pas toujours explicitement manuelle

- Fichiers concernes : `src/interface/dialogues/FenetreDeclarationActions.jsx`, `src/actions/sceneActions.js`, `src/App.jsx`.
- Regle concernee : le MJ clique explicitement sur `Passer en resolution`.
- Fonctionnement actuel : le dernier choix d'action dans la fenetre appelle directement `onValider`, donc la resolution peut demarrer automatiquement apres le dernier bouton d'action. Il existe aussi un bouton `Lancer la resolution`, mais il n'est pas obligatoire si le dernier choix est fait.
- Fonctionnement souhaite : la declaration devrait rester en declaration jusqu'a un clic explicite de passage.
- Difference concrete : choisir la derniere declaration et passer en resolution sont fusionnes.
- Impact MJ/table : le MJ peut basculer en resolution sans temps de relecture.
- Gravite : mineur a important selon usage.
- Recommandation : a confirmer.
- Suggestion future : supprimer l'auto-validation du dernier choix et garder seulement un bouton de transition explicite.

### F12 - Declaration/resolution manque les choix d'ordre et categories prevus

- Fichiers concernes : `src/interface/dialogues/FenetreDeclarationActions.jsx`, `src/domain/initiativeModes.js`, `src/actions/sceneActions.js`.
- Regle concernee : ordre de resolution au choix du MJ/regles ; categories de vitesse optionnelles, tri par categories optionnel.
- Fonctionnement actuel : les declarations sont demandees dans un ordre inverse du tri d'initiative ; la resolution est construite selon `ordreCreneauxClassique`. Pas de categories de vitesse ni choix d'ordre manuel.
- Fonctionnement souhaite : le MJ devrait pouvoir choisir declaration dans meme ordre, initiative ou ordre manuel, et les categories de vitesse devraient rester optionnelles.
- Difference concrete : le code impose deux ordres implicites.
- Impact MJ/table : comportement utilisable, mais difficile a adapter a une table qui declare lent->rapide et resout rapide->lent ou inversement.
- Gravite : mineur.
- Recommandation : a confirmer ; probablement inutile tant que declaration/resolution reste simple.
- Suggestion future : ne pas ajouter d'options avant de trancher la compatibilite avec phases et cout d'action.

### F13 - Mode souple declenche de vraies activations individuelles

- Fichiers concernes : `src/actions/sceneActions.js`, `src/actions/flexibleTurnState.js`, `src/interface/fiches/FichetteInitiative.jsx`.
- Regle concernee : le mode souple n'a pas d'activation individuelle forte ; une activation fantome de debut de round est seulement une compatibilite technique possible.
- Fonctionnement actuel : `markFlexiblePlayed` met `activeId`, `activeSlotId`, appelle `triggerActivationScene`, et fait avancer les etats/horloges a activation du participant marque.
- Fonctionnement souhaite : le mode souple devrait marquer "a joue" sans presenter ou declencher une vraie activation individuelle, sauf politique technique de compatibilite clairement isolee.
- Difference concrete : cliquer `A joue` est aujourd'hui une activation reelle.
- Impact MJ/table : un MJ peut faire avancer des automatismes d'activation dans un mode cense rester libre.
- Gravite : important.
- Recommandation : a confirmer, car les tests actuels verifient ce comportement.
- Suggestion future : decider si la compatibilite ancienne prime, puis isoler la "ghost activation" pour qu'elle ne soit pas confondue avec une activation MJ.

### F14 - Mode souple autorise la creation de nouveaux etats/horloges a activation

- Fichiers concernes : `src/interface/dialogues/FenetreEtat.jsx`, `src/interface/fiches/FenetreEditionFiche.jsx`, `src/interface/app/FenetresSuperposees.jsx`.
- Regle concernee : en mode souple, ne pas permettre de creer de nouveaux etats/horloges a activation.
- Fonctionnement actuel : `FenetreEtat` propose `Activation` par defaut ; l'editeur d'horloge propose `Activation du personnage` quel que soit le mode.
- Fonctionnement souhaite : l'option activation devrait etre masquee/desactivee en mode souple pour les nouvelles donnees, tout en preservant les anciennes donnees.
- Difference concrete : le mode souple peut creer exactement les automatismes qu'il devrait eviter.
- Impact MJ/table : confusion entre "a joue" libre et activation mecanique.
- Gravite : important.
- Recommandation : appliquer tel quel si F13 est confirme.
- Suggestion future : passer le contexte de temporalite aux fenetres d'etat/suivi et griser les declencheurs incompatibles.

### F15 - Actions multiples du mode souple utilisent de vrais `actionSlots`

- Fichiers concernes : `src/actions/flexibleTurnState.js`, `src/domain/initiative.js`, `src/interface/fiches/FichetteInitiative.jsx`.
- Regle concernee : mode souple + plusieurs actions correspond a des marqueurs "a joue plusieurs fois", pas a de vrais creneaux d'initiative.
- Fonctionnement actuel : `actionsRestantesSouples` lit les `actionSlots` du participant et marque les slots un par un.
- Fonctionnement souhaite : le mode souple devrait stocker un compteur/marker souple distinct de l'ordre d'initiative.
- Difference concrete : le meme champ `actionSlots` sert a la fois aux vrais creneaux ordonnes et aux repetitions souples.
- Impact MJ/table : faible visuellement, mais fort pour l'architecture future.
- Gravite : mineur maintenant, important pour evolution.
- Recommandation : a confirmer.
- Suggestion future : creer un champ dedie aux repetitions souples si cette option reste souhaitee.

### F16 - Une seule fichette depliee par defaut n'est pas appliquee

- Fichiers concernes : `src/interface/fiches/FichetteParticipant.jsx`, `src/interface/scene/ListeInitiative.jsx`.
- Regle concernee : une seule fichette depliee a la fois par defaut, option pour desactiver cette limite.
- Fonctionnement actuel : chaque fichette a son propre `useState(false)` pour `repliee`, donc toutes les fichettes sont depliees par defaut et se replient independamment.
- Fonctionnement souhaite : l'etat d'expansion devrait etre pilote par la liste, avec une seule fiche ouverte par defaut.
- Difference concrete : aucune coordination globale des fichettes.
- Impact MJ/table : les fiches avec beaucoup de suivis peuvent encombrer l'initiative.
- Gravite : mineur.
- Recommandation : a confirmer.
- Suggestion future : ajouter un controle d'expansion centralise dans `ListeInitiative`, mais pas avant les clarifications sur creneaux/slots.

### F17 - Ajout de personnage en cours de round sans detection d'initiative depassee

- Fichiers concernes : `src/interface/fiches/FenetreAjoutPersonnage.jsx`, `src/hooks/useCharacterInteractions.js`, `src/actions/sceneActions.js`.
- Regle concernee : si l'initiative est deja depassee, Cadence doit afficher une fenetre interne et ne pas activer automatiquement ce round.
- Fonctionnement actuel : l'ajout en initiative insere et trie le participant sans verifier si son initiative est deja depassee. Aucun message interne ne distingue action narrative et activation Cadence.
- Fonctionnement souhaite : detection de l'initiative depassee et choix `Ajouter quand meme` / `Modifier son initiative`.
- Difference concrete : l'ajout est silencieux.
- Impact MJ/table : un personnage peut apparaitre dans l'ordre courant sans indication claire sur son droit a activation automatique ce round.
- Gravite : important.
- Recommandation : appliquer tel quel.
- Suggestion future : ajouter un service `dynamicEntry` qui compare initiative ajoutee, creneau actif et type de temporalite.

### F18 - Cas debut de round avec nouvel entrant plus rapide non traite

- Fichiers concernes : `src/actions/sceneActions.js`, `src/hooks/useCharacterInteractions.js`.
- Regle concernee : si aucun personnage n'a encore ete active dans le round, un entrant plus haut que le premier prevu devient actif.
- Fonctionnement actuel : `addParticipant` ne remplace pas `activeId` si un actif existe deja, meme si personne n'a encore vraiment joue.
- Fonctionnement souhaite : distinguer "round commence mais aucune activation consommee" de "initiative deja depassee".
- Difference concrete : le code ne sait pas representer ce debut de round particulier.
- Impact MJ/table : un ajout immediatement apres lancement peut etre mal positionne dans l'activation courante.
- Gravite : mineur a important selon usage.
- Recommandation : a confirmer.
- Suggestion future : necessite une source de verite claire des activations du round avant implementation.

### F19 - Arrivee en phases automatiques recalcule implicitement l'initiative effective

- Fichiers concernes : `src/domain/initiativeModes.js`, `src/domain/initiative.js`, `src/actions/sceneActions.js`.
- Regle concernee : si des phases automatiques ont ete consommees, Cadence doit proposer de conserver l'initiative originale ou d'appliquer l'initiative effective.
- Fonctionnement actuel : `participantsPourPhaseAvancee` applique `initiativeDePhase` a tous les participants presents dans la phase courante. Un nouvel entrant est donc integre au calcul courant sans fenetre de choix.
- Fonctionnement souhaite : une fenetre Cadence doit expliciter le calcul et proposer les deux choix.
- Difference concrete : le recalcul est silencieux.
- Impact MJ/table : le MJ ne voit pas la difference entre une arrivee speciale et une integration normale dans les phases.
- Gravite : important.
- Recommandation : appliquer tel quel.
- Suggestion future : le meme service `dynamicEntry` devrait calculer l'initiative effective et demander confirmation.

### F20 - Garde-fous d'incompatibilite absents de la page Regles

- Fichiers concernes : `src/interface/campaign/HubCampagne.jsx`, `src/domain/campaignRules.js`.
- Regle concernee : options incompatibles visibles, grisées, expliquees ; impossible de quitter la page Regles avec options incompatibles.
- Fonctionnement actuel : `normalizeCampaignRules` normalise les valeurs mais ne valide pas les combinaisons. La page Regles masque parfois des sections selon temporalite, mais ne bloque pas les incompatibilites principales.
- Fonctionnement souhaite : un validateur central doit produire et afficher les incompatibilites.
- Difference concrete : les presets et toggles peuvent construire des configurations incoherentes.
- Impact MJ/table : comportement difficile a predire si plusieurs options avancees sont activees ensemble.
- Gravite : bloquant avant nouvelles options.
- Recommandation : appliquer tel quel en premier chantier conceptuel.
- Suggestion future : creer `validateRuleCompatibility(rules)` et l'utiliser dans la page Regles, l'import et les presets.

### F21 - Resume lisible des regles actives absent

- Fichiers concernes : `src/interface/campaign/HubCampagne.jsx`, `src/interface/menu/MenuPrincipal.jsx`.
- Regle concernee : resume visible dans Regles, visible dans la scene depuis le menu.
- Fonctionnement actuel : les options sont visibles dans leurs blocs, mais aucun resume compact "Classique / Numerique / Actions multiples / Declaration" n'est genere.
- Fonctionnement souhaite : une synthese courte des regles actives.
- Difference concrete : le MJ doit relire plusieurs sections pour comprendre la configuration.
- Impact MJ/table : faible en configuration simple, plus genant avec phases/declaration/actions multiples.
- Gravite : mineur.
- Recommandation : a confirmer.
- Suggestion future : attendre le validateur de compatibilite pour generer le resume depuis la meme source.

## 4. Zones ambigües

### A1 - Activation du premier personnage au lancement

- Fichier concerne : `src/actions/sceneActions.js`.
- Ambiguite : le code declenche l'activation au nouveau round, mais pas au lancement initial de scene.
- Risque : changer ce point peut modifier des usages existants.
- Decision a confirmer : le lancement de l'initiative compte-t-il comme debut de round + activation du premier actif ?

### A2 - Portee des automatismes sur la reserve

- Fichier concerne : `src/actions/tempoState.js`.
- Ambiguite : les participants en reserve subissent les ticks de round (`tickParticipant(resetAutoTrackers(..., 'round'), 'round')`).
- Risque : une reserve hors initiative peut avancer comme si elle participait au temps de scene.
- Decision a confirmer : la reserve doit-elle suivre les rounds de la scene ou etre totalement hors initiative ?

### A3 - `phaseActivateOncePerRound` existe mais n'est pas visible clairement

- Fichiers concernes : `src/constants.js`, `src/domain/campaignRules.js`, `src/actions/tempoState.js`.
- Ambiguite : cette option peut rendre les activations par phase plus frequentes, mais la page Regles ne l'expose pas clairement.
- Risque : les sauvegardes peuvent contenir une option avancee qui change fortement les automatismes.
- Decision a confirmer : garder cette option avancee ou la remplacer par la politique d'activation cible ?

### A4 - `promptInitiativeOnNext` est-il un cout d'action ou un ajustement ?

- Fichiers concernes : `src/interface/dialogues/FenetreAjustementInitiative.jsx`, `src/interface/campaign/HubCampagne.jsx`.
- Ambiguite : l'UI parle d'ajustement mais contient un champ `Cout`.
- Risque : corriger le "cout d'action" en s'appuyant dessus peut solidifier une abstraction inadaptee.
- Decision a confirmer : conserver comme outil manuel d'ajustement ou repartir sur un modele cout d'action separe.

### A5 - Declaration/resolution + phases

- Fichiers concernes : `src/App.jsx`, `src/actions/sceneActions.js`, `src/domain/initiativeModes.js`.
- Ambiguite : le code autorise declaration et phases ensemble, mais la responsabilite principale n'est pas nette.
- Risque : les phases, declarations et activations peuvent se marcher dessus.
- Decision a confirmer : rendre phases le mode principal avec declaration optionnelle, ou declarer l'incompatibilite.

### A6 - Initiative non numerique : deux modeles coexistent

- Fichiers concernes : `src/domain/initiativeModes.js`, `src/domain/initiativeTextOrder.js`, `src/domain/campaignRules.js`.
- Ambiguite : `initiativeValueType` / `initiativeLabels` existent, mais le flux actuel utilise surtout `initiativeTextOrder`.
- Risque : futures corrections peuvent utiliser le mauvais modele.
- Decision a confirmer : deprecier le vieux couple `initiativeValueType` / `initiativeLabels` ou le reconnecter explicitement.

### A7 - Historique utilisateur vs historique technique

- Fichiers concernes : `src/actions/sceneActions.js`, `src/actions/flexibleTurnState.js`.
- Ambiguite : `_turnHistory` sert a revenir en arriere ; `historiqueSouple` sert aux actions souples. Aucun des deux n'est l'historique lisible demande.
- Risque : reutiliser `_turnHistory` comme historique UI exposerait des snapshots techniques.
- Decision a confirmer : creer un historique evenementiel separe.

### A8 - Reset de scene

- Fichiers concernes : `src/actions/sceneActions.js`, `src/actions/campaignActions.js`, `src/interface/menu/MenuPrincipal.jsx`.
- Ambiguite : il existe retour preparation, reset suivis, effacement etats, reset demo, restauration de points.
- Risque : les niveaux de reset sont utiles mais disperses.
- Decision a confirmer : quels resets doivent etre exposes comme niveaux officiels ?

## 5. Dette structurelle

### S1 - `src/interface/fiches/FenetreEditionFiche.jsx`

- Responsabilite excessive : edition identite, creneaux, phases cochees, infos rapides, suivis, seuils, reset rules, templates, confirmation suppression.
- Pourquoi c'est risque : 552 lignes, UI dense, logique de creneaux et logique de suivis dans le meme composant ; il contient aussi un retour JSX inatteignable apres un `return`.
- Piste : separer `EditionIdentite`, `EditionCreneaux`, `EditionPhases`, `EditionSuivis`, `EditionTemplates`, et supprimer le code mort dans un ticket dedie.
- Priorite : haute avant de modifier les creneaux.

### S2 - `src/actions/sceneActions.js`

- Responsabilite excessive : mutations de participants, round, phases, declaration, mode souple, reserve, historique de retour, etats, suivis, ajout dynamique.
- Pourquoi c'est risque : les transitions de temps sont difficiles a raisonner et chaque option nouvelle touche ce fichier.
- Piste : extraire un moteur d'evenements (`startRound`, `activateParticipant`, `advanceSlot`, `advancePhase`, `enterDeclarationResolution`) et garder `sceneActions` comme adaptateur React.
- Priorite : tres haute avant cout d'action et ajout dynamique.

### S3 - `src/App.jsx`

- Responsabilite excessive : orchestration de vues, calcul des libelles, ouverture automatique des fenetres, incompatibilites d'initiative, timer, export, templates.
- Pourquoi c'est risque : les conditions de boutons et de fenetres deviennent la source reelle de compatibilite, au lieu d'etre dans le domaine.
- Piste : extraire `useSceneFlowUi`, `useInitiativeCompatibilityNotice`, `useDeclarationUi`, `useTimerCompletion`.
- Priorite : moyenne, apres validation des regles metier.

### S4 - `src/logic.js`

- Responsabilite excessive : uid, trackers, seuils, etats, activation, campagnes demo.
- Pourquoi c'est risque : les fonctions coeur (`triggerActivation`, `tickStatuses`) cohabitent avec beaucoup de donnees de demonstration.
- Piste : extraire `domain/trackers`, `domain/statusTicks`, `domain/demoCampaigns`.
- Priorite : haute pour clarifier activation/horloges.

### S5 - `src/interface/campaign/HubCampagne.jsx`

- Responsabilite excessive : onglets, scenes, regles, presets, edition de noms, incompatibilites partielles.
- Pourquoi c'est risque : la page Regles ne peut pas facilement appliquer des garde-fous coherents.
- Piste : isoler `RulesPage`, `RuleCompatibilityNotice`, `RulePresetPicker`, `RuleSummary`.
- Priorite : haute avant garde-fous.

### S6 - `src/interface/suivis/CompteurGlobal.jsx`

- Responsabilite excessive : rendu compteur, edition, seuils, sons, temps reel, timer, calculs d'affichage.
- Pourquoi c'est risque : le suivi global est proche des horloges mais a son propre moteur, dont le trigger `phase`.
- Piste : separer logique de temps reel/seuils dans `domain/globalTracker`, garder le composant pour le rendu.
- Priorite : moyenne, haute si PWA/offline avec notifications ou sons.

### S7 - `src/storage.js`

- Responsabilite excessive : schema, normalisation legacy, validation, serialization, noms de fichiers, localStorage.
- Pourquoi c'est risque : une migration de donnees PWA ou d'incompatibilites peut casser import/export.
- Piste : separer `campaignSchema`, `participantNormalization`, `trackerNormalization`, `persistenceLocal`.
- Priorite : moyenne avant PWA.

### S8 - CSS massif et cascade fragile

- Fichiers : `src/refinements.css`, `src/trackers-clarity.css`, `src/styles.css`, `src/theme-cadence.css`, `src/initiative-rules.css`.
- Responsabilite excessive : styles historiques, theme, corrections et UI avancee melanges.
- Pourquoi c'est risque : les etats expires/inactifs dependent de l'ordre de chargement.
- Piste : regrouper par surfaces (`scene`, `rules`, `trackers`, `dialogs`, `theme`) et ajouter des captures visuelles avant gros changement.
- Priorite : basse a moyenne, sauf si modification des etats a 0.

### Factorisations proposees

- Validation des compatibilites de regles : gain fort, risque faible si fonction pure ; priorite tres haute.
- Moteur d'evenements round/activation/phase : gain fort, risque eleve ; priorite haute mais apres tests de caracterisation.
- Modele de creneaux distinct des fiches : gain fort pour cout d'action ; risque eleve car touche tri, affichage, persistance.
- Dialogues Cadence generiques : gain moyen pour avertissements d'ajout dynamique et incompatibilites ; risque faible.
- Normalisation des libelles round/tour/activation : gain moyen ; risque UX faible mais a faire hors refactor moteur.
- Historique evenementiel : gain moyen ; risque moyen si melange avec `_turnHistory`, a garder separe.

## 6. Risques PWA

### P1 - Manifest present, mais chemins absolus

- Fichiers/config : `index.html`, `public/manifest.webmanifest`.
- Probleme potentiel : `start_url`, `scope` et icones commencent par `/`.
- Impact : OK sur domaine racine ; risque sur sous-chemin ou preview non racine.
- Verification/correction future : verifier le contexte Cloudflare Pages cible ; envisager chemins relatifs ou `base` Vite explicite si deploiement en sous-repertoire.

### P2 - Service worker volontairement desactive

- Fichier : `public/service-worker.js`.
- Probleme potentiel : le service worker supprime les caches et se desinstalle ; aucun cache offline n'est actif.
- Impact : l'application peut etre installable via manifest selon navigateur, mais pas fiable hors-ligne.
- Verification/correction future : definir une strategie cache avant toute reactivation.

### P3 - Pas de registration service worker actuelle

- Fichiers : `src/main.jsx`, recherche globale.
- Probleme potentiel : aucun `navigator.serviceWorker.register` n'est present.
- Impact : le fichier `service-worker.js` seul ne suffit pas a activer le hors-ligne.
- Verification/correction future : ajouter l'enregistrement seulement quand la strategie cache/update est prete.

### P4 - Risque d'ancienne version apres cache futur

- Fichiers : `README_DEV.md`, `public/service-worker.js`, build Vite.
- Probleme potentiel : l'historique du projet mentionne des pages blanches dues a d'anciens assets hashes.
- Impact : PWA peut servir un JS obsolete apres deploiement.
- Verification/correction future : strategy `network-first` pour `index.html`, cache versionne pour assets hashes, message de mise a jour clair.

### P5 - Donnees locales fragiles

- Fichiers : `src/storage.js`, `src/templates.js`, `src/hooks/useCampaign.js`.
- Probleme potentiel : donnees principales en `localStorage`, templates aussi ; perte possible si cache/site data vide, changement de navigateur, profil prive ou reinstall.
- Impact : risque de perte de campagne.
- Verification/correction future : afficher un avertissement "donnees locales" et renforcer la visibilite de l'export `.cad`.

### P6 - File System Access API non universelle

- Fichiers : `src/hooks/useCampaign.js`, `src/actions/campaignActions.js`.
- Probleme potentiel : `showDirectoryPicker` et `showSaveFilePicker` ne sont pas disponibles partout, notamment iOS/Safari selon versions.
- Impact : experience PWA mobile limitee pour dossiers/copies.
- Verification/correction future : garder un flux export/import compatible sans File System Access et documenter les limites.

### P7 - Export/import `.cad` fiable mais message PWA a renforcer

- Fichiers : `src/actions/campaignActions.js`, `src/interface/campaign/HubCampagne.jsx`.
- Probleme potentiel : export existe, mais pas de rappel permanent lie au risque local/PWA.
- Impact : l'utilisateur peut croire que l'installation protege les donnees.
- Verification/correction future : ajouter une section ou un message discret "Pense a exporter ta campagne".

### P8 - Build statique compatible

- Fichiers/config : `package.json`, `vite.config.js`, `README.md`.
- Probleme potentiel : pas de dependance serveur constatee ; build Vite OK.
- Impact : Cloudflare Pages ou hebergement statique semblent compatibles.
- Verification/correction future : tester un deploiement preview avec manifest, chemins d'assets et import/export `.cad`.

### P9 - UX PWA a definir

- Fichiers : `public/manifest.webmanifest`, `index.html`, interface.
- Probleme potentiel : nom, icones et theme existent, mais pas d'ecran de lancement ou message offline/update.
- Impact : installation possible mais experience pas encore assumee.
- Verification/correction future : definir nom installable, icone finale, message hors-ligne minimal, update prompt, rappel donnees locales.

## 7. Documentation modifiee

- Documentation ajoutee : `docs/audit-modele-cadence-2026-05-26.md`.
- README modifies : aucun.
- Commentaires ajoutes dans le code : aucun.
- Raison : conserver un rapport long et decisionnel sans modifier le comportement applicatif.

## 8. Plan de travail recommande

1. Corrections conceptuelles bloquantes : clarifier activation du premier actif, cout d'action vs ajustement, mode souple et source de verite des activations.
2. Garde-fous d'incompatibilite : creer un validateur pur des regles, l'utiliser dans Regles, import, presets et resume actif.
3. Tickets fonctionnels cibles : round a un seul participant, terminologie `tour`, ajout dynamique en cours de round, phase auto avec entrant tardif.
4. Refactorisations ciblees : isoler moteur d'evenements, creneaux d'ordre, declaration/resolution, suivi global.
5. Preparation PWA : formaliser strategie cache/update, messages donnees locales, compatibilite export/import mobile.
6. Activation PWA : enregistrer service worker, tester offline/update sur desktop et mobile, puis seulement publier comme PWA active.
