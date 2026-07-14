import { useEffect, useMemo, useState } from 'react';
import {
  defaultDeclarationMode,
  defaultCategoryOrder,
  defaultEqualityRule,
  defaultFlexibleUseInitiative,
  defaultInitiativeBonusEnabled,
  defaultInitiativeOrder,
  defaultInitiativeCostQuickCosts,
  defaultInitiativeCostLimitToCurrent,
  defaultInitiativeCostThreshold,
  defaultPhaseDecrement,
  defaultPhaseActionMode,
  defaultPhaseCount,
  defaultPhaseRerollEachRound,
  defaultSurpriseImpact,
  defaultTiebreakerLabel,
  defaultTiebreakerVisible,
  defaultTemporalityMode,
  equalityRules,
  initiativeOrders,
  multipleActionModes,
  manualMultipleActionScopes,
  phaseActionModes,
  participantKinds,
  temporalityModes,
} from '../../constants.js';
import { multipleActionModeFromRules, normalizeInitiativeCostQuickCosts } from '../../domain/initiativeCost.js';
import { initiativeTextOrderPresetIds, initiativeTextOrderPresetLabel, normalizeInitiativeTextOrder, presetInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { activeRuleSummary, canRerollInitiativeEachRound, ruleCompatibilityIssues, ruleOptionAvailability, temporalityPatch } from '../../domain/ruleCompatibility.js';
import { rulePresetFamilies } from '../../rulePresets.js';
import { initiativeProfilesForSystem, systemProfileById } from '../../domain/systemProfiles.js';
import { normalizeParticipantTypes } from '../../domain/participantTypes.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { FenetreInitiativeTextuelleEdition } from './FenetreInitiativeTextuelleEdition.jsx';

function AvertissementBlocage({ availability }) {
  return availability?.disabled && availability.reason ? <p className="rule-warning">{availability.reason}</p> : null;
}

const temporalityLabelKeys = {
  [temporalityModes.CLASSIC]: 'rules.temporality.classic',
  [temporalityModes.FLEXIBLE]: 'rules.temporality.flexible',
  [temporalityModes.PHASES]: 'rules.temporality.phases',
  [temporalityModes.DECLARATION]: 'rules.temporality.declaration',
};

const temporalityHelpKeys = {
  [temporalityModes.CLASSIC]: 'rules.temporality.classicHelp',
  [temporalityModes.FLEXIBLE]: 'rules.temporality.flexibleHelp',
  [temporalityModes.PHASES]: 'rules.temporality.phasesHelp',
  [temporalityModes.DECLARATION]: 'rules.temporality.declarationHelp',
};

const equalityLabelKeys = {
  [equalityRules.NEVER]: 'rules.equality.never',
  [equalityRules.STRICT]: 'rules.equality.strict',
  [equalityRules.LOOSE]: 'rules.equality.loose',
};

const equalityHelpKeys = {
  [equalityRules.NEVER]: 'rules.equality.neverHelp',
  [equalityRules.STRICT]: 'rules.equality.strictHelp',
  [equalityRules.LOOSE]: 'rules.equality.looseHelp',
};

const initiativeOrderLabelKeys = {
  [initiativeOrders.DESC]: 'rules.initiativeOrder.desc',
  [initiativeOrders.ASC]: 'rules.initiativeOrder.asc',
};

const initiativeOrderHelpKeys = {
  [initiativeOrders.DESC]: 'rules.initiativeOrder.descHelp',
  [initiativeOrders.ASC]: 'rules.initiativeOrder.ascHelp',
};

function ResumeReglesActives({ scene }) {
  const resume = activeRuleSummary(scene);
  const issues = ruleCompatibilityIssues(scene);
  return <div className={`scene-options compact-options advanced-rule-block active-rules-summary ${issues.length ? 'has-issues' : ''}`}><h3>{t('rules.activeTitle')}</h3><p className="muted compact-help">{resume.join(' - ')}</p>{issues.map((issue) => <p className="rule-warning" key={issue.id}>{issue.message}</p>)}</div>;
}

function OptionsTemporaliteCampagne({ scene, temporalite = defaultTemporalityMode, availability, onModifier }) {
  const modes = [temporalityModes.CLASSIC, temporalityModes.FLEXIBLE, temporalityModes.PHASES];
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.temporality.title')}</h3><p className="muted compact-help">{t('rules.temporality.help')}</p><div className="advanced-radio-list">{modes.map((mode) => { const option = availability?.temporality?.[mode]; const indisponible = temporalite !== mode && option?.disabled; return <label className={`advanced-radio ${temporalite === mode ? 'selected' : ''} ${indisponible ? 'disabled' : ''}`} key={mode}><input type="radio" name="campaign-temporality-mode" value={mode} checked={temporalite === mode} disabled={indisponible} onChange={(event) => onModifier(temporalityPatch(scene, event.target.value))} /><span><strong>{t(temporalityLabelKeys[mode])}</strong><small>{t(temporalityHelpKeys[mode])}</small>{indisponible && <small className="rule-option-warning">{option.reason}</small>}</span></label>; })}</div></div>;
}

function OptionsDeclarationCampagne({ scene, availability, onModifier }) {
  const actif = scene?.declarationMode ?? defaultDeclarationMode;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.declaration.title')}</h3><p className="muted compact-help">{t('rules.declaration.help')}</p><label className={`reset-switch campaign-rule-switch ${actif ? 'active' : ''} ${!actif && availability?.disabled ? 'disabled' : ''}`}><span>{t('rules.declaration.mode')}</span><input type="checkbox" checked={!!actif} disabled={!actif && availability?.disabled} onChange={(event) => onModifier({ declarationMode: event.target.checked, declarationStage: event.target.checked ? 'declaration' : '', declarations: {}, resolutionOrder: [], declarationPlayedIds: [] })} /></label><AvertissementBlocage availability={availability} /></div>;
}

function OptionsSurpriseCampagne({ scene, availability, onModifier }) {
  const impact = scene?.surpriseImpact || defaultSurpriseImpact;
  const activationDisabled = availability?.activation?.disabled;
  const advanceOn = activationDisabled ? 'round' : scene?.surpriseAdvanceOn === 'round' ? 'round' : 'activation';
  return <div className="scene-options compact-options advanced-rule-block surprise-rule-options"><h3>{t('rules.surprise.title')}</h3><p className="muted compact-help">{t('rules.surprise.help')}</p><label className={`reset-switch campaign-rule-switch ${scene?.surpriseDedicatedRound ? 'active' : ''}`}><span>{t('rules.surprise.dedicatedRound')}</span><input type="checkbox" checked={!!scene?.surpriseDedicatedRound} onChange={(event) => onModifier({ surpriseDedicatedRound: event.target.checked })} /></label><div className="advanced-radio-list"><label className={`advanced-radio ${impact === 'limited' ? 'selected' : ''}`}><input type="radio" name="campaign-surprise-impact" value="limited" checked={impact === 'limited'} onChange={(event) => onModifier({ surpriseImpact: event.target.value })} /><span><strong>{t('rules.surprise.limited')}</strong><small>{t('rules.surprise.limitedHelp')}</small></span></label><label className={`advanced-radio ${impact === 'inactive' ? 'selected' : ''}`}><input type="radio" name="campaign-surprise-impact" value="inactive" checked={impact === 'inactive'} onChange={(event) => onModifier({ surpriseImpact: event.target.value })} /><span><strong>{t('rules.surprise.inactive')}</strong><small>{t('rules.surprise.inactiveHelp')}</small></span></label></div><div className="advanced-radio-list surprise-advance-options"><label className={`advanced-radio ${advanceOn === 'activation' ? 'selected' : ''} ${activationDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-surprise-advance" value="activation" checked={advanceOn === 'activation'} disabled={activationDisabled} onChange={(event) => onModifier({ surpriseAdvanceOn: event.target.value })} /><span><strong>{t('rules.surprise.advance.activation')}</strong><small>{t('rules.surprise.advance.activationHelp')}</small>{activationDisabled && <small className="rule-option-warning">{availability.activation.reason}</small>}</span></label><label className={`advanced-radio ${advanceOn === 'round' ? 'selected' : ''}`}><input type="radio" name="campaign-surprise-advance" value="round" checked={advanceOn === 'round'} onChange={(event) => onModifier({ surpriseAdvanceOn: event.target.value })} /><span><strong>{t('rules.surprise.advance.round')}</strong><small>{t('rules.surprise.advance.roundHelp')}</small></span></label></div></div>;
}

function FenetreSauvegardeRegles({ nomInitial, templateDepart, templates = [], onFermer, onEnregistrer }) {
  const [nom, setNom] = useState(nomInitial || templateDepart?.name || t('rules.preset.custom'));
  const [mode, setMode] = useState(templateDepart ? 'overwrite' : 'create');
  const [confirmation, setConfirmation] = useState(null);
  const nomNettoye = nom.trim();
  const conflit = templates.find((template) => template.name.toLocaleLowerCase() === nomNettoye.toLocaleLowerCase() && template.id !== (mode === 'overwrite' ? templateDepart?.id : ''));
  const enregistrer = (confirmDuplicate = false, overwriteExistingId = '') => {
    if (!nomNettoye) return;
    const result = onEnregistrer({ name: nomNettoye, mode, templateId: templateDepart?.id, confirmDuplicate, overwriteExistingId });
    if (result?.ok === false && result.kind === 'duplicate') {
      setConfirmation(result.conflict);
      return;
    }
    onFermer(result);
  };
  return (
    <Fenetre title={t('rules.preset.saveTitle')} onClose={() => onFermer(null)}>
      <div className="stack rule-save-dialog">
        <label className="field">{t('rules.preset.name')}<input value={nom} onChange={(event) => { setNom(event.target.value); setConfirmation(null); }} autoFocus /></label>
        <div className="rule-save-choices">
          {templateDepart && <button className={`choice ${mode === 'overwrite' ? 'selected' : ''}`} onClick={() => { setMode('overwrite'); setConfirmation(null); }}>{t('rules.preset.overwrite', { name: templateDepart.name })}</button>}
          <button className={`choice ${mode === 'create' ? 'selected' : ''}`} onClick={() => { setMode('create'); setConfirmation(null); }}>{t('rules.preset.create')}</button>
        </div>
        {conflit && !confirmation && <p className="rule-warning">{t('rules.preset.duplicateWarning')}</p>}
        {confirmation && <div className="delete-confirm"><strong>{t('rules.preset.alreadyExists', { name: confirmation.name })}</strong><p className="muted compact-help">{t('rules.preset.overwriteHelp')}</p><div className="grid2"><button className="primary" onClick={() => enregistrer(true, confirmation.id)}>{t('rules.preset.overwriteCurrent')}</button><button className="small-btn" onClick={() => setConfirmation(null)}>{t('rules.preset.rename')}</button></div></div>}
        {!confirmation && <div className="grid2"><button className="primary" onClick={() => enregistrer(false)} disabled={!nomNettoye}>{t('common.save')}</button><button className="small-btn" onClick={() => onFermer(null)}>{t('common.cancel')}</button></div>}
      </div>
    </Fenetre>
  );
}

function OptionsTemplatesReglesCampagne({ scene, ruleTemplates = [], rulePresetSnapshot = null, dernierTemplateId, nomCourant, editionNom, sauvegardeOk, onChangerNom, onEditerNom, onFermerEditionNom, onAppliquer, onEnregistrer, onSupprimer }) {
  const [templateId, setTemplateId] = useState(ruleTemplates[0]?.id || '');
  const [familleId, setFamilleId] = useState(rulePresetSnapshot?.family || ruleTemplates[0]?.family || rulePresetFamilies.GENERIC);
  const [sauvegardeOuverte, setSauvegardeOuverte] = useState(false);
  const familles = useMemo(() => [
    { id: rulePresetFamilies.GENERIC, label: t('rules.preset.family.generic') },
    { id: rulePresetFamilies.SYSTEM, label: t('rules.preset.family.system') },
    { id: rulePresetFamilies.PERSONAL, label: t('rules.preset.family.personal') },
  ].filter((famille) => ruleTemplates.some((template) => (template.family || rulePresetFamilies.PERSONAL) === famille.id)), [ruleTemplates]);
  const templatesFamille = useMemo(
    () => ruleTemplates.filter((item) => (item.family || rulePresetFamilies.PERSONAL) === familleId),
    [ruleTemplates, familleId],
  );

  useEffect(() => {
    const snapshotFamily = rulePresetSnapshot?.family || '';
    if (snapshotFamily && snapshotFamily !== familleId) {
      setFamilleId(snapshotFamily);
      return;
    }
    if (!familles.some((famille) => famille.id === familleId)) {
      setFamilleId(familles[0]?.id || rulePresetFamilies.GENERIC);
    }
  }, [familleId, familles, rulePresetSnapshot]);

  useEffect(() => {
    if (!templateId && templatesFamille[0]?.id) {
      setTemplateId(templatesFamille[0].id);
      return;
    }
    if (templateId && !templatesFamille.some((item) => item.id === templateId)) {
      setTemplateId(templatesFamille[0]?.id || '');
    }
  }, [templateId, templatesFamille]);

  const template = templatesFamille.find((item) => item.id === templateId) || null;
  const templateDepart = ruleTemplates.find((item) => item.id === dernierTemplateId || item.catalogId === rulePresetSnapshot?.catalogId) || null;
  const templateDepartEditable = templateDepart?.readOnly ? null : templateDepart;
  const editableTemplates = ruleTemplates.filter((item) => !item.readOnly);
  const optionLabel = (item) => {
    if (familleId === rulePresetFamilies.SYSTEM) return item.name;
    if (familleId === rulePresetFamilies.PERSONAL) return item.name;
    return item.category && item.category !== 'Cadence' ? `${item.category} - ${item.name}` : item.name;
  };
  const snapshotLabel = rulePresetSnapshot?.name || templateDepart?.name || t('rules.preset.custom');
  const snapshotSubLabel = rulePresetSnapshot
    ? `${rulePresetSnapshot.family === rulePresetFamilies.SYSTEM ? t('rules.preset.family.systemSingle') : rulePresetSnapshot.family === rulePresetFamilies.GENERIC ? t('rules.preset.family.genericSingle') : t('rules.preset.family.personalSingle')}${rulePresetSnapshot.modified ? ` ${t('rules.preset.modified')}` : ''}`
    : t('rules.preset.starting', { name: templateDepart?.name || t('rules.preset.customShort') });
  const appliquer = () => {
    if (!template) return;
    onAppliquer(template);
    setTemplateId(template.id);
  };
  const enregistrer = (options) => onEnregistrer(scene, options);
  return <div className={`scene-options compact-options advanced-rule-block rule-preset-block ${sauvegardeOk ? 'saved' : ''}`}><div className="rule-current-title"><div>{editionNom ? <input value={nomCourant} onChange={(event) => onChangerNom(event.target.value)} onBlur={onFermerEditionNom} onKeyDown={(event) => { if (event.key === 'Enter') onFermerEditionNom(); }} /> : <><h3>{nomCourant || snapshotLabel}</h3><small className="muted">{snapshotSubLabel}</small></>} </div><button className="icon-btn rule-title-edit" onClick={editionNom ? onFermerEditionNom : onEditerNom} aria-label={t('rules.preset.renameCurrent')}><IconeCadence name="edit" /></button><button className={`icon-btn rule-save-btn ${sauvegardeOk ? 'confirmed' : ''}`} onClick={() => setSauvegardeOuverte(true)} aria-label={t('rules.preset.saveCurrent')}><IconeCadence name="save" /></button></div>{ruleTemplates.length > 0 && <div className="template-rule-row compact-rule-template-row"><select value={familleId} onChange={(event) => setFamilleId(event.target.value)}>{familles.map((famille) => <option key={famille.id} value={famille.id}>{famille.label}</option>)}</select><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templatesFamille.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select><button className="small-btn" onClick={appliquer} disabled={!template}>{t('common.apply')}</button><button className="danger-btn mini-danger" onClick={() => template && !template.readOnly && onSupprimer(template.id)} disabled={!template || template.readOnly}>{t('rules.preset.deleteShort')}</button></div>}{sauvegardeOk && <div className="rule-save-confirmation">{t('rules.preset.saved')}</div>}{sauvegardeOuverte && <FenetreSauvegardeRegles nomInitial={nomCourant || snapshotLabel} templateDepart={templateDepartEditable} templates={editableTemplates} onFermer={(result) => { setSauvegardeOuverte(false); if (result?.template) onAppliquer(result.template, { alreadyApplied: true }); }} onEnregistrer={enregistrer} />}</div>;
}

function OptionsPhasesCampagne({ scene, availability, onModifier }) {
  const mode = scene?.phaseActionMode || defaultPhaseActionMode;
  const modeCoche = mode === phaseActionModes.CHECKED;
  const automaticAvailability = availability?.phaseActionMode?.[phaseActionModes.AUTOMATIC];
  const checkedAvailability = availability?.phaseActionMode?.[phaseActionModes.CHECKED];
  const automaticDisabled = modeCoche && automaticAvailability?.disabled;
  const checkedDisabled = !modeCoche && checkedAvailability?.disabled;
  return <div className="scene-options compact-options advanced-rule-block phase-options"><h3>{t('rules.phase.title')}</h3><p className="muted compact-help">{t('rules.phase.help')}</p><div className="advanced-radio-list"><label className={`advanced-radio ${!modeCoche ? 'selected' : ''} ${automaticDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-phase-mode" checked={!modeCoche} disabled={automaticDisabled} onChange={() => onModifier({ phaseActionMode: phaseActionModes.AUTOMATIC })} /><span><strong>{t('rules.phase.byInitiative')}</strong><small>{t('rules.phase.byInitiativeHelp')}</small>{automaticAvailability?.disabled && <small className="rule-option-warning">{automaticAvailability.reason}</small>}</span></label><label className={`advanced-radio ${modeCoche ? 'selected' : ''} ${checkedDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-phase-mode" checked={modeCoche} disabled={checkedDisabled} onChange={() => onModifier({ phaseActionMode: phaseActionModes.CHECKED })} /><span><strong>{t('rules.phase.checked')}</strong><small>{t('rules.phase.checkedHelp')}</small>{checkedAvailability?.disabled && <small className="rule-option-warning">{checkedAvailability.reason}</small>}</span></label></div>{modeCoche ? <label className="field">{t('rules.phase.max')}<input type="number" min="1" max="20" step="1" value={scene?.phaseCount || defaultPhaseCount} onChange={(event) => onModifier({ phaseCount: event.target.value })} /></label> : <label className="field">{t('rules.phase.decrement')}<input type="number" min="1" step="1" value={scene?.phaseDecrement || defaultPhaseDecrement} onChange={(event) => onModifier({ phaseDecrement: event.target.value })} /></label>}</div>;
}

function OptionsEgalitesCampagne({ scene, onModifier }) {
  const equalityRule = scene?.equalityRule || defaultEqualityRule;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.equality.title')}</h3><p className="muted compact-help">{t('rules.equality.help')}</p><div className="advanced-radio-list">{Object.values(equalityRules).map((rule) => <label className={`advanced-radio ${equalityRule === rule ? 'selected' : ''}`} key={rule}><input type="radio" name="campaign-equality-rule" value={rule} checked={equalityRule === rule} onChange={(event) => onModifier({ equalityRule: event.target.value })} /><span><strong>{t(equalityLabelKeys[rule])}</strong><small>{t(equalityHelpKeys[rule])}</small></span></label>)}</div></div>;
}

function OptionsOrdreInitiativeCampagne({ scene, onModifier }) {
  const initiativeOrder = scene?.initiativeOrder || defaultInitiativeOrder;
  const souple = scene?.temporalite === temporalityModes.FLEXIBLE;
  const utiliseInitiative = !souple || (scene?.flexibleUseInitiative ?? defaultFlexibleUseInitiative);
  const coutInitiative = multipleActionModeFromRules(scene) === multipleActionModes.INITIATIVE_COST;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.initiativeOrder.title')}</h3>{souple && <label className={`reset-switch campaign-rule-switch ${utiliseInitiative ? 'active' : ''}`}><span>{t('rules.initiativeOrder.use')}</span><input type="checkbox" checked={utiliseInitiative} onChange={(event) => onModifier({ flexibleUseInitiative: event.target.checked })} /></label>}<p className="muted compact-help">{t('rules.initiativeOrder.help')}</p>{souple && <><p className="muted compact-help">{t('rules.initiativeOrder.flexibleHelp')}</p>{!utiliseInitiative && <p className="rule-option-note">{t('rules.initiativeOrder.noInitiativeNote')}</p>}</>}{utiliseInitiative && <div className="advanced-radio-list">{Object.values(initiativeOrders).map((order) => { const disabled = coutInitiative && order === initiativeOrders.ASC; return <label className={`advanced-radio ${initiativeOrder === order ? 'selected' : ''} ${disabled ? 'disabled' : ''}`} key={order}><input type="radio" name="campaign-initiative-order" value={order} checked={initiativeOrder === order} disabled={disabled} onChange={(event) => onModifier({ initiativeOrder: event.target.value })} /><span><strong>{t(initiativeOrderLabelKeys[order])}</strong><small>{t(initiativeOrderHelpKeys[order])}</small>{disabled && <small className="rule-option-warning">{t('rules.initiativeOrder.unavailableWithCost')}</small>}</span></label>; })}</div>}</div>;
}

function OptionsDepartageCampagne({ scene, onModifier }) {
  const visible = scene?.tiebreakerVisible ?? defaultTiebreakerVisible;
  const label = scene?.tiebreakerLabel || defaultTiebreakerLabel;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.tiebreaker.title')}</h3><p className="muted compact-help">{t('rules.tiebreaker.help')}</p><label className={`reset-switch campaign-rule-switch ${visible ? 'active' : ''}`}><span>{t('rules.tiebreaker.show')}</span><input type="checkbox" checked={visible} onChange={(event) => onModifier({ tiebreakerVisible: event.target.checked })} /></label>{visible ? <label className="field">{t('rules.tiebreaker.label')}<input value={label} onChange={(event) => onModifier({ tiebreakerLabel: event.target.value })} /></label> : <p className="rule-option-note">{t('rules.tiebreaker.hiddenNote')}</p>}</div>;
}

function OptionsBonusInitiativeCampagne({ scene, rollDefinitions = [], onModifier }) {
  const actif = scene?.initiativeBonusEnabled ?? defaultInitiativeBonusEnabled;
  const initiativeTextuelle = normalizeInitiativeTextOrder(scene?.initiativeTextOrder).enabled;
  const selectedRollId = scene?.initiativeBonusRollDefinitionId || '';
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.initiativeBonus.title')}</h3><p className="muted compact-help">{t('rules.initiativeBonus.help')}</p><label className={`reset-switch campaign-rule-switch ${actif ? 'active' : ''}`}><span>{t('rules.initiativeBonus.enable')}</span><input type="checkbox" checked={!!actif} onChange={(event) => onModifier({ initiativeBonusEnabled: event.target.checked })} /></label>{actif && !initiativeTextuelle && <label className="field">{t('rules.initiativeBonus.roll')}<select value={selectedRollId} onChange={(event) => onModifier({ initiativeBonusRollDefinitionId: event.target.value })}><option value="">{t('rules.initiativeBonus.noRoll')}</option>{rollDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.name}</option>)}</select></label>}{actif && selectedRollId && <p className="rule-option-note">{t('rules.initiativeBonus.rollNote')}</p>}{actif && initiativeTextuelle ? <p className="rule-option-note">{t('rules.initiativeBonus.textNote')}</p> : !actif ? <p className="rule-option-note">{t('rules.initiativeBonus.hiddenNote')}</p> : null}</div>;
}

function OptionsProfilCampagne({ campaignProfile, onOuvrirProfil }) {
  const systemProfile = systemProfileById(campaignProfile?.systemProfileId);
  const initiativeProfile = initiativeProfilesForSystem(campaignProfile?.systemProfileId, campaignProfile?.editionId)
    .find((profile) => profile.id === campaignProfile?.initiativeProfileId);
  const profileLabel = [systemProfile?.name, campaignProfile?.editionId, initiativeProfile?.label].filter(Boolean).join(' · ');

  return <section className="rule-group"><div className="rule-group-head"><h3>{t('rules.profile.title')}</h3><p className="muted compact-help">{profileLabel || t('rules.profile.none')}</p></div><div className="rule-group-body"><button className="small-btn" type="button" onClick={onOuvrirProfil}>{t('rules.profile.change')}</button></div></section>;
}

function OptionsActionsMultiplesBase({ scene, availability, onModifier }) {
  const mode = multipleActionModeFromRules(scene);
  const costAvailability = availability?.initiativeCost || ruleOptionAvailability(scene).initiativeCost;
  const manualDisabled = mode !== multipleActionModes.MANUAL && availability?.disabled;
  const costDisabled = mode !== multipleActionModes.INITIATIVE_COST && costAvailability?.disabled;
  const quickCosts = normalizeInitiativeCostQuickCosts(scene?.initiativeCostQuickCosts || defaultInitiativeCostQuickCosts).join(', ');
  const limiteCoutActif = scene?.initiativeCostLimitToCurrent ?? defaultInitiativeCostLimitToCurrent;
  const setMode = (nextMode) => {
    if (nextMode === multipleActionModes.INITIATIVE_COST) onModifier({ multipleActionMode: nextMode, multipleActionSlots: true, promptInitiativeOnNext: false });
    else onModifier({ multipleActionMode: nextMode, multipleActionSlots: nextMode !== multipleActionModes.NONE });
  };
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.multipleActions.title')}</h3><p className="muted compact-help">{t('rules.multipleActions.help')}</p><div className="advanced-radio-list"><label className={`advanced-radio ${mode === multipleActionModes.NONE ? 'selected' : ''}`}><input type="radio" name="campaign-multiple-actions" checked={mode === multipleActionModes.NONE} onChange={() => setMode(multipleActionModes.NONE)} /><span><strong>{t('rules.multipleActions.none')}</strong><small>{t('rules.multipleActions.noneHelp')}</small></span></label><label className={`advanced-radio ${mode === multipleActionModes.MANUAL ? 'selected' : ''} ${manualDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-multiple-actions" checked={mode === multipleActionModes.MANUAL} disabled={manualDisabled} onChange={() => setMode(multipleActionModes.MANUAL)} /><span><strong>{t('rules.multipleActions.manual')}</strong><small>{t('rules.multipleActions.manualHelp')}</small>{manualDisabled && <small className="rule-option-warning">{availability.reason}</small>}</span></label><label className={`advanced-radio ${mode === multipleActionModes.INITIATIVE_COST ? 'selected' : ''} ${costDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-multiple-actions" checked={mode === multipleActionModes.INITIATIVE_COST} disabled={costDisabled} onChange={() => setMode(multipleActionModes.INITIATIVE_COST)} /><span><strong>{t('rules.multipleActions.initiativeCost')}</strong><small>{t('rules.multipleActions.initiativeCostHelp')}</small>{costDisabled && <small className="rule-option-warning">{costAvailability.reason}</small>}</span></label></div>{mode === multipleActionModes.INITIATIVE_COST && <div className="initiative-cost-rule-fields"><label className="field">{t('rules.multipleActions.threshold')}<input type="number" inputMode="numeric" value={scene?.initiativeCostThreshold ?? defaultInitiativeCostThreshold} onChange={(event) => onModifier({ initiativeCostThreshold: event.target.value })} /></label><p className="rule-option-note">{t('rules.multipleActions.thresholdNote')}</p><label className="field">{t('rules.multipleActions.quickCosts')}<input value={quickCosts} onChange={(event) => onModifier({ initiativeCostQuickCosts: event.target.value.split(',').map((item) => item.trim()) })} /></label><label className={`reset-switch campaign-rule-switch ${limiteCoutActif ? 'active' : ''}`}><span>{t('rules.multipleActions.limitCost')}</span><input type="checkbox" checked={!!limiteCoutActif} onChange={(event) => onModifier({ initiativeCostLimitToCurrent: event.target.checked })} /></label></div>}</div>;
}

function OptionsActionsMultiplesCampagne(props) {
  const { scene, onModifier } = props;
  const mode = multipleActionModeFromRules(scene);
  const scope = scene?.manualMultipleActionScope || manualMultipleActionScopes.ALL;
  return <><OptionsActionsMultiplesBase {...props} />{mode === multipleActionModes.MANUAL && <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.multipleActions.scope')}</h3><div className="advanced-radio-list"><label className={`advanced-radio ${scope === manualMultipleActionScopes.ALL ? 'selected' : ''}`}><input type="radio" name="campaign-manual-actions-scope" checked={scope === manualMultipleActionScopes.ALL} onChange={() => onModifier({ manualMultipleActionScope: manualMultipleActionScopes.ALL })} /><span><strong>{t('rules.multipleActions.scopeAll')}</strong><small>{t('rules.multipleActions.scopeAllHelp')}</small></span></label><label className={`advanced-radio ${scope === manualMultipleActionScopes.ELITE_ONLY ? 'selected' : ''}`}><input type="radio" name="campaign-manual-actions-scope" checked={scope === manualMultipleActionScopes.ELITE_ONLY} onChange={() => onModifier({ manualMultipleActionScope: manualMultipleActionScopes.ELITE_ONLY })} /><span><strong>{t('rules.multipleActions.scopeElite')}</strong><small>{t('rules.multipleActions.scopeEliteHelp')}</small></span></label></div></div>}</>;
}

function OptionsInitiativeTextuelleCampagne({ scene, availability, cardSources = [], onModifier, onConfigurer }) {
  const config = normalizeInitiativeTextOrder(scene?.initiativeTextOrder);
  const linkedSource = cardSources.find((source) => source.id === config.cardSourceId);
  const unlinkedCardPreset = config.preset === initiativeTextOrderPresetIds.CARDS && !linkedSource;
  const configLabels = config.parts.length && !unlinkedCardPreset
    ? { ...config, enabled: true }
    : presetInitiativeTextOrder(initiativeTextOrderPresetIds.POSTURES);
  const choisirNumerique = () => onModifier({ initiativeTextOrder: { ...config, enabled: false } });
  const choisirLabels = () => onModifier({ initiativeTextOrder: configLabels });
  const preset = config.enabled ? initiativeTextOrderPresetLabel(config) : t('rules.initiativeFormat.numeric');
  const resume = config.enabled && config.parts.length ? config.parts.map((part) => `${part.label}: ${part.values.length}`).join(' - ') : t('rules.initiativeFormat.numericFields');
  const labelsDisabled = !config.enabled && availability?.disabled;
  return <div className="scene-options compact-options advanced-rule-block initiative-format-block"><div><h3>{t('rules.initiativeFormat.title')}</h3><small className="muted">{t('rules.initiativeFormat.presetSummary', { preset, resume })}</small>{config.enabled && (config.preset === initiativeTextOrderPresetIds.CARDS || config.cardSourceId) && <small className="muted">{t('rules.initiativeFormat.cardSourceSummary', { source: linkedSource?.name || t('initiativeText.noCardSource') })}</small>}</div><div className="advanced-radio-list"><label className={`advanced-radio ${!config.enabled ? 'selected' : ''}`}><input type="radio" name="campaign-initiative-format" checked={!config.enabled} onChange={choisirNumerique} /><span><strong>{t('rules.initiativeFormat.numeric')}</strong><small>{t('rules.initiativeFormat.numericHelp')}</small></span></label><label className={`advanced-radio initiative-label-radio ${config.enabled ? 'selected' : ''} ${labelsDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-initiative-format" checked={config.enabled} disabled={labelsDisabled} onChange={choisirLabels} /><span><strong>{t('rules.initiativeFormat.labels')}</strong><small>{t('rules.initiativeFormat.labelsHelp')}</small>{availability?.disabled && <small className="rule-option-warning">{availability.reason}</small>}</span><button className="small-btn" type="button" disabled={labelsDisabled} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onConfigurer(); }}>{t('rules.initiativeFormat.modify')}</button></label></div></div>;
}

function OptionsRelanceInitiativeCampagne({ scene, onModifier }) {
  const relanceActif = scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.newRound.title')}</h3><label className={`reset-switch campaign-rule-switch ${relanceActif ? 'active' : ''}`}><span>{t('rules.newRound.reroll')}</span><input type="checkbox" checked={relanceActif} onChange={(event) => onModifier({ phaseRerollEachRound: event.target.checked })} /></label></div>;
}

function OptionsOrdreCategoriesCampagne({ scene, onModifier }) {
  const order = scene?.categoryOrder || defaultCategoryOrder;
  const definitions = normalizeParticipantTypes(scene?.participantTypes, order);
  const [nouvelleCategorie, setNouvelleCategorie] = useState('');
  const deplacer = (index, delta) => { const target = index + delta; if (target < 0 || target >= order.length) return; const suivant = [...order]; [suivant[index], suivant[target]] = [suivant[target], suivant[index]]; onModifier({ categoryOrder: suivant }); };
  const ajouter = () => { const valeur = nouvelleCategorie.trim(); if (!valeur || order.some((categorie) => categorie.toLocaleLowerCase() === valeur.toLocaleLowerCase())) return; onModifier({ categoryOrder: [...order, valeur], participantTypes: [...definitions, { name: valeur, behaviorType: 'Opposant' }] }); setNouvelleCategorie(''); };
  const retirer = (categorie) => { const replacement = definitions.find((item) => item.name === categorie)?.behaviorType || 'Opposant'; onModifier({ categoryOrder: order.filter((item) => item !== categorie), participantTypes: definitions.filter((item) => item.name !== categorie), deleteParticipantType: { name: categorie, replacement } }); };
  const changerComportement = (categorie, behaviorType) => onModifier({ participantTypes: definitions.map((item) => item.name === categorie ? { ...item, behaviorType } : item) });
  const renommer = (categorie, valeur) => { const name = valeur.trim(); if (!name || name === categorie || order.some((item) => item !== categorie && item.toLocaleLowerCase() === name.toLocaleLowerCase())) return; onModifier({ categoryOrder: order.map((item) => item === categorie ? name : item), participantTypes: definitions.map((item) => item.name === categorie ? { ...item, name } : item), renameParticipantType: { from: categorie, to: name } }); };
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.categories.title')}</h3><p className="muted compact-help">{t('rules.categories.help')}</p><div className="stack compact-category-order">{order.map((categorie, index) => { const custom = !participantKinds.includes(categorie); const definition = definitions.find((item) => item.name === categorie); return <div className="restore-row discreet" key={categorie}>{custom ? <input className="compact-type-name" defaultValue={categorie} onBlur={(event) => renommer(categorie, event.target.value)} aria-label={`Renommer ${categorie}`} /> : <strong>{categorie}</strong>}{custom && <select value={definition?.behaviorType || 'Opposant'} onChange={(event) => changerComportement(categorie, event.target.value)} aria-label={`Comportement de ${categorie}`}>{participantKinds.map((type) => <option key={type} value={type}>{type}</option>)}</select>}<div className="compact-arrows"><button className="small-btn" onClick={() => deplacer(index, -1)} disabled={index <= 0} aria-label={t('templates.personnages.moveCategoryUp', { name: categorie })}><IconeCadence name="nextStrong" className="up" /></button><button className="small-btn" onClick={() => deplacer(index, 1)} disabled={index >= order.length - 1} aria-label={t('templates.personnages.moveCategoryDown', { name: categorie })}><IconeCadence name="nextStrong" className="down" /></button>{custom && <button className="small-btn subtle-danger" onClick={() => retirer(categorie)} aria-label={t('rules.categories.delete', { category: categorie })}><IconeCadence name="remove" /></button>}</div></div>; })}</div><div className="template-picker-row"><input value={nouvelleCategorie} aria-label={t('rules.categories.new')} placeholder={t('rules.categories.new')} onChange={(event) => setNouvelleCategorie(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') ajouter(); }} /><button className="small-btn" onClick={ajouter} disabled={!nouvelleCategorie.trim()}>{t('rules.categories.add')}</button></div></div>;
}

function GroupeRegles({ titre, aide, children }) {
  return <section className="rule-group"><div className="rule-group-head"><h3>{titre}</h3>{aide && <p className="muted compact-help">{aide}</p>}</div><div className="rule-group-body">{children}</div></section>;
}

export function OngletRegles({ scene, campaignProfile, rulePresetSnapshot, onModifierRegles, ruleTemplates, initiativeTextPresets = [], cardSources = [], rollDefinitions = [], embedded = false, onOuvrirProfilCampagne, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onEnregistrerPresetInitiativeTextuelle, onSupprimerTemplateRegles }) {
  const temporalite = scene?.temporalite || defaultTemporalityMode;
  const availability = ruleOptionAvailability(scene);
  const [initiativeTextuelleOuverte, setInitiativeTextuelleOuverte] = useState(false);
  const [dernierTemplateId, setDernierTemplateId] = useState(rulePresetSnapshot?.presetId || ruleTemplates[0]?.id || '');
  const [nomCourant, setNomCourant] = useState(rulePresetSnapshot?.name || ruleTemplates[0]?.name || t('rules.preset.custom'));
  const [editionNom, setEditionNom] = useState(false);
  const [sauvegardeOk, setSauvegardeOk] = useState(false);
  useEffect(() => {
    if (rulePresetSnapshot?.presetId) {
      setDernierTemplateId(rulePresetSnapshot.presetId);
      setNomCourant(rulePresetSnapshot.name || t('rules.preset.custom'));
      return;
    }
    if (dernierTemplateId && ruleTemplates.some((template) => template.id === dernierTemplateId)) return;
    const premier = ruleTemplates[0];
    setDernierTemplateId(premier?.id || '');
    setNomCourant(premier?.name || t('rules.preset.custom'));
  }, [dernierTemplateId, rulePresetSnapshot, ruleTemplates]);
  useEffect(() => {
    if (!sauvegardeOk) return undefined;
    const timer = window.setTimeout(() => setSauvegardeOk(false), 1800);
    return () => window.clearTimeout(timer);
  }, [sauvegardeOk]);
  const validerInitiativeTextuelle = (patch) => { onModifierRegles(patch); setInitiativeTextuelleOuverte(false); };
  const appliquerTemplate = (template) => {
    if (!template) return;
    onAppliquerTemplateRegles(template);
    setDernierTemplateId(template.id || '');
    setNomCourant(template.name || t('rules.preset.custom'));
    setEditionNom(false);
  };
  const enregistrerTemplate = (rules, options) => {
    const result = onEnregistrerTemplateRegles(rules, options);
    if (result?.ok === false) return result;
    if (result?.template) {
      setDernierTemplateId(result.template.id);
      setNomCourant(result.template.name);
      setSauvegardeOk(true);
      setEditionNom(false);
    }
    return result;
  };
  const initiativeActive = temporalite !== temporalityModes.FLEXIBLE || scene?.flexibleUseInitiative !== false;
  const relanceInitiativeVisible = canRerollInitiativeEachRound(scene);
  return <div className={`stack rules-panel ${embedded ? '' : 'hub-section panel'}`.trim()}><div><h3>{t('rules.title')}</h3><p className="muted compact-help">{t('rules.help')}</p></div>{embedded && <OptionsProfilCampagne campaignProfile={campaignProfile} onOuvrirProfil={onOuvrirProfilCampagne} />}<OptionsTemplatesReglesCampagne scene={scene} ruleTemplates={ruleTemplates} rulePresetSnapshot={rulePresetSnapshot} dernierTemplateId={dernierTemplateId} nomCourant={nomCourant} editionNom={editionNom} sauvegardeOk={sauvegardeOk} onChangerNom={setNomCourant} onEditerNom={() => setEditionNom(true)} onFermerEditionNom={() => setEditionNom(false)} onAppliquer={appliquerTemplate} onEnregistrer={enregistrerTemplate} onSupprimer={onSupprimerTemplateRegles} /><ResumeReglesActives scene={scene} /><GroupeRegles titre={t('rules.group.development')} aide={t('rules.group.developmentHelp')}><OptionsTemporaliteCampagne scene={scene} temporalite={temporalite} availability={availability} onModifier={onModifierRegles} />{temporalite === temporalityModes.PHASES && <OptionsPhasesCampagne scene={scene} availability={availability} onModifier={onModifierRegles} />}<OptionsSurpriseCampagne scene={scene} availability={availability.surpriseAdvanceOn} onModifier={onModifierRegles} /></GroupeRegles><GroupeRegles titre={t('rules.group.initiative')} aide={t('rules.group.initiativeHelp')}>{initiativeActive && <OptionsInitiativeTextuelleCampagne scene={scene} availability={availability.labelInitiative} cardSources={cardSources} onModifier={onModifierRegles} onConfigurer={() => setInitiativeTextuelleOuverte(true)} />}<OptionsOrdreInitiativeCampagne scene={scene} onModifier={onModifierRegles} />{initiativeActive && <OptionsBonusInitiativeCampagne scene={scene} rollDefinitions={rollDefinitions} onModifier={onModifierRegles} />}{initiativeActive && <OptionsDepartageCampagne scene={scene} onModifier={onModifierRegles} />}<OptionsActionsMultiplesCampagne scene={scene} availability={availability.multipleActionSlots} onModifier={onModifierRegles} /><OptionsDeclarationCampagne scene={scene} availability={availability.declarationMode} onModifier={onModifierRegles} />{relanceInitiativeVisible && <OptionsRelanceInitiativeCampagne scene={scene} onModifier={onModifierRegles} />}</GroupeRegles><GroupeRegles titre={initiativeActive ? t('rules.group.equalities') : t('rules.group.organization')} aide={initiativeActive ? t('rules.group.equalitiesHelp') : t('rules.group.organizationHelp')}>{initiativeActive && <OptionsEgalitesCampagne scene={scene} onModifier={onModifierRegles} />}<OptionsOrdreCategoriesCampagne scene={scene} onModifier={onModifierRegles} /></GroupeRegles>{initiativeTextuelleOuverte && <FenetreInitiativeTextuelleEdition config={scene?.initiativeTextOrder} cardSources={cardSources} initiativeTextPresets={initiativeTextPresets} onFermer={() => setInitiativeTextuelleOuverte(false)} onValider={validerInitiativeTextuelle} onEnregistrerPreset={onEnregistrerPresetInitiativeTextuelle} />}</div>;
}
