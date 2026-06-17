import { useEffect, useMemo, useState } from 'react';
import {
  defaultDeclarationMode,
  defaultCategoryOrder,
  defaultEqualityRule,
  defaultFlexibleUseInitiative,
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
  equalityRuleDescriptions,
  equalityRuleLabels,
  equalityRules,
  initiativeOrderDescriptions,
  initiativeOrderLabels,
  initiativeOrders,
  multipleActionModes,
  phaseActionModes,
  participantKinds,
  temporalityDescriptions,
  temporalityLabels,
  temporalityModes,
} from '../../constants.js';
import { multipleActionModeFromRules, normalizeInitiativeCostQuickCosts } from '../../domain/initiativeCost.js';
import { initiativeTextOrderPresetIds, initiativeTextOrderPresetLabel, normalizeInitiativeTextOrder, presetInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { activeRuleSummary, canRerollInitiativeEachRound, ruleCompatibilityIssues, ruleOptionAvailability, temporalityPatch } from '../../domain/ruleCompatibility.js';
import { rulePresetFamilies } from '../../rulePresets.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreInitiativeTextuelleEdition } from './FenetreInitiativeTextuelleEdition.jsx';

function AvertissementBlocage({ availability }) {
  return availability?.disabled && availability.reason ? <p className="rule-warning">{availability.reason}</p> : null;
}

function ResumeReglesActives({ scene }) {
  const resume = activeRuleSummary(scene);
  const issues = ruleCompatibilityIssues(scene);
  return <div className={`scene-options compact-options advanced-rule-block active-rules-summary ${issues.length ? 'has-issues' : ''}`}><h3>{t('rules.activeTitle')}</h3><p className="muted compact-help">{resume.join(' - ')}</p>{issues.map((issue) => <p className="rule-warning" key={issue.id}>{issue.message}</p>)}</div>;
}

function OptionsTemporaliteCampagne({ scene, temporalite = defaultTemporalityMode, availability, onModifier }) {
  const modes = [temporalityModes.CLASSIC, temporalityModes.FLEXIBLE, temporalityModes.PHASES];
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.temporality.title')}</h3><p className="muted compact-help">Règle appliquée aux scènes de la campagne.</p><div className="advanced-radio-list">{modes.map((mode) => { const option = availability?.temporality?.[mode]; const indisponible = temporalite !== mode && option?.disabled; return <label className={`advanced-radio ${temporalite === mode ? 'selected' : ''} ${indisponible ? 'disabled' : ''}`} key={mode}><input type="radio" name="campaign-temporality-mode" value={mode} checked={temporalite === mode} disabled={indisponible} onChange={(event) => onModifier(temporalityPatch(scene, event.target.value))} /><span><strong>{temporalityLabels[mode]}</strong><small>{temporalityDescriptions[mode]}</small>{indisponible && <small className="rule-option-warning">{option.reason}</small>}</span></label>; })}</div></div>;
}

function OptionsDeclarationCampagne({ scene, availability, onModifier }) {
  const actif = scene?.declarationMode ?? defaultDeclarationMode;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.declaration.title')}</h3><p className="muted compact-help">Ajoute une déclaration d’action avant la résolution du round, compatible avec classique, souple et phases.</p><label className={`reset-switch campaign-rule-switch ${actif ? 'active' : ''} ${!actif && availability?.disabled ? 'disabled' : ''}`}><span>{t('rules.declaration.mode')}</span><input type="checkbox" checked={!!actif} disabled={!actif && availability?.disabled} onChange={(event) => onModifier({ declarationMode: event.target.checked, declarationStage: event.target.checked ? 'declaration' : '', declarations: {}, resolutionOrder: [], declarationPlayedIds: [] })} /></label><AvertissementBlocage availability={availability} /></div>;
}

function OptionsSurpriseCampagne({ scene, availability, onModifier }) {
  const impact = scene?.surpriseImpact || defaultSurpriseImpact;
  const activationDisabled = availability?.activation?.disabled;
  const advanceOn = activationDisabled ? 'round' : scene?.surpriseAdvanceOn === 'round' ? 'round' : 'activation';
  return <div className="scene-options compact-options advanced-rule-block surprise-rule-options"><h3>{t('rules.surprise.title')}</h3><p className="muted compact-help">La surprise est choisie au lancement depuis la page de préparation. Ces règles décident son effet automatique et son évolution.</p><label className={`reset-switch campaign-rule-switch ${scene?.surpriseDedicatedRound ? 'active' : ''}`}><span>{t('rules.surprise.dedicatedRound')}</span><input type="checkbox" checked={!!scene?.surpriseDedicatedRound} onChange={(event) => onModifier({ surpriseDedicatedRound: event.target.checked })} /></label><div className="advanced-radio-list"><label className={`advanced-radio ${impact === 'limited' ? 'selected' : ''}`}><input type="radio" name="campaign-surprise-impact" value="limited" checked={impact === 'limited'} onChange={(event) => onModifier({ surpriseImpact: event.target.value })} /><span><strong>{t('rules.surprise.limited')}</strong><small>Le personnage reste jouable mais son état contraint est signalé.</small></span></label><label className={`advanced-radio ${impact === 'inactive' ? 'selected' : ''}`}><input type="radio" name="campaign-surprise-impact" value="inactive" checked={impact === 'inactive'} onChange={(event) => onModifier({ surpriseImpact: event.target.value })} /><span><strong>{t('rules.surprise.inactive')}</strong><small>Le personnage est visuellement mis hors jeu tant que l’état Surpris dure.</small></span></label></div><div className="advanced-radio-list surprise-advance-options"><label className={`advanced-radio ${advanceOn === 'activation' ? 'selected' : ''} ${activationDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-surprise-advance" value="activation" checked={advanceOn === 'activation'} disabled={activationDisabled} onChange={(event) => onModifier({ surpriseAdvanceOn: event.target.value })} /><span><strong>{t('rules.surprise.advance.activation')}</strong><small>L’état prend fin à l’activation suivante du personnage.</small>{activationDisabled && <small className="rule-option-warning">{availability.activation.reason}</small>}</span></label><label className={`advanced-radio ${advanceOn === 'round' ? 'selected' : ''}`}><input type="radio" name="campaign-surprise-advance" value="round" checked={advanceOn === 'round'} onChange={(event) => onModifier({ surpriseAdvanceOn: event.target.value })} /><span><strong>{t('rules.surprise.advance.round')}</strong><small>L’état prend fin au début du round suivant.</small></span></label></div></div>;
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
        {conflit && !confirmation && <p className="rule-warning">Un autre preset porte déjà ce nom. Cadence demandera confirmation avant de l’écraser.</p>}
        {confirmation && <div className="delete-confirm"><strong>{confirmation.name} existe déjà.</strong><p className="muted compact-help">Tu peux écraser ce preset avec les règles actuelles, ou changer de nom.</p><div className="grid2"><button className="primary" onClick={() => enregistrer(true, confirmation.id)}>{t('rules.preset.overwriteCurrent')}</button><button className="small-btn" onClick={() => setConfirmation(null)}>{t('rules.preset.rename')}</button></div></div>}
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
    : t('rules.preset.starting', { name: templateDepart?.name || 'perso' });
  const appliquer = () => {
    if (!template) return;
    onAppliquer(template);
    setTemplateId(template.id);
  };
  const enregistrer = (options) => onEnregistrer(scene, options);
  return <div className={`scene-options compact-options advanced-rule-block rule-preset-block ${sauvegardeOk ? 'saved' : ''}`}><div className="rule-current-title"><div>{editionNom ? <input value={nomCourant} onChange={(event) => onChangerNom(event.target.value)} onBlur={onFermerEditionNom} onKeyDown={(event) => { if (event.key === 'Enter') onFermerEditionNom(); }} /> : <><h3>{nomCourant || snapshotLabel}</h3><small className="muted">{snapshotSubLabel}</small></>} </div><button className="icon-btn rule-title-edit" onClick={editionNom ? onFermerEditionNom : onEditerNom} aria-label={t('rules.preset.renameCurrent')}>&#9998;</button><button className={`icon-btn rule-save-btn ${sauvegardeOk ? 'confirmed' : ''}`} onClick={() => setSauvegardeOuverte(true)} aria-label={t('rules.preset.saveCurrent')}>&#128190;</button></div>{ruleTemplates.length > 0 && <div className="template-rule-row compact-rule-template-row"><select value={familleId} onChange={(event) => setFamilleId(event.target.value)}>{familles.map((famille) => <option key={famille.id} value={famille.id}>{famille.label}</option>)}</select><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templatesFamille.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select><button className="small-btn" onClick={appliquer} disabled={!template}>{t('common.apply')}</button><button className="danger-btn mini-danger" onClick={() => template && !template.readOnly && onSupprimer(template.id)} disabled={!template || template.readOnly}>{t('rules.preset.deleteShort')}</button></div>}{sauvegardeOk && <div className="rule-save-confirmation">{t('rules.preset.saved')}</div>}{sauvegardeOuverte && <FenetreSauvegardeRegles nomInitial={nomCourant || snapshotLabel} templateDepart={templateDepartEditable} templates={editableTemplates} onFermer={(result) => { setSauvegardeOuverte(false); if (result?.template) onAppliquer(result.template, { alreadyApplied: true }); }} onEnregistrer={enregistrer} />}</div>;
}

function OptionsPhasesCampagne({ scene, availability, onModifier }) {
  const mode = scene?.phaseActionMode || defaultPhaseActionMode;
  const modeCoche = mode === phaseActionModes.CHECKED;
  const automaticAvailability = availability?.phaseActionMode?.[phaseActionModes.AUTOMATIC];
  const checkedAvailability = availability?.phaseActionMode?.[phaseActionModes.CHECKED];
  const automaticDisabled = modeCoche && automaticAvailability?.disabled;
  const checkedDisabled = !modeCoche && checkedAvailability?.disabled;
  return <div className="scene-options compact-options advanced-rule-block phase-options"><h3>{t('rules.phase.title')}</h3><p className="muted compact-help">Paramètres des phases d’initiative pour la campagne.</p><div className="advanced-radio-list"><label className={`advanced-radio ${!modeCoche ? 'selected' : ''} ${automaticDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-phase-mode" checked={!modeCoche} disabled={automaticDisabled} onChange={() => onModifier({ phaseActionMode: phaseActionModes.AUTOMATIC })} /><span><strong>{t('rules.phase.byInitiative')}</strong><small>Cadence baisse l’initiative à chaque phase et s’arrête quand elle tombe à zéro.</small>{automaticAvailability?.disabled && <small className="rule-option-warning">{automaticAvailability.reason}</small>}</span></label><label className={`advanced-radio ${modeCoche ? 'selected' : ''} ${checkedDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-phase-mode" checked={modeCoche} disabled={checkedDisabled} onChange={() => onModifier({ phaseActionMode: phaseActionModes.CHECKED })} /><span><strong>{t('rules.phase.checked')}</strong><small>Chaque fiche indique les phases où elle agit. Les phases vides sont sautées.</small>{checkedAvailability?.disabled && <small className="rule-option-warning">{checkedAvailability.reason}</small>}</span></label></div>{modeCoche ? <label className="field">{t('rules.phase.max')}<input type="number" min="1" max="20" step="1" value={scene?.phaseCount || defaultPhaseCount} onChange={(event) => onModifier({ phaseCount: event.target.value })} /></label> : <label className="field">{t('rules.phase.decrement')}<input type="number" min="1" step="1" value={scene?.phaseDecrement || defaultPhaseDecrement} onChange={(event) => onModifier({ phaseDecrement: event.target.value })} /></label>}</div>;
}

function OptionsEgalitesCampagne({ scene, onModifier }) {
  const equalityRule = scene?.equalityRule || defaultEqualityRule;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.equality.title')}</h3><p className="muted compact-help">Définit quand deux participants partagent vraiment le même créneau.</p><div className="advanced-radio-list">{Object.values(equalityRules).map((rule) => <label className={`advanced-radio ${equalityRule === rule ? 'selected' : ''}`} key={rule}><input type="radio" name="campaign-equality-rule" value={rule} checked={equalityRule === rule} onChange={(event) => onModifier({ equalityRule: event.target.value })} /><span><strong>{equalityRuleLabels[rule]}</strong><small>{equalityRuleDescriptions[rule]}</small></span></label>)}</div></div>;
}

function OptionsOrdreInitiativeCampagne({ scene, onModifier }) {
  const initiativeOrder = scene?.initiativeOrder || defaultInitiativeOrder;
  const souple = scene?.temporalite === temporalityModes.FLEXIBLE;
  const utiliseInitiative = !souple || (scene?.flexibleUseInitiative ?? defaultFlexibleUseInitiative);
  const coutInitiative = multipleActionModeFromRules(scene) === multipleActionModes.INITIATIVE_COST;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.initiativeOrder.title')}</h3><p className="muted compact-help">Sens de parcours des valeurs d’initiative.</p>{souple && <><p className="muted compact-help">En mode souple, l’ordre d’initiative ne force pas la séquence de jeu. Il sert seulement à organiser visuellement les personnages et à aider le MJ à suivre qui peut agir.</p><label className={`reset-switch campaign-rule-switch ${utiliseInitiative ? 'active' : ''}`}><span>{t('rules.initiativeOrder.use')}</span><input type="checkbox" checked={utiliseInitiative} onChange={(event) => onModifier({ flexibleUseInitiative: event.target.checked })} /></label>{!utiliseInitiative && <p className="rule-option-note">Sans initiative, les personnages sont classés par type puis par ordre alphabétique. Les anciennes valeurs restent conservées mais sont ignorées.</p>}</>}{utiliseInitiative && <div className="advanced-radio-list">{Object.values(initiativeOrders).map((order) => { const disabled = coutInitiative && order === initiativeOrders.ASC; return <label className={`advanced-radio ${initiativeOrder === order ? 'selected' : ''} ${disabled ? 'disabled' : ''}`} key={order}><input type="radio" name="campaign-initiative-order" value={order} checked={initiativeOrder === order} disabled={disabled} onChange={(event) => onModifier({ initiativeOrder: event.target.value })} /><span><strong>{initiativeOrderLabels[order]}</strong><small>{initiativeOrderDescriptions[order]}</small>{disabled && <small className="rule-option-warning">Indisponible avec le coût d’initiative.</small>}</span></label>; })}</div>}</div>;
}

function OptionsDepartageCampagne({ scene, onModifier }) {
  const visible = scene?.tiebreakerVisible ?? defaultTiebreakerVisible;
  const label = scene?.tiebreakerLabel || defaultTiebreakerLabel;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.tiebreaker.title')}</h3><p className="muted compact-help">Champ secondaire optionnel utilisé pour ordonner les initiatives égales.</p><label className={`reset-switch campaign-rule-switch ${visible ? 'active' : ''}`}><span>{t('rules.tiebreaker.show')}</span><input type="checkbox" checked={visible} onChange={(event) => onModifier({ tiebreakerVisible: event.target.checked })} /></label>{visible ? <label className="field">{t('rules.tiebreaker.label')}<input value={label} onChange={(event) => onModifier({ tiebreakerLabel: event.target.value })} /></label> : <p className="rule-option-note">Les anciennes valeurs restent conservées mais n’influencent plus le tri.</p>}</div>;
}

function OptionsActionsMultiplesCampagne({ scene, availability, onModifier }) {
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
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.multipleActions.title')}</h3><p className="muted compact-help">Choix exclusif pour les actions multiples dans le round.</p><div className="advanced-radio-list"><label className={`advanced-radio ${mode === multipleActionModes.NONE ? 'selected' : ''}`}><input type="radio" name="campaign-multiple-actions" checked={mode === multipleActionModes.NONE} onChange={() => setMode(multipleActionModes.NONE)} /><span><strong>{t('rules.multipleActions.none')}</strong><small>Une seule activation d’initiative par personnage.</small></span></label><label className={`advanced-radio ${mode === multipleActionModes.MANUAL ? 'selected' : ''} ${manualDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-multiple-actions" checked={mode === multipleActionModes.MANUAL} disabled={manualDisabled} onChange={() => setMode(multipleActionModes.MANUAL)} /><span><strong>{t('rules.multipleActions.manual')}</strong><small>Le MJ saisit plusieurs créneaux au lancement.</small>{manualDisabled && <small className="rule-option-warning">{availability.reason}</small>}</span></label><label className={`advanced-radio ${mode === multipleActionModes.INITIATIVE_COST ? 'selected' : ''} ${costDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-multiple-actions" checked={mode === multipleActionModes.INITIATIVE_COST} disabled={costDisabled} onChange={() => setMode(multipleActionModes.INITIATIVE_COST)} /><span><strong>{t('rules.multipleActions.initiativeCost')}</strong><small>Après une action, le coût crée un nouveau créneau plus bas si le seuil le permet.</small>{costDisabled && <small className="rule-option-warning">{costAvailability.reason}</small>}</span></label></div>{mode === multipleActionModes.INITIATIVE_COST && <div className="initiative-cost-rule-fields"><label className="field">{t('rules.multipleActions.threshold')}<input type="number" inputMode="numeric" value={scene?.initiativeCostThreshold ?? defaultInitiativeCostThreshold} onChange={(event) => onModifier({ initiativeCostThreshold: event.target.value })} /></label><p className="rule-option-note">Si l’initiative après coût est inférieure ou égale à ce seuil, le personnage ne reçoit pas de nouveau créneau ce round.</p><label className="field">{t('rules.multipleActions.quickCosts')}<input value={quickCosts} onChange={(event) => onModifier({ initiativeCostQuickCosts: event.target.value.split(',').map((item) => item.trim()) })} /></label><label className={`reset-switch campaign-rule-switch ${limiteCoutActif ? 'active' : ''}`}><span>{t('rules.multipleActions.limitCost')}</span><input type="checkbox" checked={!!limiteCoutActif} onChange={(event) => onModifier({ initiativeCostLimitToCurrent: event.target.checked })} /></label></div>}</div>;
}

function OptionsInitiativeTextuelleCampagne({ scene, availability, onModifier, onConfigurer }) {
  const config = normalizeInitiativeTextOrder(scene?.initiativeTextOrder);
  const configLabels = config.parts.length ? { ...config, enabled: true } : presetInitiativeTextOrder(initiativeTextOrderPresetIds.CARDS);
  const choisirNumerique = () => onModifier({ initiativeTextOrder: { ...config, enabled: false } });
  const choisirLabels = () => onModifier({ initiativeTextOrder: configLabels });
  const preset = config.enabled ? initiativeTextOrderPresetLabel(config) : 'Numérique';
  const resume = config.enabled && config.parts.length ? config.parts.map((part) => `${part.label}: ${part.values.length}`).join(' - ') : 'Champs numériques';
  const labelsDisabled = !config.enabled && availability?.disabled;
  return <div className="scene-options compact-options advanced-rule-block initiative-format-block"><div><h3>{t('rules.initiativeFormat.title')}</h3><small className="muted">Préréglage : {preset} - {resume}</small></div><div className="advanced-radio-list"><label className={`advanced-radio ${!config.enabled ? 'selected' : ''}`}><input type="radio" name="campaign-initiative-format" checked={!config.enabled} onChange={choisirNumerique} /><span><strong>{t('rules.initiativeFormat.numeric')}</strong><small>Les initiatives sont saisies avec des nombres.</small></span></label><label className={`advanced-radio initiative-label-radio ${config.enabled ? 'selected' : ''} ${labelsDisabled ? 'disabled' : ''}`}><input type="radio" name="campaign-initiative-format" checked={config.enabled} disabled={labelsDisabled} onChange={choisirLabels} /><span><strong>{t('rules.initiativeFormat.labels')}</strong><small>La saisie utilise les menus du préréglage choisi.</small>{availability?.disabled && <small className="rule-option-warning">{availability.reason}</small>}</span><button className="small-btn" type="button" disabled={labelsDisabled} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onConfigurer(); }}>{t('rules.initiativeFormat.modify')}</button></label></div></div>;
}

function OptionsRelanceInitiativeCampagne({ scene, onModifier }) {
  const relanceActif = scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound;
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.newRound.title')}</h3><label className={`reset-switch campaign-rule-switch ${relanceActif ? 'active' : ''}`}><span>{t('rules.newRound.reroll')}</span><input type="checkbox" checked={relanceActif} onChange={(event) => onModifier({ phaseRerollEachRound: event.target.checked })} /></label></div>;
}

function OptionsOrdreCategoriesCampagne({ scene, onModifier }) {
  const order = scene?.categoryOrder || defaultCategoryOrder;
  const [nouvelleCategorie, setNouvelleCategorie] = useState('');
  const deplacer = (index, delta) => { const target = index + delta; if (target < 0 || target >= order.length) return; const suivant = [...order]; [suivant[index], suivant[target]] = [suivant[target], suivant[index]]; onModifier({ categoryOrder: suivant }); };
  const ajouter = () => { const valeur = nouvelleCategorie.trim(); if (!valeur || order.some((categorie) => categorie.toLocaleLowerCase() === valeur.toLocaleLowerCase())) return; onModifier({ categoryOrder: [...order, valeur] }); setNouvelleCategorie(''); };
  const retirer = (categorie) => onModifier({ categoryOrder: order.filter((item) => item !== categorie) });
  return <div className="scene-options compact-options advanced-rule-block"><h3>{t('rules.categories.title')}</h3><p className="muted compact-help">Ordre utilisé pour classer les personnages et départager les initiatives encore égales. Il n’impose pas une activation supplémentaire et reste distinct des libellés d’initiative.</p><div className="stack compact-category-order">{order.map((categorie, index) => <div className="restore-row discreet" key={categorie}><strong>{categorie}</strong><div className="compact-arrows"><button className="small-btn" onClick={() => deplacer(index, -1)} disabled={index <= 0}>^</button><button className="small-btn" onClick={() => deplacer(index, 1)} disabled={index >= order.length - 1}>v</button>{!participantKinds.includes(categorie) && <button className="small-btn subtle-danger" onClick={() => retirer(categorie)} aria-label={t('rules.categories.delete', { category: categorie })}>x</button>}</div></div>)}</div><div className="template-picker-row"><input value={nouvelleCategorie} placeholder={t('rules.categories.new')} onChange={(event) => setNouvelleCategorie(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') ajouter(); }} /><button className="small-btn" onClick={ajouter} disabled={!nouvelleCategorie.trim()}>{t('rules.categories.add')}</button></div></div>;
}

function GroupeRegles({ titre, aide, children }) {
  return <section className="rule-group"><div className="rule-group-head"><h3>{titre}</h3>{aide && <p className="muted compact-help">{aide}</p>}</div><div className="rule-group-body">{children}</div></section>;
}

export function OngletRegles({ scene, rulePresetSnapshot, onModifierRegles, ruleTemplates, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onSupprimerTemplateRegles }) {
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
  return <div className="stack hub-section panel rules-panel"><div><h3>{t('rules.title')}</h3><p className="muted compact-help">Ces réglages sont appliqués à toutes les scènes de la campagne et servent de base aux nouvelles scènes.</p></div><OptionsTemplatesReglesCampagne scene={scene} ruleTemplates={ruleTemplates} rulePresetSnapshot={rulePresetSnapshot} dernierTemplateId={dernierTemplateId} nomCourant={nomCourant} editionNom={editionNom} sauvegardeOk={sauvegardeOk} onChangerNom={setNomCourant} onEditerNom={() => setEditionNom(true)} onFermerEditionNom={() => setEditionNom(false)} onAppliquer={appliquerTemplate} onEnregistrer={enregistrerTemplate} onSupprimer={onSupprimerTemplateRegles} /><ResumeReglesActives scene={scene} /><GroupeRegles titre={t('rules.group.development')} aide="Ce bloc décide comment un round commence et comment les personnages jouent."><OptionsTemporaliteCampagne scene={scene} temporalite={temporalite} availability={availability} onModifier={onModifierRegles} />{temporalite === temporalityModes.PHASES && <OptionsPhasesCampagne scene={scene} availability={availability} onModifier={onModifierRegles} />}<OptionsSurpriseCampagne scene={scene} availability={availability.surpriseAdvanceOn} onModifier={onModifierRegles} /></GroupeRegles><GroupeRegles titre={t('rules.group.initiative')} aide="Saisie, sens de lecture et modifications possibles pendant le round.">{initiativeActive && <OptionsInitiativeTextuelleCampagne scene={scene} availability={availability.labelInitiative} onModifier={onModifierRegles} onConfigurer={() => setInitiativeTextuelleOuverte(true)} />}<OptionsOrdreInitiativeCampagne scene={scene} onModifier={onModifierRegles} />{initiativeActive && <OptionsDepartageCampagne scene={scene} onModifier={onModifierRegles} />}<OptionsActionsMultiplesCampagne scene={scene} availability={availability.multipleActionSlots} onModifier={onModifierRegles} /><OptionsDeclarationCampagne scene={scene} availability={availability.declarationMode} onModifier={onModifierRegles} />{relanceInitiativeVisible && <OptionsRelanceInitiativeCampagne scene={scene} onModifier={onModifierRegles} />}</GroupeRegles><GroupeRegles titre={initiativeActive ? t('rules.group.equalities') : t('rules.group.organization')} aide={initiativeActive ? 'Ce bloc sert seulement quand plusieurs personnages arrivent au même moment.' : 'Ce bloc définit le classement visuel du mode souple.'}>{initiativeActive && <OptionsEgalitesCampagne scene={scene} onModifier={onModifierRegles} />}<OptionsOrdreCategoriesCampagne scene={scene} onModifier={onModifierRegles} /></GroupeRegles>{initiativeTextuelleOuverte && <FenetreInitiativeTextuelleEdition config={scene?.initiativeTextOrder} onFermer={() => setInitiativeTextuelleOuverte(false)} onValider={validerInitiativeTextuelle} />}</div>;
}
