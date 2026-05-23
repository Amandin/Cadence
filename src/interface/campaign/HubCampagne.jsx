import { useEffect, useRef, useState } from 'react';
import {
  APP_VERSION,
  defaultCategoryOrder,
  defaultEqualityRule,
  defaultInitiativeOrder,
  defaultPhaseDecrement,
  defaultPhaseRerollEachRound,
  defaultStartRound,
  defaultTemporalityMode,
  equalityRuleDescriptions,
  equalityRuleLabels,
  equalityRules,
  initiativeOrderDescriptions,
  initiativeOrderLabels,
  initiativeOrders,
  temporalityDescriptions,
  temporalityLabels,
  temporalityModes,
} from '../../constants.js';
import { initiativeTextOrderPresetIds, initiativeTextOrderPresets, normalizeInitiativeTextOrder, presetInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { OngletTemplates } from './OngletTemplates.jsx';

function OngletsHub({ onglet, setOnglet }) {
  return <div className="grid4 hub-tabs"><button className={`choice ${onglet === 'scenes' ? 'selected' : ''}`} onClick={() => setOnglet('scenes')}>Scènes</button><button className={`choice ${onglet === 'regles' ? 'selected' : ''}`} onClick={() => setOnglet('regles')}>Règles</button><button className={`choice ${onglet === 'sauvegarde' ? 'selected' : ''}`} onClick={() => setOnglet('sauvegarde')}>Sauvegarde</button><button className={`choice ${onglet === 'templates' ? 'selected' : ''}`} onClick={() => setOnglet('templates')}>Templates</button></div>;
}

function EnteteHub({ campaignName, sombre, onChangerTheme }) {
  const logo = sombre ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';
  return <header className="campaign-hub-header panel"><div className="menu-brand campaign-brand-capsule"><img src={logo} alt="Cadence" /><div><strong>{campaignName || 'Campagne Cadence'}</strong><span className="muted">Cadence · v{APP_VERSION}</span></div><button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label="Basculer thème clair ou sombre"><span>☀</span><span>☾</span><i /></button></div></header>;
}

function CarteScene({ scene, index, canDelete, editing, onEditer, onFermerEdition, onChoisirScene, onModifierScene, onDupliquerScene, onSupprimerScene }) {
  const [titre, setTitre] = useState(scene.title || 'Scène');
  const [type, setType] = useState(scene.type || 'Scène');
  const [notes, setNotes] = useState(scene.notes || '');
  const [suppressionVisible, setSuppressionVisible] = useState(false);
  useEffect(() => { if (!editing) return; setTitre(scene.title || 'Scène'); setType(scene.type || 'Scène'); setNotes(scene.notes || ''); }, [editing, scene.notes, scene.title, scene.type]);
  const enregistrer = () => { onModifierScene(index, { title: titre.trim() || 'Scène', type: type.trim() || 'Scène', notes }); onFermerEdition(); };
  return <div className="hub-scene-card">{editing ? <div className="stack hub-scene-edit"><label className="field">Nom<input type="text" value={titre} onChange={(event) => setTitre(event.target.value)} /></label><label className="field">Type<input type="text" value={type} onChange={(event) => setType(event.target.value)} /></label><label className="field">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label><div className="grid2"><button className="primary" onClick={enregistrer}>Enregistrer</button><button className="small-btn" onClick={onFermerEdition}>Annuler</button></div></div> : <><div className="hub-scene-summary"><strong className="hub-scene-title">{scene.title || 'Scène'}</strong><span className="hub-scene-type">{scene.type || 'Scène'}</span>{canDelete && <div className={`hub-scene-delete-actions ${suppressionVisible ? 'confirming' : ''}`}>{suppressionVisible && <button className="small-btn scene-delete-cancel" onClick={() => setSuppressionVisible(false)}>Annuler</button>}{suppressionVisible ? <button className="danger-btn mini-danger scene-delete-confirm" onClick={() => onSupprimerScene(index)}>Suppr.</button> : <button className="small-btn scene-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={`Afficher la suppression de ${scene.title || 'Scène'}`}>×</button>}</div>}</div>{scene.notes && <p className="muted compact-help hub-scene-notes">{scene.notes}</p>}<div className="hub-scene-actions explicit"><button className="primary" onClick={() => onChoisirScene(index)}>Ouvrir</button><button className="small-btn" onClick={() => onEditer(scene.id)}>Modifier</button><button className="small-btn" onClick={() => onDupliquerScene(index)}>Dupliquer</button></div></>}</div>;
}

function OngletScenes({ scenes, editingSceneId, onEditerScene, onFermerEditionScene, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene }) {
  return <div className="stack hub-section panel"><div className="hub-section-head"><h3>Scènes</h3><button className="small-btn" onClick={onNouvelleScene}>Nouvelle scène</button></div><div className="stack hub-scene-list">{scenes.map((scene, index) => <CarteScene key={scene.id} scene={scene} index={index} editing={scene.id === editingSceneId} canDelete={scenes.length > 1} onEditer={onEditerScene} onFermerEdition={onFermerEditionScene} onChoisirScene={onChoisirScene} onModifierScene={onModifierScene} onDupliquerScene={onDupliquerScene} onSupprimerScene={onSupprimerScene} />)}</div></div>;
}

function OptionsTemporaliteCampagne({ temporalite = defaultTemporalityMode, onModifier }) {
  return <div className="scene-options compact-options advanced-rule-block"><h3>Temporalité</h3><p className="muted compact-help">Règle appliquée aux scènes de la campagne.</p><div className="advanced-radio-list">{Object.values(temporalityModes).map((mode) => <label className={`advanced-radio ${temporalite === mode ? 'selected' : ''}`} key={mode}><input type="radio" name="campaign-temporality-mode" value={mode} checked={temporalite === mode} onChange={(event) => onModifier({ temporalite: event.target.value })} /><span><strong>{temporalityLabels[mode]}</strong><small>{temporalityDescriptions[mode]}</small></span></label>)}</div></div>;
}

function OptionsDepartCampagne({ startRound = defaultStartRound, onModifier }) {
  const valeur = [0, 1].includes(Number(startRound)) ? Number(startRound) : defaultStartRound;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Après préparation</h3><p className="muted compact-help">Chaque scène s’ouvre en préparation. Ce réglage choisit ce que lance Commencer.</p><div className="advanced-radio-list"><label className={`advanced-radio ${valeur === 0 ? 'selected' : ''}`}><input type="radio" name="campaign-start-round" checked={valeur === 0} onChange={() => onModifier({ startRound: 0 })} /><span><strong>Surprise</strong><small>Commencer lance un round de surprise avant le Début R1.</small></span></label><label className={`advanced-radio ${valeur === 1 ? 'selected' : ''}`}><input type="radio" name="campaign-start-round" checked={valeur === 1} onChange={() => onModifier({ startRound: 1 })} /><span><strong>Round 1 direct</strong><small>Commencer place directement la scène au Début R1.</small></span></label></div></div>;
}

function OptionsPhasesCampagne({ scene, onModifier }) {
  return <div className="scene-options compact-options advanced-rule-block phase-options"><h3>Phases</h3><p className="muted compact-help">Paramètres des phases d’initiative pour la campagne.</p><label className="field">Décrément<input type="number" min="1" step="1" value={scene?.phaseDecrement || defaultPhaseDecrement} onChange={(event) => onModifier({ phaseDecrement: event.target.value })} /></label><div className="advanced-radio-list"><label className={`advanced-radio ${!(scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound) ? 'selected' : ''}`}><input type="radio" name="campaign-phase-round-init" checked={!(scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound)} onChange={() => onModifier({ phaseRerollEachRound: false })} /><span><strong>Reprendre les anciennes initiatives</strong><small>Au nouveau round, Cadence repart en phase 1 avec les mêmes valeurs.</small></span></label><label className={`advanced-radio ${(scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound) ? 'selected' : ''}`}><input type="radio" name="campaign-phase-round-init" checked={scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound} onChange={() => onModifier({ phaseRerollEachRound: true })} /><span><strong>Relancer l’initiative</strong><small>Au nouveau round, Cadence attend une nouvelle saisie d’initiative.</small></span></label></div></div>;
}

function OptionsEgalitesCampagne({ scene, onModifier }) {
  const equalityRule = scene?.equalityRule || defaultEqualityRule;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Synchronisation</h3><p className="muted compact-help">Définit quand deux participants partagent vraiment le même tour.</p><div className="advanced-radio-list">{Object.values(equalityRules).map((rule) => <label className={`advanced-radio ${equalityRule === rule ? 'selected' : ''}`} key={rule}><input type="radio" name="campaign-equality-rule" value={rule} checked={equalityRule === rule} onChange={(event) => onModifier({ equalityRule: event.target.value })} /><span><strong>{equalityRuleLabels[rule]}</strong><small>{equalityRuleDescriptions[rule]}</small></span></label>)}</div></div>;
}

function OptionsOrdreInitiativeCampagne({ scene, onModifier }) {
  const initiativeOrder = scene?.initiativeOrder || defaultInitiativeOrder;
  return <div className="scene-options compact-options advanced-rule-block"><h3>Ordre d’initiative</h3><p className="muted compact-help">Sens de parcours des valeurs d’initiative.</p><div className="advanced-radio-list">{Object.values(initiativeOrders).map((order) => <label className={`advanced-radio ${initiativeOrder === order ? 'selected' : ''}`} key={order}><input type="radio" name="campaign-initiative-order" value={order} checked={initiativeOrder === order} onChange={(event) => onModifier({ initiativeOrder: event.target.value })} /><span><strong>{initiativeOrderLabels[order]}</strong><small>{initiativeOrderDescriptions[order]}</small></span></label>)}</div></div>;
}

function OptionsInitiativeTextuelleCampagne({ scene, onConfigurer }) {
  const config = normalizeInitiativeTextOrder(scene?.initiativeTextOrder);
  const resume = config.enabled && config.parts.length ? config.parts.map((part) => `${part.label}: ${part.values.length}`).join(' · ') : 'Désactivée';
  return <div className="scene-options compact-options advanced-rule-block"><div className="hub-section-head"><h3>Initiative par liste</h3><button className="small-btn" onClick={onConfigurer}>Configurer</button></div><p className="muted compact-help">Pour cartes, tarot ou postures. La saisie utilise des menus déroulants ; Cadence calcule un rang numérique invisible.</p><small className="muted">{resume}</small></div>;
}

function FenetreInitiativeTextuelle({ config, onFermer, onValider }) {
  const [draft, setDraft] = useState(() => normalizeInitiativeTextOrder(config));
  const modifierPart = (index, patch) => setDraft((current) => ({ ...current, parts: current.parts.map((part, position) => position === index ? { ...part, ...patch } : part) }));
  const modifierValeurs = (index, texte) => modifierPart(index, { values: texte.split('\n').map((line) => line.trim()).filter(Boolean) });
  const appliquerPreset = (id) => setDraft(presetInitiativeTextOrder(id));
  return <Fenetre title="Initiative par liste" onClose={onFermer}>
    <div className="stack">
      <label className="advanced-radio selected"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} /><span><strong>Activer l’initiative par menus</strong><small>Remplace les champs numériques par des sélecteurs.</small></span></label>
      <label className="field">Preset<select value={draft.preset || ''} onChange={(event) => appliquerPreset(event.target.value)}><option value="">Personnalisé</option>{Object.values(initiativeTextOrderPresetIds).map((id) => <option key={id} value={id}>{initiativeTextOrderPresets[id].label}</option>)}</select></label>
      <label className="field">Séparateur stocké<input type="text" value={draft.separator} onChange={(event) => setDraft((current) => ({ ...current, separator: event.target.value }))} /></label>
      {(draft.parts.length ? draft.parts : [{ label: 'Partie 1', values: [] }, { label: 'Partie 2', values: [] }]).slice(0, 2).map((part, index) => <div className="scene-options compact-options advanced-rule-block" key={index}><label className="field">Nom de la partie<input type="text" value={part.label} onChange={(event) => modifierPart(index, { label: event.target.value })} /></label><label className="field">Ordre des choix<textarea rows={Math.min(12, Math.max(4, part.values.length + 1))} value={(part.values || []).join('\n')} onChange={(event) => modifierValeurs(index, event.target.value)} /></label><p className="muted compact-help">Un choix par ligne, du plus prioritaire au moins prioritaire.</p></div>)}
      <div className="grid2"><button className="primary" onClick={() => onValider({ initiativeTextOrder: normalizeInitiativeTextOrder(draft) })}>Enregistrer</button><button className="small-btn" onClick={onFermer}>Annuler</button></div>
    </div>
  </Fenetre>;
}

function OptionsOrdreCategoriesCampagne({ scene, onModifier }) {
  const order = scene?.categoryOrder || defaultCategoryOrder;
  const deplacer = (index, delta) => { const target = index + delta; if (target < 0 || target >= order.length) return; const suivant = [...order]; [suivant[index], suivant[target]] = [suivant[target], suivant[index]]; onModifier({ categoryOrder: suivant }); };
  return <div className="scene-options compact-options advanced-rule-block"><h3>Priorités</h3><p className="muted compact-help">Ordre utilisé quand le type départage encore les égalités.</p><div className="stack compact-category-order">{order.map((categorie, index) => <div className="restore-row discreet" key={categorie}><strong>{categorie}</strong><div className="compact-arrows"><button className="small-btn" onClick={() => deplacer(index, -1)} disabled={index <= 0}>↑</button><button className="small-btn" onClick={() => deplacer(index, 1)} disabled={index >= order.length - 1}>↓</button></div></div>)}</div></div>;
}

function OngletRegles({ scene, onModifierRegles }) {
  const temporalite = scene?.temporalite || defaultTemporalityMode;
  const [initiativeTextuelleOuverte, setInitiativeTextuelleOuverte] = useState(false);
  const validerInitiativeTextuelle = (patch) => { onModifierRegles(patch); setInitiativeTextuelleOuverte(false); };
  return <div className="stack hub-section panel"><div><h3>Règles d’initiative</h3><p className="muted compact-help">Ces réglages sont appliqués à toutes les scènes de la campagne et servent de base aux nouvelles scènes.</p></div><OptionsDepartCampagne startRound={scene?.startRound} onModifier={onModifierRegles} /><OptionsTemporaliteCampagne temporalite={temporalite} onModifier={onModifierRegles} />{temporalite === temporalityModes.PHASES && <OptionsPhasesCampagne scene={scene} onModifier={onModifierRegles} />}<OptionsOrdreInitiativeCampagne scene={scene} onModifier={onModifierRegles} /><OptionsInitiativeTextuelleCampagne scene={scene} onConfigurer={() => setInitiativeTextuelleOuverte(true)} /><OptionsEgalitesCampagne scene={scene} onModifier={onModifierRegles} /><OptionsOrdreCategoriesCampagne scene={scene} onModifier={onModifierRegles} />{initiativeTextuelleOuverte && <FenetreInitiativeTextuelle config={scene?.initiativeTextOrder} onFermer={() => setInitiativeTextuelleOuverte(false)} onValider={validerInitiativeTextuelle} />}</div>;
}

function OngletSauvegarde({ onExporter, onImporter, onReinitialiser }) {
  const inputImportRef = useRef(null);
  const ouvrirImport = async () => { if (window.showOpenFilePicker) { try { const [handle] = await window.showOpenFilePicker({ multiple: false }); const file = await handle?.getFile(); if (file) onImporter(file); return; } catch (error) { if (error?.name === 'AbortError') return; } } inputImportRef.current?.click(); };
  const importerFichier = (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onImporter(file); };
  return <div className="stack hub-section panel"><h3>Sauvegarde</h3><p className="muted compact-help">Exporte une campagne .cad, importe une sauvegarde Cadence ou réinitialise la démo.</p><div className="grid2"><button className="primary" onClick={onExporter}>Exporter</button><button className="small-btn" onClick={ouvrirImport}>Importer</button><input ref={inputImportRef} className="import-file-input" type="file" aria-label="Importer une campagne" accept=".cad,.json,application/json,text/json,text/plain,application/octet-stream,*/*" onChange={importerFichier} /></div><button className="danger-btn" onClick={onReinitialiser}>Réinitialiser la démo</button></div>;
}

export function HubCampagne({ campaignName, scene, scenes, templates, templateCategories, dark, onChangerTheme, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene, onModifierReglesInitiative, onExporter, onImporter, onReinitialiser, onAjouterTemplateCategorie, onAjouterCategorieTemplate, onRenommerCategorieTemplate, onSupprimerCategorieTemplate, onDeplacerCategorieTemplate, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate, onImporterTemplates }) {
  const [onglet, setOnglet] = useState('scenes');
  const [editingSceneId, setEditingSceneId] = useState('');
  const [editCreatedSceneWhenReady, setEditCreatedSceneWhenReady] = useState(false);
  useEffect(() => { if (!editCreatedSceneWhenReady || !scene?.id) return; setOnglet('scenes'); setEditingSceneId(scene.id); setEditCreatedSceneWhenReady(false); }, [editCreatedSceneWhenReady, scene?.id]);
  const creerNouvelleScene = () => { onNouvelleScene(); setEditCreatedSceneWhenReady(true); };
  const dupliquerScene = (index) => { onDupliquerScene(index); setEditCreatedSceneWhenReady(true); };
  return <div className="campaign-page shell"><EnteteHub campaignName={campaignName} sombre={dark} onChangerTheme={onChangerTheme} /><main className="campaign-hub-page"><OngletsHub onglet={onglet} setOnglet={setOnglet} />{onglet === 'scenes' && <OngletScenes scenes={scenes} editingSceneId={editingSceneId} onEditerScene={setEditingSceneId} onFermerEditionScene={() => setEditingSceneId('')} onChoisirScene={onChoisirScene} onNouvelleScene={creerNouvelleScene} onModifierScene={onModifierScene} onDupliquerScene={dupliquerScene} onSupprimerScene={onSupprimerScene} />}{onglet === 'regles' && <OngletRegles scene={scene} onModifierRegles={onModifierReglesInitiative} />}{onglet === 'sauvegarde' && <OngletSauvegarde onExporter={onExporter} onImporter={onImporter} onReinitialiser={onReinitialiser} />}{onglet === 'templates' && <OngletTemplates categories={templateCategories} templates={templates} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onAjouterCategorie={onAjouterCategorieTemplate} onRenommerCategorie={onRenommerCategorieTemplate} onSupprimerCategorie={onSupprimerCategorieTemplate} onDeplacerCategorie={onDeplacerCategorieTemplate} onChangerCategorieTemplate={onChangerCategorieTemplate} onEditerTemplate={onEditerTemplate} onDupliquerTemplate={onDupliquerTemplate} onSupprimerTemplate={onSupprimerTemplate} onImporterTemplates={onImporterTemplates} />}</main></div>;
}
