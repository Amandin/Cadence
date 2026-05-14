import { useRef, useState } from 'react';
import { APP_VERSION, defaultCategoryOrder, defaultEqualityRule, defaultPhaseDecrement, defaultPhaseRerollEachRound, defaultTemporalityMode, equalityRuleDescriptions, equalityRuleLabels, equalityRules, temporalityDescriptions, temporalityLabels, temporalityModes } from '../../constants.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function LogoMenu({ sombre }) {
  const logo = sombre ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';

  return (
    <div className="menu-brand">
      <img src={logo} alt="Cadence" />
      <div>
        <strong>Cadence</strong>
        <span className="muted">Initiative & scènes</span>
      </div>
    </div>
  );
}

function LigneVersionEtTheme({ sombre, onChangerTheme }) {
  return (
    <div className="menu-topline">
      <span className="version-chip">v{APP_VERSION}</span>
      <button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label="Basculer thème clair ou sombre">
        <span>☀</span>
        <span>☾</span>
        <i />
      </button>
    </div>
  );
}

function ChampNomCampagne({ nom, onRenommer }) {
  const [valeur, setValeur] = useState(nom || '');

  return (
    <label className="field compact-campaign-name">
      Nom de campagne
      <input
        type="text"
        value={valeur}
        placeholder="Campagne Cadence"
        onChange={(event) => setValeur(event.target.value)}
        onBlur={() => onRenommer(valeur)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </label>
  );
}

function ListeScenes({ scenes, onChoisirScene, onFermer }) {
  return (
    <>
      <h3>Scènes</h3>
      <div className="stack">
        {scenes.map((scene, index) => (
          <button className="small-btn" key={scene.id} onClick={() => { onChoisirScene(index); onFermer(); }}>
            {scene.title} · R{scene.round}
          </button>
        ))}
      </div>
    </>
  );
}

function OptionsCompteurScene({ compteur, onModifier }) {
  const courant = compteur || { enabled: false, name: 'Menace', mode: 'clock', current: 0, max: 10, auto: false };

  return (
    <div className="scene-options compact-options">
      <div className="compact-option-title">
        <h3>Compteur de scène</h3>
        <button className={`theme-toggle mini-switch ${courant.enabled ? 'dark-on' : 'light-on'}`} onClick={() => onModifier({ ...courant, enabled: !courant.enabled })} aria-label="Activer ou désactiver le compteur de scène">
          <span>○</span>
          <span>●</span>
          <i />
        </button>
      </div>
      <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>Tape l’horloge dans l’entête pour la configurer.</p>
    </div>
  );
}

function OptionsTemporalite({ temporalite = defaultTemporalityMode, onModifier }) {
  return (
    <div className="scene-options compact-options advanced-rule-block">
      <h3>Temporalité</h3>
      <p className="muted compact-help">Choisit comment le tour actif est désigné.</p>
      <div className="advanced-radio-list">
        {Object.values(temporalityModes).map((mode) => (
          <label className={`advanced-radio ${temporalite === mode ? 'selected' : ''}`} key={mode}>
            <input type="radio" name="temporality-mode" value={mode} checked={temporalite === mode} onChange={(event) => onModifier(event.target.value)} />
            <span><strong>{temporalityLabels[mode]}</strong><small>{temporalityDescriptions[mode]}</small></span>
          </label>
        ))}
      </div>
    </div>
  );
}

function OptionsPhases({ decrement = defaultPhaseDecrement, rerollEachRound = defaultPhaseRerollEachRound, onModifierDecrement, onModifierRelance }) {
  return (
    <div className="scene-options compact-options advanced-rule-block phase-options">
      <h3>Phases</h3>
      <p className="muted compact-help">Réglages du mode à phases d’initiative.</p>
      <label className="field">
        Décrément
        <input type="number" min="1" step="1" value={decrement || defaultPhaseDecrement} onChange={(event) => onModifierDecrement(event.target.value)} />
      </label>
      <div className="advanced-radio-list">
        <label className={`advanced-radio ${!rerollEachRound ? 'selected' : ''}`}>
          <input type="radio" name="phase-round-init" checked={!rerollEachRound} onChange={() => onModifierRelance(false)} />
          <span><strong>Reprendre les anciennes initiatives</strong><small>Au nouveau round, Cadence repart en phase 1 avec les mêmes valeurs.</small></span>
        </label>
        <label className={`advanced-radio ${rerollEachRound ? 'selected' : ''}`}>
          <input type="radio" name="phase-round-init" checked={rerollEachRound} onChange={() => onModifierRelance(true)} />
          <span><strong>Relancer l’initiative</strong><small>Au nouveau round, Cadence ouvre la fenêtre de saisie des initiatives.</small></span>
        </label>
      </div>
    </div>
  );
}

function OptionsEgalites({ equalityRule = defaultEqualityRule, onModifier }) {
  return (
    <div className="scene-options compact-options advanced-rule-block">
      <h3>Synchronisation</h3>
      <p className="muted compact-help">Quand deux éléments partagent-ils vraiment le même tour ?</p>
      <div className="advanced-radio-list">
        {Object.values(equalityRules).map((rule) => (
          <label className={`advanced-radio ${equalityRule === rule ? 'selected' : ''}`} key={rule}>
            <input type="radio" name="equality-rule" value={rule} checked={equalityRule === rule} onChange={(event) => onModifier(event.target.value)} />
            <span><strong>{equalityRuleLabels[rule]}</strong><small>{equalityRuleDescriptions[rule]}</small></span>
          </label>
        ))}
      </div>
    </div>
  );
}

function OptionsOrdreCategories({ order = defaultCategoryOrder, onModifier }) {
  const monter = (index) => {
    if (index <= 0) return;
    const suivant = [...order];
    [suivant[index - 1], suivant[index]] = [suivant[index], suivant[index - 1]];
    onModifier(suivant);
  };

  const descendre = (index) => {
    if (index >= order.length - 1) return;
    const suivant = [...order];
    [suivant[index + 1], suivant[index]] = [suivant[index], suivant[index + 1]];
    onModifier(suivant);
  };

  return (
    <div className="scene-options compact-options advanced-rule-block">
      <h3>Priorités</h3>
      <p className="muted compact-help">Ordre utilisé quand le type départage encore les égalités.</p>
      <div className="stack compact-category-order">
        {order.map((categorie, index) => (
          <div className="restore-row discreet" key={categorie}>
            <strong>{categorie}</strong>
            <div className="compact-arrows">
              <button className="small-btn" onClick={() => monter(index)} disabled={index <= 0}>↑</button>
              <button className="small-btn" onClick={() => descendre(index)} disabled={index >= order.length - 1}>↓</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FenetreReglesAvancees({ scene, onFermer, onUpdateCategoryOrder, onUpdateEqualityRule, onUpdateTemporality, onUpdatePhaseDecrement, onUpdatePhaseRerollEachRound }) {
  return (
    <Fenetre title="Règles avancées" onClose={onFermer}>
      <div className="advanced-rules-stack">
        <OptionsTemporalite temporalite={scene?.temporalite || defaultTemporalityMode} onModifier={onUpdateTemporality} />
        {scene?.temporalite === temporalityModes.PHASES && <OptionsPhases decrement={scene?.phaseDecrement || defaultPhaseDecrement} rerollEachRound={scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound} onModifierDecrement={onUpdatePhaseDecrement} onModifierRelance={onUpdatePhaseRerollEachRound} />}
        <OptionsEgalites equalityRule={scene?.equalityRule || defaultEqualityRule} onModifier={onUpdateEqualityRule} />
        <OptionsOrdreCategories order={scene?.categoryOrder || defaultCategoryOrder} onModifier={onUpdateCategoryOrder} />
      </div>
    </Fenetre>
  );
}

function ActionsScene({ onAjouterParticipant, onNouvelleScene, onSaisirInitiatives, onReglesAvancees }) {
  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <button className="primary" onClick={onAjouterParticipant}>Ajouter un personnage</button>
      <button className="small-btn" onClick={onSaisirInitiatives}>Saisir les initiatives</button>
      <button className="small-btn" onClick={onNouvelleScene}>Nouvelle scène</button>
      <button className="small-btn" onClick={onReglesAvancees}>Règles avancées</button>
    </div>
  );
}

function ActionsSauvegarde({ onExporter, onImporter, onReinitialiser }) {
  const importInputRef = useRef(null);
  const choisirFichier = () => importInputRef.current?.click();
  const importerFichier = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onImporter(file);
  };

  return (
    <>
      <h3>Sauvegarde</h3>
      <div className="grid2">
        <button className="primary" onClick={onExporter}>Exporter</button>
        <button className="small-btn" onClick={choisirFichier}>Importer</button>
        <input ref={importInputRef} type="file" accept=".cad,.json,application/json" style={{ display: 'none' }} onChange={importerFichier} />
      </div>
      <p className="muted compact-help" style={{ marginTop: 6 }}>L’export crée un fichier .cad. Les anciens exports .json restent importables s’ils viennent de Cadence.</p>
      <button className="danger-btn" style={{ marginTop: 8, width: '100%' }} onClick={onReinitialiser}>Réinitialiser la démo</button>
    </>
  );
}

function RestaurationScene({ points, pointActif, onChoisirPoint, onRestaurer }) {
  if (points.length === 0) return null;

  return (
    <div className="restore-row discreet">
      <label>Restaurer</label>
      <select value={pointActif} onChange={(event) => onChoisirPoint(event.target.value)}>
        {points.map((point) => <option key={point.id} value={point.id}>{point.title}</option>)}
      </select>
      <button className="small-btn" disabled={!pointActif} onClick={() => onRestaurer(pointActif)}>OK</button>
    </div>
  );
}

export function MenuPrincipal({ campaignName, scenes, scene, restorePoints = [], onRestore, onClose, setSceneIndex, dark, setDark, onRenameCampaign, onAddParticipant, onNewScene, onExport, onImport, onReset, onGlobalTracker, onOpenAdvancedRules, onOpenInitiativeRoller }) {
  const pointsRestauration = [...restorePoints].sort((a, b) => a.round - b.round);
  const [pointRestaurationId, setPointRestaurationId] = useState(pointsRestauration.at(-1)?.id || '');

  return (
    <Fenetre title="Menu" onClose={onClose}>
      <LogoMenu sombre={dark} />
      <LigneVersionEtTheme sombre={dark} onChangerTheme={setDark} />
      <ChampNomCampagne nom={campaignName} onRenommer={onRenameCampaign} />
      <ListeScenes scenes={scenes} onChoisirScene={setSceneIndex} onFermer={onClose} />
      <OptionsCompteurScene compteur={scene?.globalTracker} onModifier={onGlobalTracker} />
      <ActionsScene onAjouterParticipant={onAddParticipant} onSaisirInitiatives={onOpenInitiativeRoller} onNouvelleScene={onNewScene} onReglesAvancees={onOpenAdvancedRules} />
      <ActionsSauvegarde onExporter={onExport} onImporter={onImport} onReinitialiser={onReset} />
      <RestaurationScene points={pointsRestauration} pointActif={pointRestaurationId} onChoisirPoint={setPointRestaurationId} onRestaurer={onRestore} />
    </Fenetre>
  );
}
