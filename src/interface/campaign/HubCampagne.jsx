import { useEffect, useRef, useState } from 'react';
import {
  APP_VERSION,
  defaultDeclarationMode,
  defaultCategoryOrder,
  defaultEqualityRule,
  defaultInitiativeOrder,
  defaultPhaseDecrement,
  defaultPhaseActionMode,
  defaultPhaseCount,
  defaultPhaseRerollEachRound,
  defaultStartRound,
  defaultTemporalityMode,
  equalityRuleDescriptions,
  equalityRuleLabels,
  equalityRules,
  initiativeOrderDescriptions,
  initiativeOrderLabels,
  initiativeOrders,
  phaseActionModes,
  temporalityDescriptions,
  temporalityLabels,
  temporalityModes,
} from '../../constants.js';
import { initiativeTextOrderPresetIds, initiativeTextOrderPresetLabel, normalizeInitiativeTextOrder, presetInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreInitiativeTextuelleEdition } from './FenetreInitiativeTextuelleEdition.jsx';
import { OngletTemplates } from './OngletTemplates.jsx';

function OngletsHub({ onglet, setOnglet }) {
  return <div className="grid4 hub-tabs"><button className={`choice ${onglet === 'scenes' ? 'selected' : ''}`} onClick={() => setOnglet('scenes')}>Scenes</button><button className={`choice ${onglet === 'regles' ? 'selected' : ''}`} onClick={() => setOnglet('regles')}>Regles</button><button className={`choice ${onglet === 'sauvegarde' ? 'selected' : ''}`} onClick={() => setOnglet('sauvegarde')}>Sauvegarde</button><button className={`choice ${onglet === 'templates' ? 'selected' : ''}`} onClick={() => setOnglet('templates')}>Templates</button></div>;
}

function EnteteHub({ campaignName, sombre, onChangerTheme }) {
  const logo = sombre ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';
  return <header className="campaign-hub-header panel"><div className="menu-brand campaign-brand-capsule"><img src={logo} alt="Cadence" /><div><strong>{campaignName || 'Campagne Cadence'}</strong><span className="muted">Cadence - v{APP_VERSION}</span></div><button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label="Basculer theme clair ou sombre"><span>☀</span><span>☾</span><i /></button></div></header>;
}

function CarteScene({ scene, index, canDelete, editing, onEditer, onFermerEdition, onChoisirScene, onModifierScene, onDupliquerScene, onSupprimerScene }) {
  const [titre, setTitre] = useState(scene.title || 'Scene');
  const [type, setType] = useState(scene.type || 'Scene');
  const [notes, setNotes] = useState(scene.notes || '');
  const [suppressionVisible, setSuppressionVisible] = useState(false);
  useEffect(() => { if (!editing) return; setTitre(scene.title || 'Scene'); setType(scene.type || 'Scene'); setNotes(scene.notes || ''); }, [editing, scene.notes, scene.title, scene.type]);
  const enregistrer = () => { onModifierScene(index, { title: titre.trim() || 'Scene', type: type.trim() || 'Scene', notes }); onFermerEdition(); };
  return <div className="hub-scene-card">{editing ? <div className="stack hub-scene-edit"><label className="field">Nom<input type="text" value={titre} onChange={(event) => setTitre(event.target.value)} /></label><label className="field">Type<input type="text" value={type} onChange={(event) => setType(event.target.value)} /></label><label className="field">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label><div className="grid2"><button className="primary" onClick={enregistrer}>Enregistrer</button><button className="small-btn" onClick={onFermerEdition}>Annuler</button></div></div> : <><div className="hub-scene-summary"><strong className="hub-scene-title">{scene.title || 'Scene'}</strong><span className="hub-scene-type">{scene.type || 'Scene'}</span>{canDelete && <div className={`hub-scene-delete-actions ${suppressionVisible ? 'confirming' : ''}`}>{suppressionVisible && <button className="small-btn scene-delete-cancel" onClick={() => setSuppressionVisible(false)}>Annuler</button>}{suppressionVisible ? <button className="danger-btn mini-danger scene-delete-confirm" onClick={() => onSupprimerScene(index)}>Suppr.</button> : <button className="small-btn scene-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={`Afficher la suppression de ${scene.title || 'Scene'}`}>x</button>}</div>}</div>{scene.notes && <p className="muted compact-help hub-scene-notes">{scene.notes}</p>}<div className="hub-scene-actions explicit"><button className="primary" onClick={() => onChoisirScene(index)}>Ouvrir</button><button className="small-btn" onClick={() => onEditer(scene.id)}>Modifier</button><button className="small-btn" onClick={() => onDupliquerScene(index)}>Dupliquer</button></div></>}</div>;
}

function OngletScenes({ scenes, editingSceneId, onEditerScene, onFermerEditionScene, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene }) {
  return <div className="stack hub-section panel"><div className="hub-section-head"><h3>Scenes</h3><button className="small-btn" onClick={onNouvelleScene}>Nouvelle scene</button></div><div className="stack hub-scene-list">{scenes.map((scene, index) => <CarteScene key={scene.id} scene={scene} index={index} editing={scene.id === editingSceneId} canDelete={scenes.length > 1} onEditer={onEditerScene} onFermerEdition={onFermerEditionScene} onChoisirScene={onChoisirScene} onModifierScene={onModifierScene} onDupliquerScene={onDupliquerScene} onSupprimerScene={onSupprimerScene} />)}</div></div>;
}

function OptionsTemporaliteCampagne({ temporalite = defaultTemporalityMode, onModifier }) {
  const modes = [temporalityModes.CLASSIC, temporalityModes.FLEXIBLE, temporalityModes.PHASES];
  return <div className="scene-options compact-options advanced-rule-block"><h3>Temporalite</h3><p className="muted compact-help">Regle appliquee aux scenes de la campagne.</p><div className="advanced-radio-list">{modes.map((mode) => <label className={`advanced-radio ${temporalite === mode ? 'selected' : ''}`} key={mode}><input type="radio" name="campaign-temporality-mode" value={mode} checked={temporalite === mode} onChange={(event) => onModifier({ temporalite: event.target.value })} /><span><strong>{temporalityLabels[mode]}</strong><small>{temporalityDescriptions[mode]}</small></span></label>)}</div></div>;
}

function OptionsDeclarationCampagne({ scene, onModifier }) {
  const actif = scene?.declarationMode ?? defaultDeclarationMode;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Declaration</h3><p className="muted compact-help">Ajoute une declaration d'action avant la resolution du round, compatible avec classique, souple et phases.</p><label className={`reset-switch campaign-rule-switch ${actif ? 'active' : ''}`}><span>Declaration puis resolution</span><input type="checkbox" checked={!!actif} onChange={(event) => onModifier({ declarationMode: event.target.checked, declarationStage: event.target.checked ? 'declaration' : '', declarations: {}, resolutionOrder: [], declarationPlayedIds: [] })} /></label></div>;
}

function OptionsDepartCampagne({ startRound = defaultStartRound, onModifier }) {
  const valeur = [0, 1].includes(Number(startRound)) ? Number(startRound) : defaultStartRound;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Apres preparation</h3><p className="muted compact-help">Chaque scene s'ouvre en preparation. Ce reglage choisit ce que lance Commencer.</p><div className="advanced-radio-list"><label className={`advanced-radio ${valeur === 0 ? 'selected' : ''}`}><input type="radio" name="campaign-start-round" checked={valeur === 0} onChange={() => onModifier({ startRound: 0 })} /><span><strong>Surprise</strong><small>Commencer lance un round de surprise avant le Debut R1.</small></span></label><label className={`advanced-radio ${valeur === 1 ? 'selected' : ''}`}><input type="radio" name="campaign-start-round" checked={valeur === 1} onChange={() => onModifier({ startRound: 1 })} /><span><strong>Round 1 direct</strong><small>Commencer place directement la scene au Debut R1.</small></span></label></div></div>;
}

function FenetreSauvegardeRegles({ nomInitial, templateDepart, templates = [], onFermer, onEnregistrer }) {
  const [nom, setNom] = useState(nomInitial || templateDepart?.name || 'Regles personnalisees');
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
    <Fenetre title="Enregistrer le preset" onClose={() => onFermer(null)}>
      <div className="stack rule-save-dialog">
        <label className="field">Nom du preset<input value={nom} onChange={(event) => { setNom(event.target.value); setConfirmation(null); }} autoFocus /></label>
        <div className="rule-save-choices">
          {templateDepart && <button className={`choice ${mode === 'overwrite' ? 'selected' : ''}`} onClick={() => { setMode('overwrite'); setConfirmation(null); }}>Ecraser {templateDepart.name}</button>}
          <button className={`choice ${mode === 'create' ? 'selected' : ''}`} onClick={() => { setMode('create'); setConfirmation(null); }}>Creer un nouveau preset</button>
        </div>
        {conflit && !confirmation && <p className="rule-warning">Un autre preset porte deja ce nom. Cadence demandera confirmation avant de l'ecraser.</p>}
        {confirmation && <div className="delete-confirm"><strong>{confirmation.name} existe deja.</strong><p className="muted compact-help">Tu peux ecraser ce preset avec les regles actuelles, ou changer de nom.</p><div className="grid2"><button className="primary" onClick={() => enregistrer(true, confirmation.id)}>Ecraser ce preset</button><button className="small-btn" onClick={() => setConfirmation(null)}>Changer le nom</button></div></div>}
        {!confirmation && <div className="grid2"><button className="primary" onClick={() => enregistrer(false)} disabled={!nomNettoye}>Enregistrer</button><button className="small-btn" onClick={() => onFermer(null)}>Annuler</button></div>}
      </div>
    </Fenetre>
  );
}

function OptionsTemplatesReglesCampagne({ scene, ruleTemplates = [], dernierTemplateId, nomCourant, editionNom, sauvegardeOk, onChangerNom, onEditerNom, onFermerEditionNom, onAppliquer, onEnregistrer, onSupprimer }) {
  const [templateId, setTemplateId] = useState(ruleTemplates[0]?.id || '');
  const [sauvegardeOuverte, setSauvegardeOuverte] = useState(false);
  useEffect(() => {
    if (!templateId && ruleTemplates[0]?.id) setTemplateId(ruleTemplates[0].id);
    if (templateId && !ruleTemplates.some((template) => template.id === templateId)) setTemplateId(ruleTemplates[0]?.id || '');
  }, [ruleTemplates, templateId]);
  const template = ruleTemplates.find((item) => item.id === templateId) || null;
  const templateDepart = ruleTemplates.find((item) => item.id === dernierTemplateId) || null;
  const appliquer = () => {
    if (!template) return;
    onAppliquer(template);
    setTemplateId(template.id);
  };
  const enregistrer = (options) => onEnregistrer(scene, options);
  return <div className={`scene-options compact-options advanced-rule-block rule-preset-block ${sauvegardeOk ? 'saved' : ''}`}><div className="rule-current-title"><div>{editionNom ? <input value={nomCourant} onChange={(event) => onChangerNom(event.target.value)} onBlur={onFermerEditionNom} onKeyDown={(event) => { if (event.key === 'Enter') onFermerEditionNom(); }} /> : <><h3>{nomCourant || 'Regles personnalisees'}</h3><small className="muted">Preset de depart : {templateDepart?.name || 'perso'}</small></>} </div><button className="icon-btn rule-title-edit" onClick={editionNom ? onFermerEditionNom : onEditerNom} aria-label="Renommer le preset courant">✎</button><button className={`icon-btn rule-save-btn ${sauvegardeOk ? 'confirmed' : ''}`} onClick={() => setSauvegardeOuverte(true)} aria-label="Enregistrer le preset">💾</button></div>{ruleTemplates.length > 0 && <div className="template-rule-row compact-rule-template-row"><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{ruleTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="small-btn" onClick={appliquer} disabled={!template}>Appliquer</button><button className="danger-btn mini-danger" onClick={() => template && onSupprimer(template.id)} disabled={!template}>Suppr.</button></div>}{sauvegardeOk && <div className="rule-save-confirmation">Preset enregistre</div>}{sauvegardeOuverte && <FenetreSauvegardeRegles nomInitial={nomCourant} templateDepart={templateDepart} templates={ruleTemplates} onFermer={(result) => { setSauvegardeOuverte(false); if (result?.template) onAppliquer(result.template, { alreadyApplied: true }); }} onEnregistrer={enregistrer} />}</div>;
}

function OptionsPhasesCampagne({ scene, onModifier }) {
  const mode = scene?.phaseActionMode || defaultPhaseActionMode;
  const modeCoche = mode === phaseActionModes.CHECKED;
  return <div className="scene-options compact-options advanced-rule-block phase-options"><h3>Phases</h3><p className="muted compact-help">Parametres des phases d'initiative pour la campagne.</p><div className="advanced-radio-list"><label className={`advanced-radio ${!modeCoche ? 'selected' : ''}`}><input type="radio" name="campaign-phase-mode" checked={!modeCoche} onChange={() => onModifier({ phaseActionMode: phaseActionModes.AUTOMATIC })} /><span><strong>Phases par initiative</strong><small>Cadence baisse l'initiative a chaque phase et s'arrete quand elle tombe a zero.</small></span></label><label className={`advanced-radio ${modeCoche ? 'selected' : ''}`}><input type="radio" name="campaign-phase-mode" checked={modeCoche} onChange={() => onModifier({ phaseActionMode: phaseActionModes.CHECKED })} /><span><strong>Phases cochees</strong><small>Chaque fiche indique les phases ou elle agit. Les phases vides sont sautees.</small></span></label></div>{modeCoche ? <label className="field">Nombre max de phases<input type="number" min="1" max="20" step="1" value={scene?.phaseCount || defaultPhaseCount} onChange={(event) => onModifier({ phaseCount: event.target.value })} /></label> : <label className="field">Decrement<input type="number" min="1" step="1" value={scene?.phaseDecrement || defaultPhaseDecrement} onChange={(event) => onModifier({ phaseDecrement: event.target.value })} /></label>}</div>;
}

function OptionsEgalitesCampagne({ scene, onModifier }) {
  const equalityRule = scene?.equalityRule || defaultEqualityRule;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Synchronisation</h3><p className="muted compact-help">Definit quand deux participants partagent vraiment le meme tour.</p><div className="advanced-radio-list">{Object.values(equalityRules).map((rule) => <label className={`advanced-radio ${equalityRule === rule ? 'selected' : ''}`} key={rule}><input type="radio" name="campaign-equality-rule" value={rule} checked={equalityRule === rule} onChange={(event) => onModifier({ equalityRule: event.target.value })} /><span><strong>{equalityRuleLabels[rule]}</strong><small>{equalityRuleDescriptions[rule]}</small></span></label>)}</div></div>;
}

function OptionsOrdreInitiativeCampagne({ scene, onModifier }) {
  const initiativeOrder = scene?.initiativeOrder || defaultInitiativeOrder;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Ordre d'initiative</h3><p className="muted compact-help">Sens de parcours des valeurs d'initiative.</p><div className="advanced-radio-list">{Object.values(initiativeOrders).map((order) => <label className={`advanced-radio ${initiativeOrder === order ? 'selected' : ''}`} key={order}><input type="radio" name="campaign-initiative-order" value={order} checked={initiativeOrder === order} onChange={(event) => onModifier({ initiativeOrder: event.target.value })} /><span><strong>{initiativeOrderLabels[order]}</strong><small>{initiativeOrderDescriptions[order]}</small></span></label>)}</div></div>;
}

function OptionsActionsMultiplesCampagne({ scene, onModifier }) {
  const actif = scene?.multipleActionSlots !== false;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Actions multiples</h3><p className="muted compact-help">Autorise une meme fiche a agir a plusieurs moments differents dans l'initiative.</p><label className={`reset-switch campaign-rule-switch ${actif ? 'active' : ''}`}><span>Plusieurs actions par personnage</span><input type="checkbox" checked={actif} onChange={(event) => onModifier({ multipleActionSlots: event.target.checked })} /></label></div>;
}

function OptionsInitiativeTextuelleCampagne({ scene, onModifier, onConfigurer }) {
  const config = normalizeInitiativeTextOrder(scene?.initiativeTextOrder);
  const configLabels = config.parts.length ? { ...config, enabled: true } : presetInitiativeTextOrder(initiativeTextOrderPresetIds.CARDS);
  const choisirNumerique = () => onModifier({ initiativeTextOrder: { ...config, enabled: false } });
  const choisirLabels = () => onModifier({ initiativeTextOrder: configLabels });
  const preset = config.enabled ? initiativeTextOrderPresetLabel(config) : 'Numerique';
  const resume = config.enabled && config.parts.length ? config.parts.map((part) => `${part.label}: ${part.values.length}`).join(' - ') : 'Champs numeriques';
  const avertissement = config.enabled && ((scene?.temporalite === temporalityModes.PHASES && (scene?.phaseActionMode || defaultPhaseActionMode) === phaseActionModes.AUTOMATIC) || scene?.promptInitiativeOnNext);
  return <div className="scene-options compact-options advanced-rule-block initiative-format-block"><div><h3>Saisie d'initiative</h3><small className="muted">Preset : {preset} - {resume}</small></div><div className="advanced-radio-list"><label className={`advanced-radio ${!config.enabled ? 'selected' : ''}`}><input type="radio" name="campaign-initiative-format" checked={!config.enabled} onChange={choisirNumerique} /><span><strong>Numerique</strong><small>Les initiatives sont saisies avec des nombres.</small></span></label><label className={`advanced-radio initiative-label-radio ${config.enabled ? 'selected' : ''}`}><input type="radio" name="campaign-initiative-format" checked={config.enabled} onChange={choisirLabels} /><span><strong>Par labels</strong><small>La saisie utilise les menus du preset choisi.</small></span><button className="small-btn" type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onConfigurer(); }}>Modifier</button></label></div>{avertissement && <p className="rule-warning">Attention : les labels sont moins confortables avec les phases par initiative ou l'ajustement avant Suivant.</p>}</div>;
}

function OptionsAjustementInitiativeCampagne({ scene, onModifier }) {
  const ajustementActif = !!scene?.promptInitiativeOnNext;
  const relanceActif = scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Initiative en cours de round</h3><p className="muted compact-help">Regroupe les options qui demandent ou modifient les initiatives pendant le deroulement.</p><div className="stack"><label className={`reset-switch campaign-rule-switch ${ajustementActif ? 'active' : ''}`}><span>Ajustement avant Suivant</span><input type="checkbox" checked={ajustementActif} onChange={(event) => onModifier({ promptInitiativeOnNext: event.target.checked })} /></label><label className={`reset-switch campaign-rule-switch ${relanceActif ? 'active' : ''}`}><span>Relancer l'initiative au nouveau round</span><input type="checkbox" checked={relanceActif} onChange={(event) => onModifier({ phaseRerollEachRound: event.target.checked })} /></label></div></div>;
}

function OptionsOrdreCategoriesCampagne({ scene, onModifier }) {
  const order = scene?.categoryOrder || defaultCategoryOrder;
  const deplacer = (index, delta) => { const target = index + delta; if (target < 0 || target >= order.length) return; const suivant = [...order]; [suivant[index], suivant[target]] = [suivant[target], suivant[index]]; onModifier({ categoryOrder: suivant }); };
  return <div className="scene-options compact-options advanced-rule-block"><h3>Priorites</h3><p className="muted compact-help">Ordre utilise quand le type departage encore les egalites.</p><div className="stack compact-category-order">{order.map((categorie, index) => <div className="restore-row discreet" key={categorie}><strong>{categorie}</strong><div className="compact-arrows"><button className="small-btn" onClick={() => deplacer(index, -1)} disabled={index <= 0}>^</button><button className="small-btn" onClick={() => deplacer(index, 1)} disabled={index >= order.length - 1}>v</button></div></div>)}</div></div>;
}

function GroupeRegles({ titre, aide, children }) {
  return <section className="rule-group"><div className="rule-group-head"><h3>{titre}</h3>{aide && <p className="muted compact-help">{aide}</p>}</div><div className="rule-group-body">{children}</div></section>;
}

function OngletRegles({ scene, onModifierRegles, ruleTemplates, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onSupprimerTemplateRegles }) {
  const temporalite = scene?.temporalite || defaultTemporalityMode;
  const [initiativeTextuelleOuverte, setInitiativeTextuelleOuverte] = useState(false);
  const [dernierTemplateId, setDernierTemplateId] = useState(ruleTemplates[0]?.id || '');
  const [nomCourant, setNomCourant] = useState(ruleTemplates[0]?.name || 'Regles personnalisees');
  const [editionNom, setEditionNom] = useState(false);
  const [sauvegardeOk, setSauvegardeOk] = useState(false);
  useEffect(() => {
    if (dernierTemplateId && ruleTemplates.some((template) => template.id === dernierTemplateId)) return;
    const premier = ruleTemplates[0];
    setDernierTemplateId(premier?.id || '');
    setNomCourant(premier?.name || 'Regles personnalisees');
  }, [dernierTemplateId, ruleTemplates]);
  useEffect(() => {
    if (!sauvegardeOk) return undefined;
    const timer = window.setTimeout(() => setSauvegardeOk(false), 1800);
    return () => window.clearTimeout(timer);
  }, [sauvegardeOk]);
  const validerInitiativeTextuelle = (patch) => { onModifierRegles(patch); setInitiativeTextuelleOuverte(false); };
  const appliquerTemplate = (template) => {
    if (!template) return;
    onAppliquerTemplateRegles(template.rules);
    setDernierTemplateId(template.id);
    setNomCourant(template.name);
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
  return <div className="stack hub-section panel rules-panel"><div><h3>Regles d'initiative</h3><p className="muted compact-help">Ces reglages sont appliques a toutes les scenes de la campagne et servent de base aux nouvelles scenes.</p></div><OptionsTemplatesReglesCampagne scene={scene} ruleTemplates={ruleTemplates} dernierTemplateId={dernierTemplateId} nomCourant={nomCourant} editionNom={editionNom} sauvegardeOk={sauvegardeOk} onChangerNom={setNomCourant} onEditerNom={() => setEditionNom(true)} onFermerEditionNom={() => setEditionNom(false)} onAppliquer={appliquerTemplate} onEnregistrer={enregistrerTemplate} onSupprimer={onSupprimerTemplateRegles} /><GroupeRegles titre="Deroulement" aide="Ce bloc decide comment un tour commence et comment les personnages jouent."><OptionsDepartCampagne startRound={scene?.startRound} onModifier={onModifierRegles} /><OptionsTemporaliteCampagne temporalite={temporalite} onModifier={onModifierRegles} /><OptionsDeclarationCampagne scene={scene} onModifier={onModifierRegles} />{temporalite === temporalityModes.PHASES && <OptionsPhasesCampagne scene={scene} onModifier={onModifierRegles} />}</GroupeRegles><GroupeRegles titre="Initiative" aide="Saisie, sens de lecture et modifications possibles pendant le round."><OptionsInitiativeTextuelleCampagne scene={scene} onModifier={onModifierRegles} onConfigurer={() => setInitiativeTextuelleOuverte(true)} /><OptionsOrdreInitiativeCampagne scene={scene} onModifier={onModifierRegles} /><OptionsActionsMultiplesCampagne scene={scene} onModifier={onModifierRegles} /><OptionsAjustementInitiativeCampagne scene={scene} onModifier={onModifierRegles} /></GroupeRegles><GroupeRegles titre="Egalites" aide="Ce bloc sert seulement quand plusieurs personnages arrivent au meme moment."><OptionsEgalitesCampagne scene={scene} onModifier={onModifierRegles} /><OptionsOrdreCategoriesCampagne scene={scene} onModifier={onModifierRegles} /></GroupeRegles>{initiativeTextuelleOuverte && <FenetreInitiativeTextuelleEdition config={scene?.initiativeTextOrder} onFermer={() => setInitiativeTextuelleOuverte(false)} onValider={validerInitiativeTextuelle} />}</div>;
}

function OngletSauvegarde({ onExporter, onImporter, onReinitialiser }) {
  const inputImportRef = useRef(null);
  const ouvrirImport = async () => { if (window.showOpenFilePicker) { try { const [handle] = await window.showOpenFilePicker({ multiple: false }); const file = await handle?.getFile(); if (file) onImporter(file); return; } catch (error) { if (error?.name === 'AbortError') return; } } inputImportRef.current?.click(); };
  const importerFichier = (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onImporter(file); };
  return <div className="stack hub-section panel"><h3>Sauvegarde</h3><p className="muted compact-help">Exporte une campagne .cad, importe une sauvegarde Cadence ou reinitialise la demo.</p><div className="grid2"><button className="primary" onClick={onExporter}>Exporter</button><button className="small-btn" onClick={ouvrirImport}>Importer</button><input ref={inputImportRef} className="import-file-input" type="file" aria-label="Importer une campagne" accept=".cad,.json,application/json,text/json,text/plain,application/octet-stream,*/*" onChange={importerFichier} /></div><button className="danger-btn" onClick={onReinitialiser}>Reinitialiser la demo</button></div>;
}

export function HubCampagne({ campaignName, scene, scenes, templates, trackerTemplates, statusTemplates, sceneCounterTemplates, sceneStatusTemplates, ruleTemplates, templateCategories, dark, onChangerTheme, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene, onModifierReglesInitiative, onExporter, onImporter, onReinitialiser, onAjouterTemplateCategorie, onAjouterCategorieTemplate, onRenommerCategorieTemplate, onSupprimerCategorieTemplate, onDeplacerCategorieTemplate, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate, onAjouterTemplateSuivi, onModifierTemplateSuivi, onDupliquerTemplateSuivi, onSupprimerTemplateSuivi, onAjouterTemplateEtat, onModifierTemplateEtat, onDupliquerTemplateEtat, onSupprimerTemplateEtat, onAjouterTemplateCompteurScene, onModifierTemplateCompteurScene, onDupliquerTemplateCompteurScene, onSupprimerTemplateCompteurScene, onAjouterTemplateEtatScene, onModifierTemplateEtatScene, onDupliquerTemplateEtatScene, onSupprimerTemplateEtatScene, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onDupliquerTemplateRegles, onSupprimerTemplateRegles, onImporterTemplates }) {
  const [onglet, setOnglet] = useState('scenes');
  const [editingSceneId, setEditingSceneId] = useState('');
  const [editCreatedSceneWhenReady, setEditCreatedSceneWhenReady] = useState(false);
  useEffect(() => { if (!editCreatedSceneWhenReady || !scene?.id) return; setOnglet('scenes'); setEditingSceneId(scene.id); setEditCreatedSceneWhenReady(false); }, [editCreatedSceneWhenReady, scene?.id]);
  const creerNouvelleScene = () => { onNouvelleScene(); setEditCreatedSceneWhenReady(true); };
  const dupliquerScene = (index) => { onDupliquerScene(index); setEditCreatedSceneWhenReady(true); };
  return <div className="campaign-page shell"><EnteteHub campaignName={campaignName} sombre={dark} onChangerTheme={onChangerTheme} /><main className="campaign-hub-page"><OngletsHub onglet={onglet} setOnglet={setOnglet} />{onglet === 'scenes' && <OngletScenes scenes={scenes} editingSceneId={editingSceneId} onEditerScene={setEditingSceneId} onFermerEditionScene={() => setEditingSceneId('')} onChoisirScene={onChoisirScene} onNouvelleScene={creerNouvelleScene} onModifierScene={onModifierScene} onDupliquerScene={dupliquerScene} onSupprimerScene={onSupprimerScene} />}{onglet === 'regles' && <OngletRegles scene={scene} onModifierRegles={onModifierReglesInitiative} ruleTemplates={ruleTemplates} onAppliquerTemplateRegles={onAppliquerTemplateRegles} onEnregistrerTemplateRegles={onEnregistrerTemplateRegles} onDupliquerTemplateRegles={onDupliquerTemplateRegles} onSupprimerTemplateRegles={onSupprimerTemplateRegles} />}{onglet === 'sauvegarde' && <OngletSauvegarde onExporter={onExporter} onImporter={onImporter} onReinitialiser={onReinitialiser} />}{onglet === 'templates' && <OngletTemplates categories={templateCategories} templates={templates} trackerTemplates={trackerTemplates} statusTemplates={statusTemplates} sceneCounterTemplates={sceneCounterTemplates} sceneStatusTemplates={sceneStatusTemplates} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onAjouterCategorie={onAjouterCategorieTemplate} onRenommerCategorie={onRenommerCategorieTemplate} onSupprimerCategorie={onSupprimerCategorieTemplate} onDeplacerCategorie={onDeplacerCategorieTemplate} onChangerCategorieTemplate={onChangerCategorieTemplate} onEditerTemplate={onEditerTemplate} onDupliquerTemplate={onDupliquerTemplate} onSupprimerTemplate={onSupprimerTemplate} onAjouterTemplateSuivi={onAjouterTemplateSuivi} onModifierTemplateSuivi={onModifierTemplateSuivi} onDupliquerTemplateSuivi={onDupliquerTemplateSuivi} onSupprimerTemplateSuivi={onSupprimerTemplateSuivi} onAjouterTemplateEtat={onAjouterTemplateEtat} onModifierTemplateEtat={onModifierTemplateEtat} onDupliquerTemplateEtat={onDupliquerTemplateEtat} onSupprimerTemplateEtat={onSupprimerTemplateEtat} onAjouterTemplateCompteurScene={onAjouterTemplateCompteurScene} onModifierTemplateCompteurScene={onModifierTemplateCompteurScene} onDupliquerTemplateCompteurScene={onDupliquerTemplateCompteurScene} onSupprimerTemplateCompteurScene={onSupprimerTemplateCompteurScene} onAjouterTemplateEtatScene={onAjouterTemplateEtatScene} onModifierTemplateEtatScene={onModifierTemplateEtatScene} onDupliquerTemplateEtatScene={onDupliquerTemplateEtatScene} onSupprimerTemplateEtatScene={onSupprimerTemplateEtatScene} onImporterTemplates={onImporterTemplates} />}</main></div>;
}
