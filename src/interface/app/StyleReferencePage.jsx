import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { participantSymbols, uiGlyphs, uiSymbols } from '../../uiAssets.js';
import '../../random-system/styles/base.css';
import '../../random-system/styles/choice-controls.css';
import '../../random-system/styles/configuration.css';
import '../../random-system/styles/results.css';
import { IconeOeilMystiqueFerme, IconeOeilMystiqueOuvert } from '../icones/IconesOeilMystique.jsx';
import { IconeJetDes } from '../icones/IconeJetDes.jsx';
import { IconeMetronome } from '../icones/IconeMetronome.jsx';
import { IconeRepliFichette } from '../commun/ComposantsCommuns.jsx';
import './StyleReferencePage.css';

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
  'SYM-LIT-21': 'Dos de carte emoji peu homogene avec les autres signes de cartes.',
  'SYM-LIT-22': 'Le double de emoji fait le job, mais manque d identite Cadence.',
  'SYM-LIT-27': 'Joker emoji visuellement a part du reste de la famille cartes.',
};

const uiSymbolReferences = symbolReferences.filter((item) => item.ref.startsWith('SYM-UI-'));
const participantSymbolReferences = symbolReferences.filter((item) => item.ref.startsWith('SYM-PART-'));
const literalSymbolReferences = symbolReferences.filter((item) => item.ref.startsWith('SYM-LIT-'));
const redesignCandidateReferences = symbolReferences
  .filter((item) => redesignCandidateNotes[item.ref])
  .map((item) => ({ ...item, note: redesignCandidateNotes[item.ref] }));
const filteredUiSymbolReferences = uiSymbolReferences.filter((item) => !redesignCandidateNotes[item.ref]);
const filteredLiteralSymbolReferences = literalSymbolReferences.filter((item) => !redesignCandidateNotes[item.ref]);

function ReferenceTag({ children }) {
  return <code className="style-reference-tag">{children}</code>;
}

function Sample({ refId, title, children, className = '' }) {
  return (
    <article className={`style-reference-sample ${className}`.trim()}>
      <div className="style-reference-sample-head">
        <ReferenceTag>{refId}</ReferenceTag>
        <strong>{title}</strong>
      </div>
      <div className="style-reference-preview">{children}</div>
    </article>
  );
}

function Section({ refId, title, children }) {
  return (
    <section className="style-reference-section">
      <header>
        <ReferenceTag>{refId}</ReferenceTag>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function TypographySamples() {
  return (
    <div className="style-reference-grid">
      <Sample refId="TYPE-01" title="Titres">
        <div className="style-reference-type-stack">
          <h1>Titre principal H1</h1>
          <h2>Titre de fenêtre H2</h2>
          <h3>Titre de section H3</h3>
          <h4>Sous-section H4</h4>
        </div>
      </Sample>
      <Sample refId="TYPE-02" title="Texte courant">
        <p>Texte principal utilisé dans les contenus de Cadence.</p>
        <p className="muted">Texte secondaire avec la classe muted.</p>
        <p className="muted compact-help">Aide compacte associée à une option.</p>
      </Sample>
      <Sample refId="TYPE-03" title="Libellés">
        <label className="field">Libellé de champ<input value="Valeur" readOnly /></label>
        <span className="rs-section-kicker">Surtitre RandomSystem</span>
        <code>Identifiant technique</code>
      </Sample>
    </div>
  );
}

function SurfaceSamples() {
  return (
    <div className="style-reference-surface-grid">
      <article className="panel"><ReferenceTag>SURF-01</ReferenceTag><strong>Panel</strong><p className="muted">Surface principale.</p></article>
      <article className="card"><ReferenceTag>SURF-02</ReferenceTag><strong>Fichette</strong><p className="muted">Surface d’un élément de scène.</p></article>
      <article className="empty-section"><ReferenceTag>SURF-03</ReferenceTag><strong>État vide</strong><p className="muted">Aucun élément disponible.</p></article>
      <article className="initiative-entry-warning"><ReferenceTag>SURF-04</ReferenceTag><strong>Avertissement</strong></article>
      <article className="rule-option-warning"><ReferenceTag>SURF-05</ReferenceTag><strong>Erreur ou incompatibilité</strong></article>
      <article className="campaign-save-status status-local"><ReferenceTag>SURF-06</ReferenceTag><strong>État de sauvegarde</strong></article>
    </div>
  );
}

function ButtonSamples() {
  return (
    <div className="style-reference-grid">
      <Sample refId="BTN-01" title="Actions principales"><button type="button" className="primary">Action principale</button><button type="button" className="primary next-round">Tour suivant</button><button type="button" className="primary blocked">Action bloquée</button></Sample>
      <Sample refId="BTN-02" title="Actions secondaires"><button type="button" className="small-btn">Secondaire</button><button type="button" className="small-btn suggested">Suggérée</button><button type="button" className="small-btn" disabled>Désactivée</button></Sample>
      <Sample refId="BTN-03" title="Actions dangereuses"><button type="button" className="danger-btn">Supprimer</button><button type="button" className="small-btn subtle-danger">{uiSymbols.remove}</button></Sample>
      <Sample refId="BTN-04" title="Boutons icône"><button type="button" className="icon-btn" aria-label="Fermer">{uiGlyphs.close}</button><button type="button" className="turn-btn compact">{uiGlyphs.previousTurn}</button><button type="button" className="turn-btn compact next-round">{uiGlyphs.next}</button></Sample>
      <Sample refId="BTN-05" title="Choix"><button type="button" className="choice">Choix</button><button type="button" className="choice selected">Sélectionné</button></Sample>
      <Sample refId="BTN-06" title="Contrôles compacts"><div className="box-action-toggle"><button type="button" className="active">{uiSymbols.add}</button><button type="button">{uiSymbols.subtract}</button></div><div className="compact-arrows"><button type="button" className="small-btn">{uiSymbols.moveUp}</button><button type="button" className="small-btn">{uiSymbols.moveDown}</button></div></Sample>
    </div>
  );
}

function FormSamples() {
  const [switchOn, setSwitchOn] = useState(true);
  const [themeOn, setThemeOn] = useState(false);
  return (
    <div className="style-reference-grid">
      <Sample refId="FORM-01" title="Champs texte">
        <label className="field">Texte<input defaultValue="Valeur de test" /></label>
        <label className="field">Nombre<input type="number" defaultValue="12" /></label>
        <label className="field">Zone longue<textarea defaultValue="Texte sur plusieurs lignes" /></label>
      </Sample>
      <Sample refId="FORM-02" title="Menus">
        <label className="field">Sélection<select defaultValue="b"><option value="a">Option A</option><option value="b">Option B</option></select></label>
      </Sample>
      <Sample refId="FORM-03" title="Switch">
        <label className={`global-switch ${switchOn ? 'active' : ''}`}><span>Option active</span><input type="checkbox" checked={switchOn} onChange={(event) => setSwitchOn(event.target.checked)} /></label>
        <label className="global-switch"><span>Option inactive</span><input type="checkbox" /></label>
      </Sample>
      <Sample refId="FORM-04" title="Radios">
        <label className="advanced-radio"><input type="radio" name="style-reference-radio" defaultChecked /><span><strong>Choix A</strong><small>Description du choix</small></span></label>
        <label className="advanced-radio"><input type="radio" name="style-reference-radio" /><span><strong>Choix B</strong><small>Autre possibilité</small></span></label>
      </Sample>
      <Sample refId="FORM-05" title="Thème">
        <button type="button" className={`theme-toggle ${themeOn ? 'dark-on' : 'light-on'}`} onClick={() => setThemeOn((current) => !current)} aria-label="Basculer le témoin de thème"><span>{uiGlyphs.themeLight}</span><span>{uiGlyphs.themeDark}</span><i /></button>
      </Sample>
    </div>
  );
}

function NavigationSamples() {
  return (
    <div className="style-reference-grid">
      <Sample refId="NAV-01" title="Onglets principaux"><div className="hub-tabs style-reference-tabs"><button type="button" className="choice selected">Actif</button><button type="button" className="choice">Inactif</button></div></Sample>
      <Sample refId="NAV-02" title="Sous-onglets"><div className="template-subtabs style-reference-tabs"><button type="button" className="choice selected">Section A</button><button type="button" className="choice">Section B</button></div></Sample>
      <Sample refId="NAV-03" title="Segments RandomSystem"><div className="rs-segmented"><button type="button" className="selected">Tirages</button><button type="button">Cartes</button></div></Sample>
      <Sample refId="NAV-04" title="Section repliable"><details className="advanced-options"><summary>Actions avancées</summary><button type="button" className="small-btn">Action</button></details></Sample>
    </div>
  );
}

function BadgeSamples() {
  return (
    <div className="style-reference-grid">
      <Sample refId="BADGE-01" title="Puces"><span className="chip">Standard</span><span className="chip hot">À résoudre</span><span className="type-chip">Opposant</span></Sample>
      <Sample refId="BADGE-02" title="États"><span className="status permanent">Permanent {uiGlyphs.infinity}</span><span className="status temporary">Temporaire {uiGlyphs.timer} 2</span><span className="status loop">Boucle {uiGlyphs.loop}</span></Sample>
      <Sample refId="BADGE-03" title="Seuils"><span className="threshold-chip threshold-neutral">Neutre</span><span className="threshold-chip threshold-warning">Alerte</span><span className="threshold-chip threshold-danger">Danger</span></Sample>
      <Sample refId="BADGE-04" title="Résumé RandomSystem"><div className="rs-kit-summary"><span>2 éléments aléatoires</span><span>3 lancers</span><span>Initiative numérique</span></div></Sample>
    </div>
  );
}

function TrackerSamples() {
  return (
    <div className="style-reference-grid">
      <Sample refId="TRACK-01" title="Barre"><div className="controls"><button type="button">{uiSymbols.subtract}</button><div className="bar-bg"><div className="bar-fill" style={{ width: '62%' }} /></div><button type="button">{uiSymbols.add}</button></div></Sample>
      <Sample refId="TRACK-02" title="Points"><div className="dots"><button type="button" className="dot on" /><button type="button" className="dot on" /><button type="button" className="dot" /><button type="button" className="dot" /></div></Sample>
      <Sample refId="TRACK-03" title="Horloges"><button type="button" className="clock-face" style={{ '--clock-progress': '62%' }}><span>5</span><small>/ 8</small></button><button type="button" className="clock-face warning" style={{ '--clock-progress': '75%' }}><span>6</span><small>/ 8</small></button></Sample>
      <Sample refId="TRACK-04" title="Cases, du vide au plein"><div className="boxes"><button type="button" className="box mark-0" aria-label="Case vide" /><button type="button" className="box mark-1" aria-label="Case niveau 1" /><button type="button" className="box mark-2" aria-label="Case niveau 2" /><button type="button" className="box mark-3" aria-label="Case niveau 3" /><button type="button" className="box mark-4" aria-label="Case niveau 4" /><button type="button" className="box mark-5 full" aria-label="Case pleine" /></div></Sample>
      <Sample refId="TRACK-05" title="Compteur"><div className="counter-unit counter-size-compact"><button type="button" className="counter-edge">{uiSymbols.subtract}</button><button type="button" className="counter-tile"><span>Élan</span><strong>4</strong></button><button type="button" className="counter-edge">{uiSymbols.add}</button></div></Sample>
    </div>
  );
}

function RandomSystemSamples() {
  return (
    <div className="style-reference-grid">
      <Sample refId="RAND-01" title="En-tête"><div><span className="rs-section-kicker">Configuration</span><div className="rs-heading-with-mark"><span className="rs-heading-mark">{uiSymbols.draw}</span><h3>Types de tirage</h3></div></div></Sample>
      <Sample refId="RAND-02" title="Ressource"><div className="rs-config-list-item selected"><span className="rs-resource-title"><span>{uiSymbols.die1}</span><span>d20 simple</span></span><small>Tirage exposé</small></div></Sample>
      <Sample refId="RAND-03" title="Résultat"><div className="rs-primary-result"><span>Total</span><strong>16</strong><small>Modificateur +0</small></div><div className="rs-draw-chip"><span>d20</span><strong>16</strong></div></Sample>
      <Sample refId="RAND-04" title="Cartes"><div className="rs-card-result"><span className="rs-card-symbol">{uiSymbols.spades}</span><strong>As</strong><small>Pique</small></div></Sample>
    </div>
  );
}

const colorTokens = [
  ['COLOR-01', '--ui-app-bg', 'Fond application'],
  ['COLOR-02', '--ui-surface', 'Surface'],
  ['COLOR-03', '--ui-surface-soft', 'Surface discrète'],
  ['COLOR-04', '--ui-text', 'Texte'],
  ['COLOR-05', '--ui-muted', 'Texte secondaire'],
  ['COLOR-06', '--ui-border', 'Bordure'],
  ['COLOR-07', '--ui-accent', 'Accent'],
  ['COLOR-08', '--ui-success', 'Succès'],
  ['COLOR-09', '--ui-danger', 'Danger'],
  ['COLOR-10', '--rs-accent', 'Accent RandomSystem'],
  ['COLOR-11', '--rs-highlight', 'Surlignage RandomSystem'],
  ['COLOR-12', '--theme-gold', 'Or Cadence'],
];

function ColorSamples() {
  return (
    <div className="style-reference-color-layout">
      <div className="style-reference-color-grid">
        {colorTokens.map(([ref, token, label]) => (
          <article key={ref}>
            <span className="style-reference-swatch" style={{ background: `var(${token})` }} />
            <div><ReferenceTag>{ref}</ReferenceTag><strong>{label}</strong><code>{token}</code></div>
          </article>
        ))}
      </div>
      <div className="style-reference-grid">
        <Sample refId="COLOR-CTX-01" title="Surfaces ensemble">
          <div className="style-reference-surface-stack">
            <div className="style-reference-color-context app-bg">
              <div className="style-reference-color-context surface">
                <strong>Surface</strong>
                <small>--ui-surface</small>
              </div>
              <div className="style-reference-color-context surface-soft">
                <strong>Surface discrète</strong>
                <small>--ui-surface-soft</small>
              </div>
            </div>
          </div>
        </Sample>
        <Sample refId="COLOR-CTX-02" title="Texte et bordure">
          <div className="style-reference-color-text-demo">
            <strong style={{ color: 'var(--ui-text)' }}>Texte principal</strong>
            <span style={{ color: 'var(--ui-muted)' }}>Texte secondaire</span>
            <div className="style-reference-border-demo">
              <span>Bordure</span>
              <small>--ui-border</small>
            </div>
          </div>
        </Sample>
        <Sample refId="COLOR-CTX-03" title="Actions de thème">
          <button type="button" className="small-btn" style={{ background: 'var(--ui-accent-soft)', borderColor: 'var(--ui-accent)', color: 'var(--ui-accent)' }}>Accent</button>
          <button type="button" className="primary next-round">Succès</button>
          <button type="button" className="danger-btn">Danger</button>
        </Sample>
        <Sample refId="COLOR-CTX-04" title="RandomSystem">
          <div className="style-reference-rs-token-row">
            <span className="rs-kit-summary"><span style={{ background: 'var(--rs-accent-soft)', borderColor: 'var(--rs-accent)', color: 'var(--rs-accent)' }}>Accent RandomSystem</span></span>
            <span className="rs-kit-summary"><span style={{ background: 'color-mix(in srgb, var(--rs-highlight) 16%, transparent)', borderColor: 'var(--rs-highlight)', color: 'var(--rs-highlight)' }}>Surlignage</span></span>
            <span className="type-chip">Or Cadence</span>
          </div>
          <p className="muted style-reference-color-note">`--rs-accent` et `--rs-highlight` peuvent devenir très proches selon le mode. Ils restent séparés car ils décrivent deux rôles.</p>
        </Sample>
      </div>
    </div>
  );
}

function SymbolSamples() {
  return (
    <>
      <div className="style-reference-symbol-sections">
        <section className="style-reference-symbol-block style-reference-symbol-block-flagged">
          <div className="style-reference-symbol-block-head">
            <ReferenceTag>SYM-GRP-06</ReferenceTag>
            <strong>A retravailler visuellement</strong>
          </div>
          <p className="muted style-reference-symbol-help">Signes fonctionnels aujourd hui, mais qui gagneraient probablement a etre redesignes pour mieux coller au langage visuel de Cadence.</p>
          <div className="style-reference-symbol-grid">
            {redesignCandidateReferences.map((item) => (
              <article key={item.ref}>
                <span className="style-reference-symbol" aria-hidden="true">{item.symbol}</span>
                <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>{item.note}</small></div>
              </article>
            ))}
          </div>
        </section>
        <section className="style-reference-symbol-block">
          <div className="style-reference-symbol-block-head">
            <ReferenceTag>SYM-GRP-04</ReferenceTag>
            <strong>Icônes Cadence</strong>
          </div>
          <p className="muted style-reference-symbol-help">Symboles de l’interface, plutôt clairs et cohérents avec le thème actuel.</p>
          <div className="style-reference-symbol-grid">
            {filteredUiSymbolReferences.map((item) => (
              <article key={item.ref}>
                <span className="style-reference-symbol" aria-hidden="true">{item.symbol}</span>
                <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>{item.source}</small></div>
              </article>
            ))}
          </div>
        </section>
        <section className="style-reference-symbol-block">
          <div className="style-reference-symbol-block-head">
            <ReferenceTag>SYM-GRP-05</ReferenceTag>
            <strong>Symboles techniques</strong>
          </div>
          <p className="muted style-reference-symbol-help">Littéraux et marqueurs plus utilitaires, pas toujours jolis mais souvent efficaces.</p>
          <div className="style-reference-symbol-grid">
            {filteredLiteralSymbolReferences.map((item) => (
              <article key={item.ref}>
                <span className="style-reference-symbol" aria-hidden="true">{item.symbol}</span>
                <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>{item.source}</small></div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <div className="style-reference-grid style-reference-vector-grid">
        <Sample refId="ICON-01" title="Œil ouvert"><span className="style-reference-vector"><IconeOeilMystiqueOuvert /></span></Sample>
        <Sample refId="ICON-02" title="Œil fermé"><span className="style-reference-vector"><IconeOeilMystiqueFerme /></span></Sample>
        <Sample refId="ICON-03" title="Replier / déplier"><span className="style-reference-vector"><IconeRepliFichette /></span><span className="style-reference-vector"><IconeRepliFichette repliee /></span></Sample>
        <Sample refId="ICON-04" title="Métronome animé / arrêté"><span className="style-reference-vector"><IconeMetronome /></span><span className="style-reference-vector"><IconeMetronome fige /></span></Sample>
        <Sample refId="ICON-05" title="Flèche Cadence avant"><span className="style-reference-vector"><span className="cadence-arrow-icon forward" /></span></Sample>
        <Sample refId="ICON-06" title="Flèche Cadence retour"><span className="style-reference-vector"><span className="cadence-arrow-icon back" /></span></Sample>
        <Sample refId="ICON-07" title="Jet de dés"><span className="style-reference-vector"><IconeJetDes /></span></Sample>
      </div>
      <section className="style-reference-symbol-block style-reference-character-symbols">
        <div className="style-reference-symbol-block-head">
          <ReferenceTag>SYM-CHAR</ReferenceTag>
          <strong>Symboles de personnages</strong>
        </div>
        <p className="muted style-reference-symbol-help">Bloc séparé : ces symboles servent aux fiches et à la personnalisation, pas au langage visuel général de l’interface.</p>
        {participantSymbolGroups.map((group) => (
          <section className="style-reference-symbol-subgroup" key={group.ref}>
            <div className="style-reference-symbol-block-head">
              <ReferenceTag>{group.ref}</ReferenceTag>
              <strong>{group.title}</strong>
            </div>
            <p className="muted style-reference-symbol-help">{group.help}</p>
            <div className="style-reference-symbol-grid">
              {group.symbols.map((symbol) => {
                const item = participantSymbolReferences.find((reference) => reference.symbol === symbol);
                if (!item) return null;
                return (
                  <article key={`${group.ref}-${item.ref}`}>
                    <span className="style-reference-symbol" aria-hidden="true">{item.symbol}</span>
                    <div><ReferenceTag>{item.ref}</ReferenceTag><strong>{item.label}</strong><small>{item.source}</small></div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}

function AuditSamples() {
  return (
    <div className="style-reference-grid">
      <Sample refId="AUDIT-01" title="Switches, mécanique fusionnée">
        <label className="global-switch active"><span>Compact</span><input type="checkbox" defaultChecked /></label>
        <label className="reset-switch active"><span>Option</span><input type="checkbox" defaultChecked /></label>
        <label className="limit-switch-row"><span>Limite</span><input type="checkbox" defaultChecked /></label>
      </Sample>
      <Sample refId="AUDIT-02" title="Sélections, rôles distincts">
        <button type="button" className="choice selected">Onglet</button>
        <label className="advanced-radio selected"><input type="radio" defaultChecked /><span><strong>Choix détaillé</strong><small>Avec explication</small></span></label>
        <label className="phase-check selected"><input type="checkbox" defaultChecked /><span>Phase</span></label>
      </Sample>
      <Sample refId="AUDIT-03" title="Capsules à rapprocher">
        <span className="chip">Information</span>
        <span className="type-chip">Type</span>
        <span className="threshold-chip threshold-neutral">Seuil</span>
        <span className="status temporary">État</span>
        <span className="rs-kit-summary"><span>Résumé</span></span>
      </Sample>
      <Sample refId="AUDIT-04" title="Panneaux d’information rapprochés">
        <div className="empty-section">État vide</div>
        <div className="campaign-save-status">Sauvegarde locale</div>
        <div className="initiative-entry-warning">Saisie incomplète</div>
      </Sample>
    </div>
  );
}

export function StyleReferencePage({ onBack }) {
  return (
    <div className="style-reference-page">
      <header className="style-reference-header">
        <div>
          <span className="style-reference-eyebrow">{t('styleReference.eyebrow')}</span>
          <h1>{t('styleReference.title')}</h1>
          <p className="muted">{t('styleReference.help')}</p>
        </div>
        <button type="button" className="small-btn" onClick={onBack}><span aria-hidden="true">{uiSymbols.randomBack}</span> {t('styleReference.back')}</button>
      </header>
      <nav className="style-reference-index" aria-label={t('styleReference.index')}>
        {[
          ['type', 'Typographie'],
          ['surfaces', 'Surfaces'],
          ['buttons', 'Boutons'],
          ['forms', 'Formulaires'],
          ['navigation', 'Navigation'],
          ['badges', 'Puces et états'],
          ['trackers', 'Trackers'],
          ['random', 'RandomSystem'],
          ['colors', 'Couleurs'],
          ['symbols', 'Symboles'],
          ['audit', 'Styles proches'],
        ].map(([id, label]) => <a href={`#style-${id}`} key={id}>{label}</a>)}
      </nav>
      <div id="style-type"><Section refId="CAT-01" title="Typographie"><TypographySamples /></Section></div>
      <div id="style-surfaces"><Section refId="CAT-02" title="Surfaces et messages"><SurfaceSamples /></Section></div>
      <div id="style-buttons"><Section refId="CAT-03" title="Boutons"><ButtonSamples /></Section></div>
      <div id="style-forms"><Section refId="CAT-04" title="Formulaires"><FormSamples /></Section></div>
      <div id="style-navigation"><Section refId="CAT-05" title="Navigation"><NavigationSamples /></Section></div>
      <div id="style-badges"><Section refId="CAT-06" title="Puces, états et résumés"><BadgeSamples /></Section></div>
      <div id="style-trackers"><Section refId="CAT-07" title="Trackers et compteurs"><TrackerSamples /></Section></div>
      <div id="style-random"><Section refId="CAT-08" title="RandomSystem"><RandomSystemSamples /></Section></div>
      <div id="style-colors"><Section refId="CAT-09" title="Couleurs et variables"><ColorSamples /></Section></div>
      <div id="style-symbols"><Section refId="CAT-10" title="Symboles et icônes"><SymbolSamples /></Section></div>
      <div id="style-audit"><Section refId="CAT-11" title="Styles proches à harmoniser"><AuditSamples /></Section></div>
    </div>
  );
}
