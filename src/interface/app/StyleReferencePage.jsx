// NOTE AUDIT / DEV TOOL:
// Cette page de référence visuelle est une surface de développement temporaire.
// Elle documente l'état du vocabulaire UI pendant les audits, puis pourra être
// retirée. Elle n'a pas vocation à être harmonisée finement avec l'UI produit
// de Cadence, ni à être entièrement couverte par l'i18n, l'accessibilité produit
// ou les règles de polish visuel standard.
import { useState } from 'react';
import { colorNames } from '../../constants.js';
import { t } from '../../i18n/index.js';
import { newTracker } from '../../logic.js';
import { participantSymbols, uiGlyphs, uiSymbols } from '../../uiAssets.js';
import '../../random-system/styles/base.css';
import '../../random-system/styles/choice-controls.css';
import '../../random-system/styles/configuration.css';
import '../../random-system/styles/results.css';
import { EtiquetteEtat } from '../commun/ComposantsCommuns.jsx';
import { EditeurSuivi } from '../fiches/FenetreEditionFiche.jsx';
import { IconeCadence, cadenceIconPaths } from '../icones/IconeCadence.jsx';
import { CompteurGlobal, EditeurCompteurGlobal } from '../suivis/CompteurGlobal.jsx';
import { Suivi } from '../suivis/Suivi.jsx';
import { ThemeModeToggle } from './MenuOptions.jsx';
import { SceneTutorial } from '../scene/SceneTutorial.jsx';
import './StyleReferencePage.css';

import { SymbolSamples } from './StyleReferenceSymbols.jsx';
import { symbolReferences, participantSymbolGroups, redesignCandidateNotes, cadenceReplacementReferences, replacedSymbolRefs, uiSymbolReferences, participantSymbolReferences, literalSymbolReferences, redesignCandidateReferences, filteredUiSymbolReferences, filteredLiteralSymbolReferences, cadenceIconLabels, cadenceIconReferences, usedCadenceIconNames, unusedCadenceIconReferences, cadenceStatusLabels, cadenceAuditSummary, cadenceVariantNotes } from './styleReferenceData.js';
export { symbolReferences } from './styleReferenceData.js';


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
      <article className="style-reference-tutorial-surface"><ReferenceTag>SURF-07</ReferenceTag><SceneTutorial step={1} onNext={() => {}} onAddParticipant={() => {}} onStartScene={() => {}} onFinish={() => {}} /></article>
    </div>
  );
}

function ButtonSamples() {
  return (
    <div className="style-reference-grid">
      <Sample refId="BTN-01" title="Actions principales"><button type="button" className="primary">Action principale</button><button type="button" className="primary next-round">Tour suivant</button><button type="button" className="primary blocked">Action bloquée</button></Sample>
      <Sample refId="BTN-02" title="Actions secondaires"><button type="button" className="small-btn">Secondaire</button><button type="button" className="small-btn suggested">Suggérée</button><button type="button" className="small-btn" disabled>Désactivée</button></Sample>
      <Sample refId="BTN-03" title="Actions dangereuses"><button type="button" className="danger-btn">Supprimer</button><button type="button" className="small-btn subtle-danger" aria-label="Supprimer"><IconeCadence name="remove" /></button></Sample>
      <Sample refId="BTN-04" title="Boutons icône"><button type="button" className="icon-btn" aria-label="Fermer"><IconeCadence name="close" /></button><button type="button" className="turn-btn compact" aria-label="Action précédente"><IconeCadence name="nextMedium" className="reverse" /></button><button type="button" className="turn-btn compact next-round" aria-label="Nouveau round"><IconeCadence name="nextSoft" /></button></Sample>
      <Sample refId="BTN-05" title="Choix"><button type="button" className="choice">Choix</button><button type="button" className="choice selected">Sélectionné</button></Sample>
      <Sample refId="BTN-06" title="Contrôles compacts"><div className="box-action-toggle"><button type="button" className="active" aria-label="Ajouter">{uiSymbols.add}</button><button type="button" aria-label="Retirer">{uiSymbols.subtract}</button></div><div className="compact-arrows"><button type="button" className="small-btn" aria-label="Monter"><IconeCadence name="nextStrong" className="up" /></button><button type="button" className="small-btn" aria-label="Descendre"><IconeCadence name="nextStrong" className="down" /></button></div></Sample>
      <Sample refId="BTN-07" title="Mode souple multi-actions"><div className="flexible-action-row has-undo style-reference-flex-actions"><button type="button" className="turn-btn compact previous-turn available flexible-play undo-played" aria-label="Annuler l’action" style={{ '--extra-action-count': 1 }}><span className="flexible-action-icon-stack reverse" style={{ '--extra-action-count': 1 }}><IconeCadence name="nextMedium" className="flexible-action-icon reverse" /><IconeCadence name="extraAction" className="flexible-action-icon flexible-extra-action reverse" /></span></button><button type="button" className="primary flexible-play play-action" aria-label="Action suivante" style={{ '--extra-action-count': 3 }}><span className="flexible-action-icon-stack" style={{ '--extra-action-count': 3 }}><IconeCadence name="nextMedium" className="flexible-action-icon" />{[0, 1, 2].map((index) => <IconeCadence key={index} name="extraAction" className="flexible-action-icon flexible-extra-action" />)}</span></button></div></Sample>
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
      <Sample refId="FORM-06" title="Portée des actions multiples"><div className="advanced-radio-list"><label className="advanced-radio"><input type="radio" name="style-reference-multiple-scope" /><span><strong>Tous les participants</strong><small>Tous les Types peuvent recevoir plusieurs créneaux.</small></span></label><label className="advanced-radio selected"><input type="radio" name="style-reference-multiple-scope" defaultChecked /><span><strong>Actions multiples pour les Élites</strong><small>Élite et Types hérités uniquement.</small></span></label></div></Sample>
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
      <Sample refId="BADGE-02" title="États"><span className="status permanent">Permanent {uiGlyphs.infinity}</span><span className="status temporary">Temporaire <span className="status-duration"><IconeCadence name="timer" className="status-duration-icon" /> 2</span></span><span className="status loop">Boucle {uiGlyphs.loop}</span></Sample>
      <Sample refId="BADGE-03" title="Seuils"><span className="threshold-chip threshold-neutral">Neutre</span><span className="threshold-chip threshold-warning">Alerte</span><span className="threshold-chip threshold-danger">Danger</span></Sample>
      <Sample refId="BADGE-04" title="Résumé RandomSystem"><div className="rs-kit-summary"><span>2 éléments aléatoires</span><span>3 lancers</span><span>Initiative numérique</span></div></Sample>
    </div>
  );
}

const trackerWorkbenchColors = ['slate', 'red', 'amber', 'emerald', 'blue', 'violet', 'rose'];

function demoTracker(type = 'bar') {
  const tracker = newTracker(type);
  if (type === 'bar') return { ...tracker, name: 'Vitalité', current: 12, max: 20, thresholds: [{ value: 5, label: 'Blessé', color: 'red', operator: 'lte' }] };
  if (type === 'points') return { ...tracker, name: 'Effort', current: 3, max: 6, limitMode: 'loop', cycles: 1, thresholds: [{ value: 5, label: 'Haut', color: 'warning', operator: 'gte' }] };
  if (type === 'clock') return { ...tracker, name: 'Rituel', current: 4, max: 6, limitMode: 'manual', thresholds: [{ value: 6, label: 'Résoudre', color: 'danger', operator: 'gte' }] };
  if (type === 'boxes') return { ...tracker, name: 'Blessures', fillLevels: 2, levelLabels: ['Léger', 'Grave'], levelVisuals: [2, 5] };
  return { ...tracker, name: 'Élan', current: 4, step: 1, counterSize: 'compact', counters: [{ id: 'secondary', label: 'Charge', current: 2, size: 'compact' }] };
}

function demoSceneCounter(mode = 'clock') {
  const base = {
    enabled: true,
    name: mode === 'timer' ? 'Durée restante' : mode === 'stopwatch' ? 'Temps écoulé' : mode === 'counter' ? 'Tension' : 'Menace',
    mode,
    current: mode === 'counter' ? 4 : 5,
    max: mode === 'timer' ? 180 : 8,
    min: 0,
    step: 1,
    direction: 'progression',
    limitMode: mode === 'timer' ? 'overflow' : 'clamp',
    trigger: 'manual',
    auto: false,
    running: false,
    elapsedMs: mode === 'stopwatch' ? 42000 : 0,
    startedAt: null,
    thresholds: [{ basis: 'fixed', value: mode === 'timer' ? 30 : 6, label: 'Alerte', color: 'warning', sound: 'none' }],
  };
  return base;
}

function StyleReferenceTrackerWorkbench() {
  const [trackerType, setTrackerType] = useState('bar');
  const [trackerColor, setTrackerColor] = useState('blue');
  const [tracker, setTracker] = useState(() => demoTracker('bar'));
  const [sceneCounter, setSceneCounter] = useState(() => demoSceneCounter('clock'));
  const [sceneStatus, setSceneStatus] = useState({
    id: 'style-scene-status',
    name: 'Brume épaisse',
    duration: 2,
    color: 'blue',
    advanceOn: 'round',
    limited: true,
    inactive: false,
    loop: false,
  });

  const changerTracker = (suivant) => {
    setTrackerType(suivant.type || trackerType);
    setTracker(suivant);
  };
  const modifierCompteurScene = (delta) => setSceneCounter((current) => ({ ...current, current: Number(current.current || 0) + delta }));
  const basculerTemps = () => setSceneCounter((current) => ({ ...current, running: !current.running, startedAt: current.running ? null : Date.now() }));

  return (
    <div className="style-reference-tracker-workbench">
      <section className="style-reference-tracker-controls">
        <div>
          <ReferenceTag>TRACK-LAB-01</ReferenceTag>
          <h3>Suivi personnage réel</h3>
          <p className="muted compact-help">Même éditeur que dans la fenêtre “modifier”, avec aperçu live du composant de fiche.</p>
        </div>
        <div className="style-reference-editor-layout">
          <div className="style-reference-inline-editor">
            <EditeurSuivi
              suivi={tracker}
              onChange={changerTracker}
              onDuplicate={() => setTracker((current) => ({ ...current, id: `${current.id || 'style-tracker'}-copy`, name: `${current.name || 'Suivi'} copie` }))}
              onDelete={() => setTracker(demoTracker(trackerType))}
              allowActivationAutomation
            />
          </div>
          <div className="style-reference-live-column">
            <div className="style-reference-control-grid compact">
              <button className="small-btn" type="button" onClick={() => setTracker(demoTracker(trackerType))}>Réinitialiser le cas démo</button>
              <label className="field">Couleur participant / aperçu
                <select value={trackerColor} onChange={(event) => setTrackerColor(event.target.value)}>
                  {trackerWorkbenchColors.map((color) => <option value={color} key={color}>{colorNames[color] || color}</option>)}
                </select>
              </label>
            </div>
            <div className="style-reference-live-preview">
              <Suivi suivi={tracker} couleur={trackerColor} onModifier={changerTracker} onSupprimer={() => setTracker(demoTracker(trackerType))} />
            </div>
          </div>
        </div>
      </section>

      <section className="style-reference-tracker-controls">
        <div>
          <ReferenceTag>TRACK-LAB-02</ReferenceTag>
          <h3>Suivi de scène réel</h3>
          <p className="muted compact-help">Même éditeur que la fenêtre du compteur global, intégré inline pour tester tous les modes et seuils.</p>
        </div>
        <div className="style-reference-editor-layout">
          <div className="style-reference-inline-editor">
            <EditeurCompteurGlobal
              compteur={sceneCounter}
              onModifier={setSceneCounter}
              onChanger={modifierCompteurScene}
              onFermer={() => {}}
              afficherValidation={false}
            />
          </div>
          <div className="style-reference-live-column">
            <div className="style-reference-control-grid compact">
              <button className="small-btn" type="button" onClick={() => setSceneCounter(demoSceneCounter(sceneCounter.mode || 'clock'))}>Réinitialiser le cas démo</button>
            </div>
            <div className="style-reference-live-preview">
              <CompteurGlobal compteur={sceneCounter} onChanger={modifierCompteurScene} onToggleTemps={basculerTemps} animationTick={0} />
            </div>
          </div>
        </div>
      </section>

      <section className="style-reference-tracker-controls">
        <div>
          <ReferenceTag>TRACK-LAB-03</ReferenceTag>
          <h3>État de scène</h3>
          <p className="muted compact-help">Aperçu des états de scène, utile pour vérifier teinte, durée, boucle et impact.</p>
        </div>
        <div className="style-reference-control-grid">
          <label className="field">Couleur
            <select value={sceneStatus.color || ''} onChange={(event) => setSceneStatus((current) => ({ ...current, color: event.target.value }))}>
              <option value="">Aucune</option>
              {trackerWorkbenchColors.map((color) => <option value={color} key={color}>{colorNames[color] || color}</option>)}
            </select>
          </label>
          <label className="field">Nom<input value={sceneStatus.name} onChange={(event) => setSceneStatus((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="field">Durée<input type="number" min="0" value={sceneStatus.duration ?? ''} onChange={(event) => setSceneStatus((current) => ({ ...current, duration: event.target.value === '' ? null : Number(event.target.value) || 0 }))} /></label>
          <label className={`global-switch ${sceneStatus.loop ? 'active' : ''}`}><span>Boucle</span><input type="checkbox" checked={!!sceneStatus.loop} onChange={(event) => setSceneStatus((current) => ({ ...current, loop: event.target.checked }))} /></label>
          <label className={`global-switch ${sceneStatus.limited ? 'active' : ''}`}><span>Limité</span><input type="checkbox" checked={!!sceneStatus.limited} onChange={(event) => setSceneStatus((current) => ({ ...current, limited: event.target.checked, inactive: event.target.checked ? false : current.inactive }))} /></label>
          <label className={`global-switch ${sceneStatus.inactive ? 'active' : ''}`}><span>Inactif</span><input type="checkbox" checked={!!sceneStatus.inactive} onChange={(event) => setSceneStatus((current) => ({ ...current, inactive: event.target.checked, limited: event.target.checked ? false : current.limited }))} /></label>
        </div>
        <div className="style-reference-live-preview statuses">
          <EtiquetteEtat etat={sceneStatus} onModifier={() => {}} onRetirer={() => setSceneStatus((current) => ({ ...current, expired: !current.expired }))} />
        </div>
      </section>
    </div>
  );
}

function TrackerSamples() {
  return (
    <>
      <StyleReferenceTrackerWorkbench />
      <div className="style-reference-grid">
        <Sample refId="TRACK-01" title="Barre"><div className="controls"><button type="button">{uiSymbols.subtract}</button><div className="bar-bg"><div className="bar-fill" style={{ width: '62%' }} /></div><button type="button">{uiSymbols.add}</button></div></Sample>
        <Sample refId="TRACK-02" title="Points"><div className="dots"><button type="button" className="dot on" aria-label="Point actif 1" /><button type="button" className="dot on" aria-label="Point actif 2" /><button type="button" className="dot" aria-label="Point vide 3" /><button type="button" className="dot" aria-label="Point vide 4" /></div></Sample>
        <Sample refId="TRACK-03" title="Horloges"><button type="button" className="clock-face" style={{ '--clock-progress': '62%' }}><span>5</span><small>/ 8</small></button><button type="button" className="clock-face warning" style={{ '--clock-progress': '75%' }}><span>6</span><small>/ 8</small></button></Sample>
        <Sample refId="TRACK-04" title="Cases, du vide au plein"><div className="boxes"><button type="button" className="box mark-0" aria-label="Case vide" /><button type="button" className="box mark-1" aria-label="Case niveau 1" /><button type="button" className="box mark-2" aria-label="Case niveau 2" /><button type="button" className="box mark-3" aria-label="Case niveau 3" /><button type="button" className="box mark-4" aria-label="Case niveau 4" /><button type="button" className="box mark-5 full" aria-label="Case pleine" /></div></Sample>
        <Sample refId="TRACK-05" title="Compteur"><div className="counter-unit counter-size-compact"><button type="button" className="counter-edge">{uiSymbols.subtract}</button><button type="button" className="counter-tile"><span>Élan</span><strong>4</strong></button><button type="button" className="counter-edge">{uiSymbols.add}</button></div></Sample>
      </div>
    </>
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

export function StyleReferencePage({ onBack, themeState, onThemeModeChange }) {
  return (
    <div className="style-reference-page">
      <header className="style-reference-header">
        <div>
          <span className="style-reference-eyebrow">{t('styleReference.eyebrow')}</span>
          <h1>{t('styleReference.title')}</h1>
          <p className="muted">{t('styleReference.help')}</p>
        </div>
        <div className="style-reference-sticky-actions">
          {themeState && onThemeModeChange && <ThemeModeToggle themeState={themeState} onThemeModeChange={onThemeModeChange} ariaLabel={t('hub.themeToggle')} />}
          <button type="button" className="small-btn" onClick={onBack}><span aria-hidden="true">{uiSymbols.randomBack}</span> {t('styleReference.back')}</button>
        </div>
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
