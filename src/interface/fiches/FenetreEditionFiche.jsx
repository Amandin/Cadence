import { useEffect, useMemo, useState } from 'react';
import { colorNames, defaultPhaseCount, participantKinds, phaseActionModes, tacticalRoles, trackerTypeLabels } from '../../constants.js';
import { normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { boxBlocks, boxVisualRank, clone, colors, cycleBoxMark, isBoxesTracker, isNumericTracker, isPointsTracker, isVisible, newTracker, resetTracker, sortBoxBlocks, symbols, thresholdValue, uid } from '../../logic.js';
import { instantiateTrackerCopy, instantiateTrackerTemplate, numberedCopyInsertIndex, numberedCopyName } from '../../templates.js';
import { uiGlyphs, uiSymbols } from '../../uiAssets.js';
import { Fenetre, IconeSecret, MessageChangementTemplate } from '../commun/ComposantsCommuns.jsx';
import { FenetreConfirmationSuppression } from '../dialogues/FenetreConfirmationSuppression.jsx';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { IconeOeilMystiqueFerme, IconeOeilMystiqueOuvert } from '../icones/IconesOeilMystique.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';
import { EditeurPhasesParticipant } from '../initiative/EditeurPhasesParticipant.jsx';
import { thresholdColorOptions, thresholdColorStyles, thresholdOperatorOptions, trackerThresholdBasisOptions } from '../suivis/thresholdUi.js';
import { normaliserInfoRapide, normaliserInfosRapides } from './InfosRapides.jsx';
import { brouillonCreneauxAction, nombreOuDefaut, normaliserFiche, texteCreneauxAction } from './ficheEditionModel.js';
import { ChampNombre, EditeurCases, nouveauSuiviPourMode } from './EditeurCases.jsx';
import { activeDefinitions, exposedTokenContainers, tokenContainerIdFromResourceId, tokenContainerResourceId } from '../../random-system/definitionAccess.js';
import { randomSourceKinds } from '../../random-system/engine.js';
import { DefinitionForm } from '../../random-system/ui/UsePanel.jsx';

const customCharacterSymbolValue = '__custom-character-symbol__';

function FenetreConfigurationJetRapide({ info, definitions, containers = [], sources, onFermer, onValider }) {
  const [definitionId, setDefinitionId] = useState(info.quickRollDefinitionId || definitions[0]?.id || (containers[0] ? tokenContainerResourceId(containers[0].id) : ''));
  const [inputs, setInputs] = useState(() => ({ parameters: info.quickRollParameters || {}, options: info.quickRollOptions || {} }));
  const definition = definitions.find((item) => item.id === definitionId);
  const container = containers.find((item) => item.id === tokenContainerIdFromResourceId(definitionId));
  const hasResources = definitions.length > 0 || containers.length > 0;
  return <Fenetre title={t('sheet.quickInfo.rollConfigTitle')} onClose={onFermer}><div className="stack quick-roll-config-dialog">
    <p className="muted">{t('sheet.quickInfo.rollConfigHelp')}</p>
    {hasResources ? <><label className="field">{t('sheet.quickInfo.rollDefinition')}<select value={definitionId} onChange={(event) => { setDefinitionId(event.target.value); setInputs({ parameters: {}, options: {} }); }}>{definitions.length > 0 && <optgroup label={t('random.resource.rolls')}>{definitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>}{containers.length > 0 && <optgroup label={t('random.tokens.containers')}>{containers.map((item) => <option key={item.id} value={tokenContainerResourceId(item.id)}>{item.name}</option>)}</optgroup>}</select></label>{definition && <DefinitionForm key={definitionId} definition={definition} definitions={definitions} sources={sources} initialParameters={inputs.parameters} initialOptions={inputs.options} onInputsChange={setInputs} hideRun showHeader={false} />}{container && <p className="muted compact-help">{t('random.tokens.sheetLinkHelp', { name: container.name })}</p>}</> : <p className="muted">{t('sheet.quickInfo.rollUnavailable')}</p>}
    <div className="grid2"><button type="button" className="primary" disabled={!definitionId} onClick={() => onValider(definitionId, inputs)}>{t('common.validate')}</button><button type="button" className="small-btn" onClick={onFermer}>{t('common.cancel')}</button></div>
  </div></Fenetre>;
}

function EditeurInfosRapides({ stats = [], onChange, definitions = [], containers = [], sources = [] }) {
  const lignes = stats.length ? stats : [{ label: '', value: '', editable: false }];
  const [configurationIndex, setConfigurationIndex] = useState(null);
  const modifier = (index, patch) => onChange(lignes.map((info, position) => position === index ? { ...info, ...patch } : info));
  const supprimer = (index) => {
    const info = lignes[index];
    if (info?.editable) {
      modifier(index, { label: [info.label, info.value].filter(Boolean).join(' '), value: '', editable: false });
      return;
    }
    onChange(lignes.filter((_, position) => position !== index));
  };
  const ajouter = () => onChange([...lignes, { label: '', value: '', editable: false, quickRollEnabled: false, quickRollDefinitionId: '' }]);
  const changerTexte = (index, texte) => modifier(index, { label: texte, value: '', editable: false });
  const separerValeurFinale = (index) => {
    const info = lignes[index];
    if (!info || info.editable) return;
    const normalisee = normaliserInfoRapide(info.label);
    if (normalisee.editable) modifier(index, normalisee);
  };

  return <div className="stack quick-stats-editor">{lignes.map((info, index) => <div className={`quick-stat-row ${info.editable ? 'editable' : ''}`} key={index}>{info.editable ? <><input className="quick-stat-label-input" value={info.label} aria-label={`${t('sheet.quickInfo.label')} ${index + 1}`} placeholder={t('sheet.quickInfo.label')} onChange={(e) => modifier(index, { label: e.target.value })} /><input className="quick-stat-value-input" value={info.value} aria-label={`${t('dialogs.sceneIndicator.value')} ${index + 1}`} placeholder={t('dialogs.sceneIndicator.value')} onChange={(e) => modifier(index, { value: e.target.value })} /></> : <input value={info.label} aria-label={`${t('sheet.quickInfo.label')} ${index + 1}`} placeholder={t('sheet.quickInfo.placeholder')} onChange={(e) => changerTexte(index, e.target.value)} onBlur={() => separerValeurFinale(index)} />}<label className="quick-stat-roll-option"><input type="checkbox" checked={!!info.quickRollEnabled} disabled={!definitions.length && !containers.length} onChange={(event) => event.target.checked ? setConfigurationIndex(index) : modifier(index, { quickRollEnabled: false, quickRollDefinitionId: '' })} /> {t('sheet.quickInfo.roll')}</label>{info.quickRollEnabled && <button type="button" className="small-btn quick-stat-roll-config" onClick={() => setConfigurationIndex(index)}>{t('sheet.quickInfo.rollConfigure')}</button>}<button className="small-btn subtle-danger" onClick={() => supprimer(index)} disabled={lignes.length <= 1 && !info.label && !info.value} aria-label={`${t('common.delete')} ${t('sheet.quickInfo.title')} ${index + 1}`} title={`${t('common.delete')} ${t('sheet.quickInfo.title')} ${index + 1}`}><IconeCadence name="remove" /></button></div>)}<button className="small-btn" onClick={ajouter}>{t('sheet.quickInfo.add')}</button>{configurationIndex !== null && <FenetreConfigurationJetRapide info={lignes[configurationIndex]} definitions={definitions} containers={containers} sources={sources} onFermer={() => setConfigurationIndex(null)} onValider={(quickRollDefinitionId, rollInputs) => { modifier(configurationIndex, { quickRollEnabled: true, quickRollDefinitionId, quickRollParameters: rollInputs.parameters, quickRollOptions: rollInputs.options }); setConfigurationIndex(null); }} />}</div>;
}

function thresholdOutOfBounds(seuil, suivi, bounds = {}) {
  const valeur = thresholdValue(suivi, seuil);
  if (bounds.min !== null && bounds.min !== '' && bounds.min !== undefined && valeur < Number(bounds.min)) return true;
  if (bounds.max !== null && bounds.max !== '' && bounds.max !== undefined && valeur > Number(bounds.max)) return true;
  return false;
}

function EditeurSeuils({ suivi, onChange, field = 'thresholds', title, bounds = {} }) {
  const seuils = suivi[field]?.length ? suivi[field] : [];
  const choixCompteurs = suivi.type === 'number' ? [{ id: '__main', label: suivi.name || t('sheet.thresholds.primaryCounter') }, ...(suivi.counters || []).map((compteur) => ({ id: compteur.id, label: compteur.label || t('dialogs.sceneIndicator.counter') }))] : [];
  const seuilsBarre = suivi.type === 'bar' && field === 'thresholds';
  const titre = title || t('sheet.thresholds.text');
  const modifier = (index, patch) => onChange({ [field]: seuils.map((seuil, position) => position === index ? { ...seuil, ...patch } : seuil) });
  const ajouter = () => onChange({ [field]: [...seuils, { value: 0, label: '', color: 'neutral', operator: 'gte', counterId: choixCompteurs[0]?.id || '', basis: seuilsBarre ? 'fixed' : undefined }] });
  const supprimer = (index) => onChange({ [field]: seuils.filter((_, position) => position !== index) });

  return (
    <div className="threshold-editor">
      <div className="line-count-row">
        <label>{titre}</label>
      </div>
      {seuils.map((seuil, index) => {
        const horsLimites = thresholdOutOfBounds(seuil, suivi, bounds);
        return (
          <div className={`threshold-edit-row ${choixCompteurs.length ? 'has-target' : ''} ${seuilsBarre ? 'has-basis' : ''} ${horsLimites ? 'out-of-bounds' : ''}`} key={index}>
            <button className="small-btn subtle-danger threshold-delete" onClick={() => supprimer(index)} aria-label={`${t('common.delete')} ${titre} ${index + 1}`} title={`${t('common.delete')} ${titre} ${index + 1}`}><IconeCadence name="remove" /></button>
            <div className="threshold-numeric-row">
              {choixCompteurs.length > 0 && <select className="threshold-target-select" value={seuil.counterId || '__main'} onChange={(e) => modifier(index, { counterId: e.target.value })}>{choixCompteurs.map((compteur) => <option key={compteur.id} value={compteur.id}>{compteur.label}</option>)}</select>}
              <select className="threshold-operator-select" value={seuil.operator || 'gte'} onChange={(e) => modifier(index, { operator: e.target.value })}>{thresholdOperatorOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              {seuilsBarre && <select className="threshold-basis-select" value={seuil.basis || 'fixed'} onChange={(e) => modifier(index, { basis: e.target.value })}>{trackerThresholdBasisOptions.map(([value, labelKey]) => <option key={value} value={value}>{t(labelKey)}</option>)}</select>}
              <input className="threshold-value-input" type="number" inputMode="numeric" value={seuil.value ?? 0} aria-label={`${t('dialogs.sceneIndicator.value')} ${index + 1}`} onChange={(e) => modifier(index, { value: Number(e.target.value) })} />
            </div>
            <div className="threshold-label-row">
              <div className="threshold-label-stack">
                <input className="threshold-label-input" value={seuil.label || ''} aria-label={`${t('sheet.quickInfo.label')} ${index + 1}`} placeholder={t('trackers.global.thresholds.placeholder')} onChange={(e) => modifier(index, { label: e.target.value })} />
                {seuilsBarre && <span className="threshold-warning">{t('sheet.thresholds.targetValue', { value: thresholdValue(suivi, seuil) })}</span>}
                {!seuilsBarre && horsLimites && <span className="threshold-warning">{t('sheet.thresholds.outOfBounds')}</span>}
                {seuilsBarre && horsLimites && <span className="threshold-warning secondary-warning">{t('sheet.thresholds.outOfBounds')}</span>}
              </div>
              <select className={`threshold-color-select threshold-${seuil.color || 'neutral'}`} value={seuil.color || 'neutral'} onChange={(e) => modifier(index, { color: e.target.value })}>{thresholdColorOptions.map(([value, labelKey]) => <option key={value} value={value} style={thresholdColorStyles[value]}>{t(labelKey)}</option>)}</select>
            </div>
          </div>
        );
      })}
      <div className="threshold-add-row"><button className="small-btn" onClick={ajouter}>{t('trackers.global.thresholds.add')}</button></div>
    </div>
  );
}

function EditeurCompteursMultiples({ suivi, onChange }) {
  const secondaires = suivi.counters || [];
  const compteurs = [{ id: '__main', label: suivi.name || t('dialogs.sceneIndicator.counter'), current: suivi.current ?? 0, initial: suivi.initial ?? 0, min: suivi.min ?? '', max: suivi.max ?? '', size: suivi.counterSize || 'compact' }, ...secondaires];
  const modifier = (id, patch) => id === '__main'
    ? onChange({ ...('label' in patch ? { name: patch.label } : {}), ...('current' in patch ? { current: patch.current } : {}), ...('initial' in patch ? { initial: patch.initial } : {}), ...('min' in patch ? { min: patch.min } : {}), ...('max' in patch ? { max: patch.max } : {}), ...('size' in patch ? { counterSize: patch.size } : {}) })
    : onChange({ counters: secondaires.map((compteur) => compteur.id === id ? { ...compteur, ...patch } : compteur) });
  const ajouter = () => onChange({ counters: [...secondaires, { id: uid('counter'), label: `${t('dialogs.sceneIndicator.counter')} ${secondaires.length + 2}`, current: 0, initial: 0 }] });
  const supprimer = (id) => onChange({ counters: secondaires.filter((compteur) => compteur.id !== id) });

  return <div className="threshold-editor"><div className="line-count-row"><label>{t('sheet.counters.title')}</label><button className="small-btn" onClick={ajouter}>{t('sheet.counters.add')}</button></div><div className="counter-edit-grid">{compteurs.map((compteur) => <div className="counter-edit-tile" key={compteur.id}><input value={compteur.label || ''} placeholder={t('common.name')} onChange={(e) => modifier(compteur.id, { label: e.target.value })} /><div className="grid2"><ChampNombre label={t('sheet.counters.current')} valeur={compteur.current ?? 0} onChange={(valeur) => modifier(compteur.id, { current: valeur })} /><ChampNombre label={t('sheet.counters.initial')} valeur={compteur.initial ?? 0} onChange={(valeur) => modifier(compteur.id, { initial: valeur })} /></div><div className="grid2"><ChampNombre label={t('sheet.counters.min')} valeur={compteur.min ?? ''} placeholder="-" onChange={(valeur) => modifier(compteur.id, { min: valeur })} /><ChampNombre label={t('sheet.counters.max')} valeur={compteur.max ?? ''} placeholder="+" onChange={(valeur) => modifier(compteur.id, { max: valeur })} /></div><label className="field">{t('sheet.counters.size')}<select value={compteur.size || 'compact'} onChange={(e) => modifier(compteur.id, { size: e.target.value })}><option value="compact">{t('sheet.counters.size.compact')}</option><option value="normal">{t('sheet.counters.size.normal')}</option><option value="wide">{t('sheet.counters.size.wide')}</option></select></label>{compteur.id !== '__main' && <button className="small-btn subtle-danger" onClick={() => supprimer(compteur.id)}><IconeCadence name="remove" /></button>}</div>)}</div></div>;
}

function ToggleIconeSuivi({ suivi, onChange }) {
  return <div className="tracker-option-icons"><button className={`eye-toggle ${isVisible(suivi) ? 'active' : 'inactive'}`} onClick={() => onChange({ visible: suivi.visible === false })} title={isVisible(suivi) ? t('sheet.tracker.visible') : t('sheet.tracker.hidden')} type="button">{isVisible(suivi) ? <IconeOeilMystiqueOuvert /> : <IconeOeilMystiqueFerme />}</button><button className={`spy-toggle ${suivi.secret ? 'active' : ''}`} onClick={() => onChange({ secret: !suivi.secret })} title={t('sheet.tracker.secret')} type="button"><IconeSecret active={!!suivi.secret} /><b>{t('sheet.tracker.secret')}</b></button></div>;
}

function OptionsReset({ suivi, onChange, allowActivationAutomation = true }) {
  const rule = suivi.resetRule || {};
  const blocks = isBoxesTracker(suivi) ? boxBlocks(suivi) : [];
  const timingAuto = ['round', 'activation'].includes(suivi.autoReset) ? suivi.autoReset : (allowActivationAutomation ? 'activation' : 'round');
  const autoActif = suivi.autoReset === 'round' || suivi.autoReset === 'activation';
  const activationVerrouillee = !allowActivationAutomation && suivi.autoReset === 'activation';
  const defaultMode = suivi.resetDefaultMode || 'empty';
  const estCompteur = suivi.type === 'number';
  const estBarre = suivi.type === 'bar';
  const estPuces = isPointsTracker(suivi);
  const compteurs = estCompteur ? [{ id: '__main', label: suivi.name || 'Compteur', current: suivi.current ?? 0 }, ...(suivi.counters || [])] : [];
  const normaliserBlocks = (nextBlocks) => sortBoxBlocks({ ...suivi, blocks: nextBlocks }).blocks;
  const modifierInitialBox = (blockId, lineId, boxId) => onChange({
    blocks: normaliserBlocks(blocks.map((block) => block.id !== blockId ? block : {
      ...block,
      lines: block.lines.map((line) => line.id !== lineId ? line : {
        ...line,
        boxes: line.boxes.map((box) => box.id === boxId ? { ...box, initial: cycleBoxMark(box.initial, suivi.fillLevels || 1) } : box),
      }),
    })),
  });
  const patchInitialBoxes = (valeur) => ({
    blocks: normaliserBlocks(blocks.map((block) => ({
      ...block,
      lines: block.lines.map((line) => ({
        ...line,
        boxes: line.boxes.map((box) => ({ ...box, initial: valeur === 'current' ? box.mark : valeur })),
      })),
    }))),
  });
  const presetPatch = (choix) => {
    if (choix === 'current') return isBoxesTracker(suivi) ? patchInitialBoxes('current') : { initial: suivi.current ?? 0, cyclesInitial: suivi.cycles ?? suivi.cyclesInitial ?? 0 };
    if (choix === 'empty') return isBoxesTracker(suivi) ? patchInitialBoxes(0) : { initial: 0, cyclesInitial: 0 };
    return isBoxesTracker(suivi) ? patchInitialBoxes(Number(suivi.fillLevels || 1)) : { initial: suivi.max ?? suivi.current ?? 0 };
  };
  const modifierRegle = (patch) => onChange({ resetRule: { ...rule, ...patch } });
  const modifierRegleCompteur = (id, patch) => modifierRegle({ counterRules: { ...(rule.counterRules || {}), [id]: { ...((rule.counterRules || {})[id] || {}), ...patch } } });
  const modifierRegleBloc = (id, patch) => modifierRegle({ boxBlocks: { ...(rule.boxBlocks || {}), [id]: { ...((rule.boxBlocks || {})[id] || {}), ...patch } } });
  const changerAuto = (actif) => onChange({ autoReset: actif ? timingAuto : 'never', resetRule: { ...rule, mode: 'towardDefault' } });
  const changerTimingAuto = (valeur) => onChange({ autoReset: valeur });
  const switchAuto = <><label className={`reset-switch ${autoActif ? 'active' : ''}`}><span>{t('sheet.reset.autoAdvance')}</span><input type="checkbox" checked={autoActif} onChange={(e) => changerAuto(e.target.checked)} /></label>{autoActif && <div className="automation-timing-field"><span>{t('sheet.reset.when')}</span><div className="automation-timing-toggle" role="group" aria-label={t('sheet.reset.when')}><button className={timingAuto === 'round' ? 'active' : ''} type="button" onClick={() => changerTimingAuto('round')} aria-pressed={timingAuto === 'round'}>{t('sheet.reset.when.round')}</button><button className={timingAuto === 'activation' ? 'active' : ''} type="button" onClick={() => changerTimingAuto('activation')} aria-pressed={timingAuto === 'activation'} disabled={!allowActivationAutomation}>{t('sheet.reset.when.activation')}</button></div></div>}{activationVerrouillee && <p className="rule-option-note">{t('sheet.reset.flexibleActivationLocked')}</p>}</>;
  const switchPeutEtreFige = autoActif ? <label className={`reset-switch ${suivi.freezeAllowed ? 'active' : ''}`}><span>{t('sheet.reset.canFreeze')}</span><input type="checkbox" checked={!!suivi.freezeAllowed} onChange={(e) => onChange({ freezeAllowed: e.target.checked, ...(e.target.checked ? {} : { frozen: false }) })} /></label> : null;
  const libellesNiveaux = ['sheet.reset.level.light', 'sheet.reset.level.normal', 'sheet.reset.level.serious', 'sheet.reset.level.critical', 'sheet.reset.level.fatal'];
  const optionsNiveaux = Array.from({ length: Number(suivi.fillLevels || 1) }, (_, index) => ({ value: index + 1, label: suivi.levelLabels?.[index] || (libellesNiveaux[index] ? t(libellesNiveaux[index]) : `${t('sheet.reset.check')} ${index + 1}`) }));
  const appliquerModeDefautCases = (choix) => {
    if (choix === 'custom') return onChange({ resetDefaultMode: 'custom' });
    return onChange({ ...presetPatch(choix), resetDefaultMode: choix });
  };
  const rendreCasesInitiales = (block, line) => <div className="boxes reset-boxes-row">{line.boxes.map((box) => { const rank = boxVisualRank(box.initial, suivi); return <button key={box.id} className={`box mark-${rank} ${rank >= 5 ? 'full' : ''}`} onClick={() => modifierInitialBox(block.id, line.id, box.id)} />; })}</div>;
  const renduEtatDefautCases = defaultMode === 'custom' ? <div className="reset-box-preview grouped-boxes">{blocks.map((block) => {
    const ligneUnique = block.lines.length === 1;
    if (ligneUnique) {
      const line = block.lines[0];
      return <div className="box-group" key={block.id}><div className="box-row single-line"><div className="box-block-label inline">{block.label}</div>{rendreCasesInitiales(block, line)}</div></div>;
    }
    return <div className="box-group" key={block.id}><div className="box-block-label">{block.label}</div>{block.lines.map((line) => <div className="box-row" key={line.id}>{rendreCasesInitiales(block, line)}<span className="box-label right">{line.label}</span></div>)}</div>;
  })}</div> : null;

  if (estCompteur) return (
    <div className="reset-options">
      {switchAuto}
      {switchPeutEtreFige}
      {autoActif && <div className="counter-auto-grid">{compteurs.map((compteur) => {
        const regle = (rule.counterRules || {})[compteur.id] || {};
        return <div className="counter-auto-row" key={compteur.id}><strong>{compteur.label || t('sheet.reset.counterFallback')}</strong><ChampNombre label={t('sheet.reset.addValue')} valeur={regle.flat ?? 0} onChange={(valeur) => modifierRegleCompteur(compteur.id, { flat: valeur })} /><ChampNombre label="%" valeur={regle.percent ?? 0} onChange={(valeur) => modifierRegleCompteur(compteur.id, { percent: valeur })} /></div>;
      })}</div>}
    </div>
  );

  if (isBoxesTracker(suivi)) return (
    <div className="reset-options">
      <div className="reset-custom">
        <label className="field reset-default-select">{t('sheet.reset.defaultState')}<select value={defaultMode} onChange={(event) => appliquerModeDefautCases(event.target.value)}><option value="empty">{t('sheet.reset.default.empty')}</option><option value="full">{t('sheet.reset.default.full')}</option><option value="custom">{t('sheet.reset.default.custom')}</option></select></label>
        {renduEtatDefautCases}
      </div>
      {switchAuto}
      {switchPeutEtreFige}
      {autoActif && <div className="box-auto-grid">{blocks.map((block) => {
        const regle = (rule.boxBlocks || {})[block.id] || {};
        const maxLevel = regle.maxLevel ?? suivi.fillLevels ?? 1;
        return <div className="box-auto-row" key={block.id}><strong>{block.label || t('sheet.reset.blockFallback')}</strong><ChampNombre label={t('sheet.reset.boxes')} valeur={regle.amount ?? 1} onChange={(valeur) => modifierRegleBloc(block.id, { amount: valeur })} /><ChampNombre label={t('sheet.reset.step')} valeur={regle.levels ?? 1} onChange={(valeur) => modifierRegleBloc(block.id, { levels: valeur })} /><label className="field">{t('sheet.reset.maxCheck')}<select value={maxLevel} onChange={(e) => modifierRegleBloc(block.id, { maxLevel: Number(e.target.value) })}>{optionsNiveaux.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>;
      })}</div>}
    </div>
  );

  if (estBarre) return (
    <div className="reset-options">
      {switchAuto}
      {switchPeutEtreFige}
      {autoActif && <><div className="grid2"><ChampNombre label={t('sheet.reset.addValue')} valeur={rule.step ?? 0} onChange={(valeur) => modifierRegle({ step: valeur })} /><ChampNombre label="%" valeur={rule.percent ?? (rule.multiplier == null || rule.multiplier === '' ? 100 : Number(rule.multiplier) * 100)} onChange={(valeur) => modifierRegle({ percent: valeur })} /></div><label className="field">{t('sheet.reset.action')}<select value={rule.barAutoMode === 'always' && suivi.minAbsolute !== false && suivi.maxAbsolute !== false ? 'limit' : (rule.barAutoMode || 'limit')} onChange={(e) => modifierRegle({ barAutoMode: e.target.value })}><option value="default">{t('sheet.reset.action.default')}</option><option value="limit">{t('sheet.reset.action.limit')}</option>{(suivi.minAbsolute === false || suivi.maxAbsolute === false) && <option value="always">{t('sheet.reset.action.always')}</option>}</select></label><div className="grid2"><ChampNombre className="automation-disabled-field" label={t('sheet.reset.underflowRecovery')} valeur={rule.underflowRecoveryPercent ?? ''} placeholder={t('sheet.reset.noValue')} disabled={suivi.minAbsolute !== false} onChange={(valeur) => modifierRegle({ underflowRecoveryPercent: valeur, rounding: rule.rounding || 'floor' })} /><ChampNombre className="automation-disabled-field" label={t('sheet.reset.excessReduction')} valeur={rule.excessReductionPercent ?? ''} placeholder={t('sheet.reset.noValue')} disabled={suivi.maxAbsolute !== false} onChange={(valeur) => modifierRegle({ excessReductionPercent: valeur, rounding: rule.rounding || 'floor' })} /></div></>}
    </div>
  );

  if (estPuces) return (
    <div className="reset-options">
      {switchAuto}
      {switchPeutEtreFige}
      {autoActif && <>
        <label className="field">{t('sheet.reset.action')}<select value={rule.pointsAutoMode || 'default'} onChange={(e) => modifierRegle({ pointsAutoMode: e.target.value })}><option value="default">{t('sheet.points.autoAction.default')}</option><option value="increase">{t('sheet.points.autoAction.increase')}</option><option value="decrease">{t('sheet.points.autoAction.decrease')}</option></select></label>
        <div className={`points-auto-grid ${suivi.limitMode === 'loop' ? 'with-cycle-toggle' : ''}`}>
          <ChampNombre label={t('trackers.step.label')} valeur={rule.step ?? 1} onChange={(valeur) => modifierRegle({ step: valeur })} />
          {suivi.limitMode === 'loop'
            ? <label className="limit-switch-row"><span>{t('sheet.points.autoCounter')}</span><input type="checkbox" checked={rule.pointsAutoCycles !== false} onChange={(e) => modifierRegle({ pointsAutoCycles: e.target.checked })} /></label>
            : <div />}
        </div>
      </>}
    </div>
  );

  return (
    <div className="reset-options">
      {switchAuto}
      {switchPeutEtreFige}
    </div>
  );
}

function GroupeOptionsAvancees({ title, children }) {
  return <section className="advanced-option-group"><h4>{title}</h4>{children}</section>;
}

function LimitesBarre({ suivi, onChange }) {
  return (
    <div className="limit-switch-list">
      <label className="limit-switch-row"><span>{t('sheet.bar.clampMin')}</span><input type="checkbox" checked={suivi.minAbsolute !== false} onChange={(e) => onChange({ minAbsolute: e.target.checked })} /></label>
      <label className="limit-switch-row"><span>{t('sheet.bar.clampMax')}</span><input type="checkbox" checked={suivi.maxAbsolute !== false} onChange={(e) => onChange({ maxAbsolute: e.target.checked })} /></label>
    </div>
  );
}

function suiviAvecEtatDefautNumerique(suivi) {
  return ['bar', 'points'].includes(suivi.type);
}

function valeurActuelleSuivi(suivi) {
  if (!isNumericTracker(suivi) || isBoxesTracker(suivi)) return null;
  if (suivi.type === 'clock' && suivi.limitMode === 'increment') return `${suivi.current ?? 0} [${suivi.cycles ?? 0}]`;
  return suivi.current ?? 0;
}

function SelectEtatDefautNumerique({ suivi, onChange }) {
  const mode = ['empty', 'full'].includes(suivi.resetDefaultMode) ? suivi.resetDefaultMode : 'custom';
  const appliquer = (choix) => {
    if (choix === 'empty') {
      onChange({ initial: suivi.min ?? 0, resetDefaultMode: 'empty' });
      return;
    }
    if (choix === 'full') {
      onChange({ initial: suivi.max ?? suivi.current ?? 0, resetDefaultMode: 'full' });
      return;
    }
    onChange({ initial: suivi.initial ?? suivi.current ?? 0, resetDefaultMode: 'custom' });
  };

  return (
    <div className="field default-state-field">
      <span>{t('sheet.defaultState')}</span>
      <div className={`default-state-row ${mode === 'custom' ? 'custom' : ''}`}>
        <select value={mode} onChange={(event) => appliquer(event.target.value)}>
          <option value="empty">{t('sheet.defaultState.min')}</option>
          <option value="full">{t('sheet.defaultState.max')}</option>
          <option value="custom">{t('sheet.defaultState.custom')}</option>
        </select>
        {mode === 'custom' && <input type="number" inputMode="numeric" value={suivi.initial ?? 0} aria-label={t('sheet.reset.default.customValue')} onChange={(event) => onChange({ initial: event.target.value === '' ? '' : Number(event.target.value), resetDefaultMode: 'custom' })} />}
      </div>
    </div>
  );
}

function ChampsEtatDefautHorloge({ suivi, onChange }) {
  return (
    <div className="bar-main-fields">
      <div className="field default-state-fields">
        <span>{t('sheet.defaultState')}</span>
        {suivi.limitMode === 'increment'
          ? <div className="grid2"><ChampNombre label={t('sheet.clock.initialValue')} valeur={suivi.initial ?? 0} onChange={(valeur) => onChange({ initial: valeur })} /><ChampNombre label={t('sheet.clock.initialCounter')} valeur={suivi.cyclesInitial ?? 0} onChange={(valeur) => onChange({ cyclesInitial: valeur })} /></div>
          : <ChampNombre label={t('sheet.clock.initialValue')} valeur={suivi.initial ?? 0} onChange={(valeur) => onChange({ initial: valeur })} />}
      </div>
    </div>
  );
}

function OptionsParType({ suivi, onChange, allowActivationAutomation = true }) {
  if (suivi.type === 'number') return <><EditeurCompteursMultiples suivi={suivi} onChange={onChange} /><details className="advanced-options"><summary>{t('sheet.advancedOptions')}</summary><GroupeOptionsAvancees title={t('sheet.advanced.automatisms')}><OptionsReset suivi={suivi} onChange={onChange} allowActivationAutomation={allowActivationAutomation} /></GroupeOptionsAvancees><GroupeOptionsAvancees title={t('sheet.advanced.thresholds')}><EditeurSeuils suivi={suivi} onChange={onChange} /></GroupeOptionsAvancees></details></>;
  if (suivi.type === 'bar') return <details className="advanced-options"><summary>{t('sheet.advancedOptions')}</summary><GroupeOptionsAvancees title={t('sheet.advanced.bounds')}><LimitesBarre suivi={suivi} onChange={onChange} /></GroupeOptionsAvancees><GroupeOptionsAvancees title={t('sheet.advanced.automatisms')}><OptionsReset suivi={suivi} onChange={onChange} allowActivationAutomation={allowActivationAutomation} /></GroupeOptionsAvancees><GroupeOptionsAvancees title={t('sheet.advanced.thresholds')}><EditeurSeuils suivi={suivi} onChange={onChange} bounds={{ min: suivi.min ?? 0, max: suivi.max }} /></GroupeOptionsAvancees></details>;
  if (isPointsTracker(suivi)) return <><label className="field">{t('sheet.points.limit')}<select value={suivi.limitMode || 'clamp'} onChange={(e) => onChange({ limitMode: e.target.value })}><option value="clamp">{t('sheet.points.limit.clamp')}</option><option value="loop">{t('sheet.points.limit.loop')}</option></select></label>{suivi.limitMode === 'loop' && <><p className="muted tracker-help">{t('sheet.points.loopHelp')}</p><div className="grid2"><ChampNombre label={t('sheet.clock.initialCounter')} valeur={suivi.cyclesInitial ?? 0} onChange={(valeur) => onChange({ cyclesInitial: valeur })} /><ChampNombre label={t('sheet.points.currentCounter')} valeur={suivi.cycles ?? 0} onChange={(valeur) => onChange({ cycles: valeur })} /></div><div className="grid2"><ChampNombre label={t('sheet.points.minCounter')} valeur={suivi.cyclesMin ?? ''} placeholder={uiGlyphs.infinity} onChange={(valeur) => onChange({ cyclesMin: valeur })} /><ChampNombre label={t('sheet.points.maxCounter')} valeur={suivi.cyclesMax ?? ''} placeholder={uiGlyphs.infinity} onChange={(valeur) => onChange({ cyclesMax: valeur })} /></div></>}<details className="advanced-options"><summary>{t('sheet.advancedOptions')}</summary><GroupeOptionsAvancees title={t('sheet.advanced.automatisms')}><OptionsReset suivi={suivi} onChange={onChange} allowActivationAutomation={allowActivationAutomation} /></GroupeOptionsAvancees><GroupeOptionsAvancees title={t('sheet.advanced.thresholds')}><EditeurSeuils suivi={suivi} onChange={onChange} field="currentThresholds" title={t('sheet.thresholds.points')} bounds={{ min: suivi.min ?? 0, max: suivi.max }} />{suivi.limitMode === 'loop' && <EditeurSeuils suivi={suivi} onChange={onChange} field="totalThresholds" title={t('sheet.thresholds.totalCounter')} bounds={{ min: suivi.cyclesMin, max: suivi.cyclesMax }} />}</GroupeOptionsAvancees></details></>;
  if (suivi.type === 'clock') return <><div className="grid2"><label className="field">{t('sheet.clock.direction')}<select value={suivi.direction === 'countdown' ? 'countdown' : 'progression'} onChange={(e) => onChange({ direction: e.target.value })}><option value="progression">{t('sheet.clock.direction.ascending')}</option><option value="countdown">{t('sheet.clock.direction.descending')}</option></select></label><ChampNombre label={t('trackers.step.label')} valeur={suivi.step ?? 1} onChange={(valeur) => onChange({ step: valeur })} /></div><label className="field">{t('sheet.clock.endMode')}<select value={suivi.limitMode || 'manual'} onChange={(e) => onChange({ limitMode: e.target.value })}><option value="manual">{t('sheet.clock.endMode.manual')}</option><option value="increment">{t('sheet.clock.endMode.increment')}</option><option value="overflow">{t('sheet.clock.endMode.overflow')}</option></select></label><ChampsEtatDefautHorloge suivi={suivi} onChange={onChange} /><details className="advanced-options"><summary>{t('sheet.advancedOptions')}</summary><GroupeOptionsAvancees title={t('sheet.advanced.automatisms')}><OptionsReset suivi={suivi} onChange={onChange} allowActivationAutomation={allowActivationAutomation} /></GroupeOptionsAvancees><GroupeOptionsAvancees title={t('sheet.advanced.thresholds')}><EditeurSeuils suivi={suivi} onChange={onChange} field="currentThresholds" title={t('sheet.thresholds.clock')} bounds={{ min: 0, max: suivi.max }} />{suivi.limitMode === 'increment' && <><div className="grid2"><ChampNombre label={t('sheet.points.minCounter')} valeur={suivi.cyclesMin ?? ''} placeholder={uiGlyphs.infinity} onChange={(valeur) => onChange({ cyclesMin: valeur })} /><ChampNombre label={t('sheet.points.maxCounter')} valeur={suivi.cyclesMax ?? ''} placeholder={uiGlyphs.infinity} onChange={(valeur) => onChange({ cyclesMax: valeur })} /></div><EditeurSeuils suivi={suivi} onChange={onChange} field="totalThresholds" title={t('sheet.thresholds.counter')} bounds={{ min: suivi.cyclesMin, max: suivi.cyclesMax }} /></>}</GroupeOptionsAvancees></details></>;
  return null;
}

export function EditeurSuivi({ suivi, onChange, onDuplicate, onDelete, onSaveTemplate, allowActivationAutomation = true }) {
  const modifierSuivi = (valeur) => onChange({ ...suivi, ...valeur });
  const estCases = isBoxesTracker(suivi);
  const estNumerique = isNumericTracker(suivi);
  const valeurActuelle = valeurActuelleSuivi(suivi);
  const [templateMessage, setTemplateMessage] = useState('');
  const enregistrerTemplateSuivi = () => {
    const template = onSaveTemplate?.(suivi);
    if (!template) return;
    setTemplateMessage(t('templates.editor.saved', { name: template.name }));
  };

  return (
    <div className="tracker">
      <div className="tracker-edit-head">
        <div className="tracker-action-line">
          <ToggleIconeSuivi suivi={suivi} onChange={modifierSuivi} />
          <div className="tracker-action-buttons">
            {onSaveTemplate && (
              <button
                className="icon-btn tracker-template-save-btn"
                type="button"
                onClick={enregistrerTemplateSuivi}
                title={t('templates.editor.tracker.saveCurrent')}
                aria-label={t('templates.editor.tracker.saveCurrent')}
              >
                &#128190;
              </button>
            )}
            {onDuplicate && (
              <button
                className="icon-btn tracker-duplicate-btn"
                type="button"
                onClick={onDuplicate}
                title={t('sheet.tracker.duplicate')}
                aria-label={t('sheet.tracker.duplicateAria', { name: suivi.name || t('templates.fallback.tracker') })}
              >
                {uiGlyphs.duplicate}
              </button>
            )}
            <button className="danger-btn compact-danger tracker-delete-btn" onClick={onDelete} aria-label={t('common.delete')} title={t('common.delete')}><IconeCadence name="remove" /></button>
          </div>
        </div>
        <input value={suivi.name} onChange={(e) => modifierSuivi({ name: e.target.value })} aria-label={t('sheet.tracker.nameAria')} />
        <select value={suivi.type} aria-label={t('sheet.tracker.typeAria')} onChange={(e) => onChange({ ...nouveauSuiviPourMode(e.target.value, allowActivationAutomation), id: suivi.id, name: suivi.name })}>
          {Object.entries(trackerTypeLabels).map(([valeur, label]) => <option value={valeur} key={valeur}>{label}</option>)}
        </select>
      </div>
      <div className="sub-options-row">
        <button className="quick-reset-btn text" onClick={() => onChange(resetTracker(suivi, 'initial'))} title={t('sheet.tracker.resetTitle')}>{t('sheet.tracker.reset')}</button>
        {valeurActuelle !== null && <span className="threshold-warning tracker-current-value">{t('sheet.currentValue', { value: valeurActuelle })}</span>}
        {suivi.type === 'number' && <ChampNombre className="compact-step-field" label={t('trackers.step.label')} valeur={suivi.step ?? 1} onChange={(valeur) => modifierSuivi({ step: valeur })} />}
      </div>
      {templateMessage && <p className="export-feedback">{templateMessage}</p>}
      {suiviAvecEtatDefautNumerique(suivi) ? <div className="bar-main-fields"><SelectEtatDefautNumerique suivi={suivi} onChange={modifierSuivi} /><div className="grid2"><ChampNombre label={t('sheet.counters.min')} valeur={suivi.min ?? 0} onChange={(valeur) => modifierSuivi({ min: valeur })} /><ChampNombre label={t('dialogs.sceneIndicator.maximum')} valeur={suivi.max ?? 1} onChange={(valeur) => modifierSuivi({ max: valeur })} /></div></div> : estNumerique && suivi.type !== 'number' ? <div className="grid2">
        {estNumerique && suivi.type === 'clock' && <ChampNombre label={t('sheet.clock.segments')} valeur={suivi.max ?? 1} onChange={(valeur) => modifierSuivi({ max: valeur, min: 0 })} />}
        {estNumerique && suivi.type !== 'number' && suivi.type !== 'clock' && <ChampNombre label={t('dialogs.sceneIndicator.maximum')} valeur={suivi.max ?? 1} onChange={(valeur) => modifierSuivi({ max: valeur })} />}
      </div> : null}
      <OptionsParType suivi={suivi} onChange={modifierSuivi} allowActivationAutomation={allowActivationAutomation} />
      {estCases && <EditeurCases suivi={suivi} onChange={onChange} resetOptions={<OptionsReset suivi={suivi} onChange={modifierSuivi} allowActivationAutomation={allowActivationAutomation} />} />}
    </div>
  );
}

export function FenetreEditionFiche({ participant, initiativeTextOrder, phaseActionMode, phaseCount = defaultPhaseCount, multipleActionSlots = true, utiliserInitiative = true, initiativeBonusEnabled = true, allowActivationAutomation = true, categoryOrder = participantKinds, tiebreakerVisible = true, tiebreakerLabel = t('sheet.tiebreaker.default'), trackerTemplates = [], randomSystem = null, title = t('sheet.edit.defaultTitle'), templateCategory = '', templateCategories = [], saveTemplateVisible = true, deleteLabel = t('sheet.edit.deleteCharacter'), className = 'character-edit-sheet', templateSwitchRequest = null, onAnnulerChangementTemplate, onAbandonnerChangementTemplate, onValiderChangementTemplate, onClose, onSave, onDelete, onSaveTemplate, onSaveTrackerTemplate }) {
  multipleActionSlots = typeof multipleActionSlots === 'function' ? multipleActionSlots(participant) : multipleActionSlots;
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const modePhasesCochees = phaseActionMode === phaseActionModes.CHECKED;
  const typesDisponibles = [...new Set([...participantKinds, ...(categoryOrder || []), participant.kind].filter(Boolean))];
  const [brouillon, setBrouillon] = useState({ ...clone(participant), phaseActions: modePhasesCochees ? (Array.isArray(participant.phaseActions) ? participant.phaseActions : ['1']) : participant.phaseActions, _actionSlotsInput: texteCreneauxAction(participant), _actionSlotsDraft: multipleActionSlots ? brouillonCreneauxAction(participant) : brouillonCreneauxAction(participant).slice(0, 1), stats: normaliserInfosRapides(participant.stats || []) });
  const quickRollDefinitions = activeDefinitions(randomSystem?.state?.definitions || []);
  const quickRollContainers = exposedTokenContainers(randomSystem?.state?.tokenContainers || []);
  const quickRollSources = useMemo(() => (randomSystem?.state?.sources || []).filter((source) => source.kind !== randomSourceKinds.CARDS), [randomSystem?.state?.sources]);
  const [trackerTemplateId, setTrackerTemplateId] = useState(trackerTemplates[0]?.id || '');
  const [trackerPersonnaliseType, setTrackerPersonnaliseType] = useState('bar');
  const [trackerPersonnaliseNom, setTrackerPersonnaliseNom] = useState('');
  const [ajoutIndicateurOuvert, setAjoutIndicateurOuvert] = useState(false);
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const categoriesTemplateDisponibles = [...new Set([templateCategory, ...(templateCategories || [])].filter(Boolean))];
  const [categorieTemplate, setCategorieTemplate] = useState(templateCategory || categoriesTemplateDisponibles[0] || '');
  const symboleCourant = typeof brouillon.symbol === 'string' ? brouillon.symbol : '';
  const symbolePersonnalise = symboleCourant && !symbols.includes(symboleCourant);
  const valeurSelectSymbole = symbolePersonnalise ? customCharacterSymbolValue : (symboleCourant || symbols[0]);
  useEffect(() => {
    setCategorieTemplate(templateCategory || categoriesTemplateDisponibles[0] || '');
  }, [templateCategory]);
  const creneauxActionSource = Array.isArray(brouillon._actionSlotsDraft) && brouillon._actionSlotsDraft.length ? brouillon._actionSlotsDraft : brouillonCreneauxAction(brouillon);
  const creneauxAction = multipleActionSlots ? creneauxActionSource : creneauxActionSource.slice(0, 1);
  const selectionAjoutIndicateur = trackerTemplateId || trackerTemplates[0]?.id || 'custom';
  const ajoutIndicateurPersonnalise = selectionAjoutIndicateur === 'custom';
  const modifierCreneauAction = (index, valeur) => setBrouillon((courant) => ({
    ...courant,
    _actionSlotsDraft: (courant._actionSlotsDraft || brouillonCreneauxAction(courant)).map((slot, position) => position === index ? { ...slot, initiative: valeur } : slot),
  }));
  const ajouterCreneauAction = () => setBrouillon((courant) => {
    const slots = courant._actionSlotsDraft || brouillonCreneauxAction(courant);
    const dernier = slots.at(-1)?.initiative ?? courant.initiative ?? 0;
    return { ...courant, _actionSlotsDraft: [...slots, { id: uid('slot'), initiative: dernier }] };
  });
  const retirerCreneauAction = (index) => setBrouillon((courant) => {
    const slots = courant._actionSlotsDraft || brouillonCreneauxAction(courant);
    const suivants = slots.filter((_, position) => position !== index);
    return { ...courant, _actionSlotsDraft: suivants.length ? suivants : slots.slice(0, 1) };
  });
  const basculerActionsMultiples = (actif) => setBrouillon((courant) => {
    const slots = courant._actionSlotsDraft || brouillonCreneauxAction(courant);
    if (!actif) return { ...courant, _actionSlotsDraft: slots.slice(0, 1) };
    return { ...courant, _actionSlotsDraft: slots.length > 1 ? slots : [...slots, { id: uid('slot'), initiative: slots[0]?.initiative ?? courant.initiative ?? 0 }] };
  });
  const ajouterSuiviDepuisTemplate = () => {
    const template = trackerTemplates.find((item) => item.id === selectionAjoutIndicateur) || trackerTemplates[0];
    const suivi = instantiateTrackerTemplate(template);
    if (!suivi) return;
    const suiviCompatible = allowActivationAutomation || suivi.autoReset !== 'activation' ? suivi : { ...suivi, autoReset: 'never' };
    setBrouillon((courant) => ({ ...courant, trackers: [...(courant.trackers || []), suiviCompatible] }));
    setAjoutIndicateurOuvert(false);
  };
  const ajouterSuiviPersonnalise = () => {
    const nom = trackerPersonnaliseNom.trim();
    const suivi = nouveauSuiviPourMode(trackerPersonnaliseType, allowActivationAutomation);
    const suiviNomme = nom ? { ...suivi, name: nom } : suivi;
    setBrouillon((courant) => ({ ...courant, trackers: [...(courant.trackers || []), suiviNomme] }));
    setTrackerPersonnaliseNom('');
    setAjoutIndicateurOuvert(false);
  };
  const dupliquerSuivi = (id) => setBrouillon((courant) => {
    const suivis = courant.trackers || [];
    const index = suivis.findIndex((suivi) => suivi.id === id);
    if (index < 0) return courant;
    const source = suivis[index];
    const copie = instantiateTrackerCopy(source);
    if (!copie) return courant;
    const nom = numberedCopyName(suivis.map((suivi) => suivi.name), source.name, t('templates.fallback.tracker'));
    const insertionIndex = numberedCopyInsertIndex(suivis.map((suivi) => suivi.name), source.name, t('templates.fallback.tracker'));
    const suivisSuivants = [...suivis];
    suivisSuivants.splice(insertionIndex, 0, { ...copie, name: nom });
    return { ...courant, trackers: suivisSuivants };
  });
  const renduEditionMultiple = (entete, valider, enregistrerCommeTemplate) => (
    <>
      <Fenetre title={title} onClose={onClose} header={entete} className={className} outsideCloseMode="double-mouse">
        {templateSwitchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangementTemplate} onValider={() => onValiderChangementTemplate?.(normaliserFiche(brouillon, textConfig, { phaseActionMode: modePhasesCochees ? phaseActionModes.CHECKED : '', phaseCount, multipleActionSlots }), categorieTemplate)} onAbandonner={onAbandonnerChangementTemplate} />}
        <div className="grid2 character-identity-fields">
          <label className="field">{t('common.name')}<input value={brouillon.name} onChange={(e) => modifierChamp('name', e.target.value)} /></label>
          <label className="field">{t('sheet.type')}<select value={brouillon.kind} onChange={(e) => modifierChamp('kind', e.target.value)}>{typesDisponibles.map((type) => <option key={type}>{type}</option>)}</select></label>
        </div>
        <label className="field">{t('sheet.tacticalRole')}<select value={brouillon.tacticalRole || 'normal'} onChange={(e) => modifierChamp('tacticalRole', e.target.value)}>{tacticalRoles.map((role) => <option key={role} value={role}>{t(`sheet.tacticalRole.${role}`)}</option>)}</select></label>
        <label className="field">{t('sheet.description')}<textarea value={brouillon.description || ''} onChange={(e) => modifierChamp('description', e.target.value)} /></label>
        {utiliserInitiative && <div className="initiative-core-grid">
          <ChampInitiative label={t('sheet.initiative.primary')} valeur={creneauxAction[0]?.initiative ?? brouillon.initiative ?? 0} textConfig={textConfig} onChange={(valeur) => modifierCreneauAction(0, valeur)} />
          {initiativeBonusEnabled ? <ChampNombre className="initiative-bonus-field" label={t('sheet.initiative.bonus')} valeur={brouillon.initiativeBonus ?? 0} onChange={(valeur) => modifierChamp('initiativeBonus', valeur)} /> : <div />}
          {tiebreakerVisible ? <ChampNombre label={tiebreakerLabel} valeur={brouillon.departage} onChange={(valeur) => modifierChamp('departage', valeur)} /> : <div />}
        </div>}
        {multipleActionSlots && <div className="action-slots-editor">
          <label className="row"><input type="checkbox" checked={creneauxAction.length > 1} onChange={(e) => basculerActionsMultiples(e.target.checked)} /> {t('sheet.actions.multiple')}</label>
          {utiliserInitiative && creneauxAction.length > 1 && <div className="stack action-slot-list">
            {creneauxAction.slice(1).map((slot, index) => (
              <div className="initiative-action-row" key={slot.id || index}>
                <ChampInitiative label={t('sheet.initiative.extra', { index: index + 2 })} valeur={slot.initiative} textConfig={textConfig} onChange={(valeur) => modifierCreneauAction(index + 1, valeur)} />
                <button className="small-btn subtle-danger" onClick={() => retirerCreneauAction(index + 1)}><IconeCadence name="remove" /></button>
              </div>
            ))}
            <button className="small-btn" onClick={ajouterCreneauAction}>{t('sheet.actions.add')}</button>
          </div>}
          {!utiliserInitiative && creneauxAction.length > 1 && <div className="action-count-editor">
            <button className="small-btn" type="button" onClick={() => retirerCreneauAction(creneauxAction.length - 1)} aria-label={t('sheet.actions.removeAria')}>{uiSymbols.subtract}</button>
            <strong>{t('sheet.actions.count', { count: creneauxAction.length })}</strong>
            <button className="small-btn" type="button" onClick={ajouterCreneauAction} aria-label={t('sheet.actions.addAria')}>{uiSymbols.add}</button>
          </div>}
        </div>}
        {modePhasesCochees && <EditeurPhasesParticipant phaseActions={brouillon.phaseActions} phaseCount={phaseCount} onChange={(phaseActions) => modifierChamp('phaseActions', phaseActions)} />}
        <details className="advanced-options">
          <summary>{t('sheet.advancedOptions')}</summary>
          <div className="grid2"><label className="field">{t('sheet.symbol')}<select value={valeurSelectSymbole} onChange={(e) => modifierChamp('symbol', e.target.value === customCharacterSymbolValue ? '' : e.target.value)}>{symbols.map((symbole) => <option key={symbole} value={symbole}>{symbole}</option>)}<option value={customCharacterSymbolValue}>{t('sheet.symbol.custom')}</option></select></label><label className="field">{t('sheet.color')}<select value={brouillon.color || colors[0]} onChange={(e) => modifierChamp('color', e.target.value)}>{colors.map((couleur) => <option key={couleur} value={couleur}>{colorNames[couleur] || couleur}</option>)}</select></label></div>
          {valeurSelectSymbole === customCharacterSymbolValue && <label className="field">{t('sheet.symbol.custom')}<input value={symboleCourant} placeholder={t('sheet.symbol.customPlaceholder')} onChange={(e) => modifierChamp('symbol', e.target.value)} /></label>}
          <label className="limit-switch-row character-secret-edit"><span><IconeSecret /> {t('sheet.character.hide')}</span><input type="checkbox" checked={!!brouillon.secret} onChange={(event) => modifierChamp('secret', event.target.checked)} /></label>
          {saveTemplateVisible && <button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={enregistrerCommeTemplate}>{t('sheet.saveAsTemplate')}</button>}
        </details>
        <h3 className="sheet-section-title">{t('sheet.quickInfo.title')}</h3>
        <div className="quick-info-editor"><EditeurInfosRapides stats={brouillon.stats || []} definitions={quickRollDefinitions} containers={quickRollContainers} sources={quickRollSources} onChange={(stats) => modifierChamp('stats', stats)} /></div>
        <h3 className="sheet-section-title">{t('sheet.trackers.title')}</h3>
        <div className="stack tracker-list">
          {(brouillon.trackers || []).map((suivi) => <EditeurSuivi key={suivi.id} suivi={suivi} onChange={(suivant) => modifierSuivi(suivi.id, suivant)} onDuplicate={() => dupliquerSuivi(suivi.id)} onDelete={() => setBrouillon((courant) => ({ ...courant, trackers: (courant.trackers || []).filter((item) => item.id !== suivi.id) }))} onSaveTemplate={onSaveTrackerTemplate} allowActivationAutomation={allowActivationAutomation} />)}
          {!ajoutIndicateurOuvert && <button className="primary add-tracker-btn" onClick={() => setAjoutIndicateurOuvert(true)}>{t('sheet.trackers.add')}</button>}
          {ajoutIndicateurOuvert && <div className="stack tracker-add-panel">
            <div className="template-picker-row">
              <select value={selectionAjoutIndicateur} onChange={(event) => setTrackerTemplateId(event.target.value)}>
                {trackerTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                <option value="custom">{t('sheet.trackers.custom')}</option>
              </select>
            </div>
            {ajoutIndicateurPersonnalise && <div className="grid2">
              <label className="field">{t('sheet.type')}<select value={trackerPersonnaliseType} onChange={(event) => setTrackerPersonnaliseType(event.target.value)}>{Object.entries(trackerTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
              <label className="field">{t('sheet.trackers.titleLabel')}<input value={trackerPersonnaliseNom} placeholder={trackerTypeLabels[trackerPersonnaliseType] || t('sheet.trackers.defaultName')} onChange={(event) => setTrackerPersonnaliseNom(event.target.value)} /></label>
            </div>}
            <div className="grid2">
              <button className="small-btn confirm-add-tracker-btn" type="button" onClick={ajoutIndicateurPersonnalise ? ajouterSuiviPersonnalise : ajouterSuiviDepuisTemplate}>{t('common.add')}</button>
              <button className="small-btn" type="button" onClick={() => setAjoutIndicateurOuvert(false)}>{t('common.cancel')}</button>
            </div>
          </div>}
        </div>
        <div className="edit-actions-row" style={{ marginTop: 12 }}><button className="small-btn" onClick={onClose}>{t('common.cancel')}</button><button className="primary" onClick={valider}>{t('sheet.validate')}</button><button className="danger-btn" onClick={() => setConfirmationSuppression(true)}>{deleteLabel}</button></div>
      </Fenetre>
      {confirmationSuppression && <FenetreConfirmationSuppression nom={brouillon.name} onAnnuler={() => setConfirmationSuppression(false)} onConfirmer={onDelete} />}
    </>
  );
  const modifierChamp = (clef, valeur) => setBrouillon((courant) => ({ ...courant, [clef]: valeur }));
  const modifierSuivi = (id, suivant) => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.map((suivi) => suivi.id === id ? suivant : suivi) }));
  const valider = () => onSave(normaliserFiche(brouillon, textConfig, { phaseActionMode: modePhasesCochees ? phaseActionModes.CHECKED : '', phaseCount, multipleActionSlots }), categorieTemplate);
  const enregistrerCommeTemplate = () => onSaveTemplate?.(normaliserFiche(brouillon, textConfig, { phaseActionMode: modePhasesCochees ? phaseActionModes.CHECKED : '', phaseCount, multipleActionSlots }));
  const enteteMultiple = <div className="edit-sheet-header"><div className="template-edit-header-title"><h2>{title}</h2>{categoriesTemplateDisponibles.length > 0 && <label className="template-category-header-field"><span>{t('sheet.category')}</span><select value={categorieTemplate} onChange={(event) => setCategorieTemplate(event.target.value)}>{categoriesTemplateDisponibles.map((categorie) => <option key={categorie} value={categorie}>{categorie}</option>)}</select></label>}</div><button className="icon-btn validate-edit-btn" onClick={valider} aria-label={t('sheet.validateChanges')}><IconeCadence name="valid" /></button></div>;
  return renduEditionMultiple(enteteMultiple, valider, enregistrerCommeTemplate);
}
