import { participantSymbols, uiGlyphs, uiSymbols } from '../../uiAssets.js';
import { cadenceIconPaths } from '../icones/IconeCadence.jsx';

const glyphLabels = {
  avatarFallback: 'Avatar par défaut',
  close: 'Fermer ou retirer',
  duplicate: 'Dupliquer',
  dice: 'Lanceur rapide',
  edit: 'Modifier',
  infinity: 'Durée infinie',
  loop: 'Boucle',
  menu: 'Menu',
  middleDot: 'Séparateur',
  next: 'Tour suivant',
  pause: 'Blocage ou pause',
  previousTurn: 'Tour précédent',
  returnPreparation: 'Retour préparation',
  save: 'Enregistrer',
  stealth: 'Secret ou masqué',
  themeDark: 'Thème sombre',
  themeLight: 'Thème clair',
  timer: 'Durée restante',
};

const symbolLabels = {
  remove: 'Suppression compacte',
  add: 'Ajouter ou incrémenter',
  subtract: 'Retirer ou décrémenter',
  moveUp: 'Monter',
  moveDown: 'Descendre',
  randomBack: 'Retour RandomSystem',
  history: 'Historique',
  draw: 'Tirage ou définition',
  randomSource: 'Sources aléatoires',
  resultOptions: 'Options de résultat',
  weightedTable: 'Table pondérée',
  cards: 'Cartes',
  statistics: 'Statistiques',
  die1: 'Dé à six faces',
  die2: 'Face de dé 2',
  die3: 'Face de dé 3',
  die4: 'Face de dé 4',
  die5: 'Face de dé 5',
  die6: 'Face de dé 6',
  cardBack: 'Dos de carte',
  roll: 'Lancer individuel',
  spades: 'Pique',
  hearts: 'Cœur',
  diamonds: 'Carreau',
  clubs: 'Trèfle',
  joker: 'Joker',
  alert: 'Impact ou alerte',
  csvImport: 'Import CSV',
  tarotTrump: 'Atout de tarot',
  confirm: 'Confirmer',
};

const symbolReferenceNumbers = {
  remove: 1,
  add: 3,
  subtract: 4,
  moveUp: 5,
  moveDown: 6,
  randomBack: 7,
  history: 8,
  draw: 9,
  randomSource: 10,
  resultOptions: 11,
  weightedTable: 12,
  cards: 13,
  statistics: 14,
  die1: 15,
  die2: 16,
  die3: 17,
  die4: 18,
  die5: 19,
  die6: 20,
  cardBack: 21,
  roll: 22,
  spades: 23,
  hearts: 24,
  diamonds: 25,
  clubs: 26,
  joker: 27,
  alert: 28,
  csvImport: 29,
  tarotTrump: 30,
  confirm: 31,
};

export const symbolReferences = [
  ...Object.entries(uiGlyphs).map(([key, symbol], index) => ({
    ref: `SYM-UI-${String(index + 1).padStart(2, '0')}`,
    symbol,
    label: glyphLabels[key] || key,
    source: `uiGlyphs.${key}`,
  })),
  ...participantSymbols.map((symbol, index) => ({
    ref: `SYM-PART-${String(index + 1).padStart(2, '0')}`,
    symbol,
    label: `Symbole de personnage ${index + 1}`,
    source: 'participantSymbols',
  })),
  ...Object.entries(uiSymbols).map(([key, symbol]) => ({
    ref: `SYM-LIT-${String(symbolReferenceNumbers[key]).padStart(2, '0')}`,
    symbol,
    label: symbolLabels[key] || key,
    source: `uiSymbols.${key}`,
  })),
];

const participantSymbolGroups = [
  {
    ref: 'SYM-GRP-01',
    title: 'Clairs et lisibles',
    help: 'Symboles faciles à distinguer vite sur une fichette ou dans une liste.',
    symbols: participantSymbols.slice(0, 5),
  },
  {
    ref: 'SYM-GRP-02',
    title: 'Dans l’esprit Cadence',
    help: 'Symboles qui collent bien au vocabulaire visuel actuel de Cadence.',
    symbols: [participantSymbols[0], participantSymbols[3], participantSymbols[4], participantSymbols[2]],
  },
  {
    ref: 'SYM-GRP-03',
    title: 'Plus expressifs',
    help: 'Symboles plus décoratifs ou plus typés, utiles quand on veut plus de personnalité.',
    symbols: participantSymbols.slice(5),
  },
];

const redesignCandidateNotes = {
  'SYM-UI-01': 'Trop generique : simple point, utile en secours mais sans identite visuelle propre.',
  'SYM-UI-04': 'Trop proche des autres symboles de des et encore tres generique pour un usage Cadence.',
  'SYM-UI-05': 'Crayon tres standard, fonctionnel mais peu distinctif dans l interface.',
  'SYM-UI-08': 'Hamburger tres generique, sans personnalite et proche des usages web par defaut.',
  'SYM-UI-14': 'Emoji disquette tres dependant de la plateforme et un peu date visuellement.',
  'SYM-UI-15': 'Emoji tres expressif, mais il casse un peu le ton general de l interface.',
  'SYM-UI-16': 'Symbole standard de theme sombre, lisible mais tres commun et peu typique.',
  'SYM-UI-17': 'Symbole standard de theme clair, lisible mais tres commun et peu typique.',
  'SYM-LIT-01': 'Trop generique : marqueur pratique, mais peu elegant et proche du symbole de fermeture.',
  'SYM-LIT-03': 'Trop generique et tres proche d autres marqueurs utilitaires deja presents.',
  'SYM-LIT-04': 'Trop generique et tres proche d autres marqueurs utilitaires deja presents.',
  'SYM-LIT-07': 'Retour tres proche des fleches UI existantes, sans vrai gain de vocabulaire visuel.',
  'SYM-LIT-08': 'Historique peu clair et visuellement faible dans l ensemble actuel.',
  'SYM-LIT-09': 'Symbole abstrait assez arbitraire, difficile a comprendre sans connaitre Cadence.',
  'SYM-LIT-10': 'Notation tres interne pour les sources, peu parlante pour quelqu un qui arrive.',
  'SYM-LIT-11': 'Le lien avec les options de resultat n est pas intuitif visuellement.',
  'SYM-LIT-12': 'Table ponderee trop cryptique et trop proche d autres signes techniques.',
  'SYM-LIT-13': 'Cartes encore trop abstrait et pas tres distinctif face au reste de la famille.',
  'SYM-LIT-14': 'Statistiques utilise un remplacement temporaire : il manque un pictogramme dedie clair.',
  'SYM-LIT-21': 'Dos de carte emoji peu homogene avec les autres signes de cartes.',
  'SYM-LIT-22': 'Le double de emoji fait le job, mais manque d identite Cadence.',
  'SYM-LIT-27': 'Joker emoji visuellement a part du reste de la famille cartes.',
};

const cadenceReplacementReferences = [
  { status: 'done', source: 'uiGlyphs.avatarFallback', oldRef: 'SYM-UI-01', newIcon: 'avatarDefault', usage: 'Avatar de secours des participants sans symbole.' },
  { status: 'done', source: 'uiGlyphs.close', oldRef: 'SYM-UI-02', newIcon: 'close', usage: 'Fermeture de fenêtres et retrait des états.' },
  { status: 'done', source: 'uiGlyphs.duplicate', oldRef: 'SYM-UI-03', newIcon: 'duplicate', usage: 'Duplication des modèles.' },
  { status: 'done', source: 'uiGlyphs.edit', oldRef: 'SYM-UI-05', newIcon: 'edit', usage: 'Édition inline des modèles et renommage des presets.' },
  { status: 'done', source: 'uiGlyphs.menu', oldRef: 'SYM-UI-08', newIcon: 'menu', usage: 'Ouverture du menu de scène.' },
  { status: 'done', source: 'uiGlyphs.returnPreparation', oldRef: 'SYM-UI-13', newIcon: 'return', usage: 'Retour vers la préparation.' },
  { status: 'done', source: 'uiGlyphs.save', oldRef: 'SYM-UI-14', newIcon: 'save', usage: 'Sauvegarde de presets et modèles.' },
  { status: 'done', source: 'uiGlyphs.stealth', oldRef: 'SYM-UI-15', newIcon: 'avatarSubtle', usage: 'Badges et boutons secret/dissimuler.' },
  { status: 'done', source: 'uiGlyphs.timer / durée restante', oldRef: 'SYM-UI-18', newIcon: 'timer', usage: 'Durée restante des états remplacée par le nouveau sablier SVG.' },
  { status: 'done', source: 'uiSymbols.remove', oldRef: 'SYM-LIT-01', newIcon: 'remove', usage: 'Suppression compacte : scènes, templates, seuils, creneaux et choix RandomSystem.' },
  { status: 'done', source: 'uiSymbols.add', oldRef: 'SYM-LIT-03', newIcon: 'add', usage: 'Création de templates et kits de tirage.' },
  { status: 'done', source: 'uiSymbols.moveUp / moveDown', oldRef: 'SYM-LIT-05 / SYM-LIT-06', newIcon: 'nextStrong', usage: 'Flèches verticales pour monter/descendre dans Règles, Modèles, initiative textuelle et choix RandomSystem.' },
  { status: 'done', source: 'uiSymbols.randomBack', oldRef: 'SYM-LIT-07', newIcon: 'return', usage: 'Retour depuis RandomSystem.' },
  { status: 'partial', source: 'uiSymbols.history', oldRef: 'SYM-LIT-08', newIcon: 'return', usage: 'Historique encore servi par retour : pictogramme dédié souhaitable.' },
  { status: 'done', source: 'uiSymbols.draw / roll', oldRef: 'SYM-LIT-09 / SYM-LIT-22', newIcon: 'dice', usage: 'Tirages, résultats, onglet utiliser, source uniforme.' },
  { status: 'done', source: 'uiSymbols.randomSource', oldRef: 'SYM-LIT-10', newIcon: 'dice', usage: 'Liste des sources aléatoires.' },
  { status: 'done', source: 'uiSymbols.resultOptions', oldRef: 'SYM-LIT-11', newIcon: 'settings', usage: 'Options/règles de résultats RandomSystem.' },
  { status: 'done', source: 'uiSymbols.weightedTable', oldRef: 'SYM-LIT-12', newIcon: 'cardStack', usage: 'Tables pondérées et distributions statistiques.' },
  { status: 'done', source: 'uiSymbols.cards / cardBack', oldRef: 'SYM-LIT-13 / SYM-LIT-21', newIcon: 'cardStack', usage: 'Sources de cartes, pioche et statistiques de cartes.' },
  { status: 'done', source: 'uiSymbols.cardBack', oldRef: 'SYM-LIT-21', newIcon: 'cardBack', usage: 'Tirage de carte pour un seul personnage dans la saisie d’initiative.' },
  { status: 'done', source: 'uiSymbols.confirm', oldRef: 'SYM-LIT-31', newIcon: 'valid', usage: 'Boutons de validation/confirmation compacts.' },
  { status: 'partial', source: 'uiSymbols.statistics', oldRef: 'SYM-LIT-14', newIcon: 'timer', usage: 'Les statistiques utilisent temporairement le sablier : un pictogramme dédié reste souhaitable.' },
  { status: 'done', source: 'icônes de visibilité', oldRef: 'hors uiAssets', newIcon: 'eyeOpen / eyeClosed', usage: 'Boutons visibilité/masquage des suivis.' },
  { status: 'done', source: 'mode souple', oldRef: 'hors uiAssets', newIcon: 'nextMedium + extraAction / nextSoft', usage: 'Suivant reste la flèche avant ; action supplémentaire s’ajoute en complément.' },
  { status: 'done', source: 'dé d’intrigue Cosmere', oldRef: 'hors uiAssets', newIcon: 'cosmereComplication2 / cosmereComplication4 / cosmereBoon', usage: 'Faces spéciales du d6 Cosmere.' },
  { status: 'done', source: 'checkbox CSS', oldRef: 'hors uiAssets', newIcon: 'switchOff / switchOn', usage: 'Switches globaux, options de règles, limites et RandomSystem.' },
  { status: 'done', source: 'HTML/emoji règles', oldRef: 'hors uiAssets', newIcon: 'edit / save', usage: 'Renommer et sauvegarder un preset de règles.' },
];

const replacedSymbolRefs = new Set(cadenceReplacementReferences
  .filter((item) => item.status === 'done')
  .flatMap((item) => item.oldRef.split(' / ')));

const uiSymbolReferences = symbolReferences.filter((item) => item.ref.startsWith('SYM-UI-'));
const participantSymbolReferences = symbolReferences.filter((item) => item.ref.startsWith('SYM-PART-'));
const literalSymbolReferences = symbolReferences.filter((item) => item.ref.startsWith('SYM-LIT-'));
const redesignCandidateReferences = symbolReferences
  .filter((item) => redesignCandidateNotes[item.ref] && !replacedSymbolRefs.has(item.ref))
  .map((item) => ({ ...item, note: redesignCandidateNotes[item.ref] }));
const filteredUiSymbolReferences = uiSymbolReferences.filter((item) => !redesignCandidateNotes[item.ref] && !replacedSymbolRefs.has(item.ref));
const filteredLiteralSymbolReferences = literalSymbolReferences.filter((item) => !redesignCandidateNotes[item.ref] && !replacedSymbolRefs.has(item.ref));

const cadenceIconLabels = {
  add: 'Ajouter',
  avatarDefault: 'Avatar par défaut',
  avatarSubtle: 'Avatar discret',
  cardBack: 'Dos de carte',
  cardStack: 'Paquet de cartes',
  close: 'Fermer',
  dice: 'Jet de dés',
  duplicate: 'Dupliquer',
  edit: 'Éditer',
  extraAction: 'Action supplémentaire',
  eyeClosed: 'Œil fermé',
  eyeOpen: 'Œil ouvert',
  menu: 'Menu',
  metronome: 'Métronome',
  nextMedium: 'Flèche avant',
  nextSoft: 'Flèche légère',
  nextStrong: 'Flèche verticale',
  remove: 'Supprimer',
  return: 'Retour',
  save: 'Sauvegarder',
  settings: 'Réglages',
  switchOff: 'Switch inactif',
  switchOn: 'Switch actif',
  timer: 'Sablier',
  valid: 'Valider',
  cosmereBoon: 'Cosmere aubaine',
  cosmereComplication2: 'Cosmere complication 2',
  cosmereComplication4: 'Cosmere complication 4',
};

const cadenceIconReferences = Object.keys(cadenceIconPaths).map((name, index) => ({
  ref: `ICON-NEW-${String(index + 1).padStart(2, '0')}`,
  name,
  label: cadenceIconLabels[name] || name,
}));

const usedCadenceIconNames = new Set([
  'add',
  'avatarDefault',
  'avatarSubtle',
  'cardBack',
  'cardStack',
  'close',
  'dice',
  'duplicate',
  'edit',
  'extraAction',
  'eyeClosed',
  'eyeOpen',
  'menu',
  'metronome',
  'nextMedium',
  'nextSoft',
  'nextStrong',
  'remove',
  'return',
  'save',
  'settings',
  'switchOff',
  'switchOn',
  'timer',
  'valid',
  'cosmereBoon',
  'cosmereComplication2',
  'cosmereComplication4',
]);

const unusedCadenceIconReferences = cadenceIconReferences.filter((item) => !usedCadenceIconNames.has(item.name));

const cadenceStatusLabels = {
  done: 'OK',
  partial: 'Partiel',
  todo: 'À suivre',
};

const cadenceAuditSummary = [
  { label: 'Correspondances OK', value: cadenceReplacementReferences.filter((item) => item.status === 'done').length },
  { label: 'Remplacements partiels', value: cadenceReplacementReferences.filter((item) => item.status === 'partial').length },
  { label: 'Icônes non utilisées', value: unusedCadenceIconReferences.length },
  { label: 'Anciens symboles à retravailler', value: redesignCandidateReferences.length },
];

const cadenceVariantNotes = [
  {
    ref: 'VAR-01',
    title: 'Yeux',
    current: 'IconeOeilMystiqueOuvert / IconeOeilMystiqueFerme',
    imported: 'IconeCadence.eyeOpen / IconeCadence.eyeClosed',
    status: 'Remplacé',
    note: 'Les composants d’œil conservent leurs points d’entrée historiques mais utilisent désormais les nouveaux SVG oeil_ouvert.svg et oeil_ferme.svg.',
  },
  {
    ref: 'VAR-02',
    title: 'Métronome',
    current: 'IconeMetronome',
    imported: 'IconeCadence.metronome',
    status: 'Remplacé',
    note: 'IconeMetronome utilise désormais le nouveau SVG metronome.svg en inline, avec #metronome-bras conservé pour l’animation.',
  },
  {
    ref: 'VAR-03',
    title: 'Dés',
    current: 'IconeJetDes',
    imported: 'IconeCadence.dice',
    status: 'Remplacé',
    note: 'Le composant IconeJetDes utilise désormais le nouveau SVG jet_des.svg. Les anciens dés inline ne sont plus la source visuelle du bouton de lancer.',
  },
  {
    ref: 'VAR-04',
    title: 'Dés spéciaux Cosmere',
    current: 'Dé d’intrigue Cosmere',
    imported: 'IconeCadence.cosmereBoon / cosmereComplication2 / cosmereComplication4',
    status: 'Utilisé',
    note: 'Le kit Cosmere mappe le d6 d’intrigue : 1 = Complication 2, 2 = Complication 4, 3/4 = faces vierges, 5/6 = Aubaines.',
  },
];

export { participantSymbolGroups, redesignCandidateNotes, cadenceReplacementReferences, replacedSymbolRefs, uiSymbolReferences, participantSymbolReferences, literalSymbolReferences, redesignCandidateReferences, filteredUiSymbolReferences, filteredLiteralSymbolReferences, cadenceIconLabels, cadenceIconReferences, usedCadenceIconNames, unusedCadenceIconReferences, cadenceStatusLabels, cadenceAuditSummary, cadenceVariantNotes };

