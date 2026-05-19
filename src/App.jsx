import { useEffect, useRef, useState } from 'react';
import { defaultCategoryOrder, defaultEqualityRule, temporalityModes } from './constants.js';
import { groupeEgalitePourParticipant, participantsPourPhase, phaseSuivanteExiste } from './domain/initiative.js';
import { FenetresSuperposees } from './interface/app/FenetresSuperposees.jsx';
import { HubCampagne } from './interface/campaign/HubCampagne.jsx';
import { Fenetre } from './interface/commun/ComposantsCommuns.jsx';
import { FenetreExportCampagne } from './interface/dialogues/FenetreExportCampagne.jsx';
import { FenetreEditionFiche } from './interface/fiches/FenetreEditionFiche.jsx';
import { BarreActionBas } from './interface/scene/BarreActionBas.jsx';
import { EnteteScene } from './interface/scene/EnteteScene.jsx';
import { ListeInitiative } from './interface/scene/ListeInitiative.jsx';
import { ReserveHorsInitiative } from './interface/scene/ReserveHorsInitiative.jsx';
import { useCampaign } from './hooks/useCampaign.js';
import { useCharacterInteractions } from './hooks/useCharacterInteractions.js';
import { useTemplates } from './hooks/useTemplates.js';
import { createBlankParticipant } from './templates.js';

export default function App() {
  const campaign = useCampaign();
  const { scenes, templateStore, setTemplateStore, campaignName, scene, restorePoints, dark, active, blocked, nextStartsRound, nextClass, roundEffect, actions } = campaign;
  const characters = useCharacterInteractions(scene, actions);
  const templates = useTemplates(templateStore, setTemplateStore);
  const [currentView, setCurrentView] = useState('hub');
  const [openMenu, setOpenMenu] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);
  const [initiativeEntryOpen, setInitiativeEntryOpen] = useState(false);
  const [templateTarget, setTemplateTarget] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [templateError, setTemplateError] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [timerDoneOpen, setTimerDoneOpen] = useState(false);
  const previousRoundRef = useRef(scene.round);
  const timerDoneRef = useRef(false);

  const temporaliteSouple = scene.temporalite === temporalityModes.FLEXIBLE;
  const temporalitePhases = scene.temporalite === temporalityModes.PHASES;
  const phaseAttendRelanceInitiative = temporalitePhases && !!scene.phaseRerollEachRound && !scene.activeId;
  const optionsInitiative = {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
  };

  const phaseParticipants = temporalitePhases && !phaseAttendRelanceInitiative
    ? participantsPourPhase(scene.participants, scene.phase, scene.phaseDecrement, optionsInitiative)
    : [];
  const phaseActiveId = temporalitePhases
    ? phaseParticipants.find((participant) => participant.id === scene.activeId)?.id || ''
    : scene.activeId;
  const phaseActive = temporalitePhases
    ? phaseParticipants.find((participant) => participant.id === phaseActiveId) || null
    : null;
  const phaseSuivanteDisponible = temporalitePhases && !phaseAttendRelanceInitiative && phaseSuivanteExiste(scene.participants, scene.phase, scene.phaseDecrement);
  const phaseEnFin = temporalitePhases && phaseParticipants.length > 0 && phaseActiveId === phaseParticipants.at(-1)?.id;
  const phaseDemarreNouveauRound = temporalitePhases && phaseEnFin && !phaseSuivanteDisponible;
  const toutLeMondeAJoueSouple = temporaliteSouple && scene.participants.length > 0 && scene.participants.every((participant) => (scene.jouesSouples || []).includes(participant.id));
  const globalAutoTick = roundEffect === 'next' && !!scene.globalTracker?.enabled && !!scene.globalTracker?.auto;
  const currentIndex = scene.participants.findIndex((participant) => participant.id === scene.activeId);
  const phaseCurrentIndex = phaseParticipants.findIndex((participant) => participant.id === phaseActiveId);
  const libelleRoundCourant = scene.round === 0 ? 'Surprise' : `R${scene.round}`;
  const roundDepartScene = [0, 1].includes(Number(scene.startRound)) ? Number(scene.startRound) : 0;
  const retourPreparationVisible = scene.round >= 0 && (temporaliteSouple
    ? (scene.historiqueSouple || []).length === 0 && scene.round === roundDepartScene
    : temporalitePhases
      ? scene.round === roundDepartScene && (scene.phase || 1) <= 1 && (phaseCurrentIndex <= 0 || !phaseParticipants.length)
      : scene.round === roundDepartScene && currentIndex <= 0);
  const retourPossible = scene.round < 0 ? false : temporaliteSouple
    ? (scene.historiqueSouple || []).length > 0 || scene.round === scene.startRound
    : temporalitePhases
      ? phaseCurrentIndex > 0 || (scene.round === scene.startRound && (scene.phase || 1) <= 1 && (phaseCurrentIndex <= 0 || !phaseParticipants.length))
      : scene.participants.length > 0 && (scene.round > 0 || currentIndex > 0);

  const participantsPourEgalites = temporalitePhases ? phaseParticipants : scene.participants;
  const idActifPourEgalites = temporalitePhases ? phaseActiveId : scene.activeId;
  const activeGroup = !temporaliteSouple && idActifPourEgalites ? groupeEgalitePourParticipant(participantsPourEgalites, idActifPourEgalites, optionsInitiative) : [];
  const editingTemplate = editingTemplateId ? templates.getTemplate(editingTemplateId) : null;

  useEffect(() => {
    if (currentView !== 'scene' || !scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentView, scene.activeId]);

  useEffect(() => {
    if (clockModalOpen && blocked.length === 0) setClockModalOpen(false);
  }, [blocked.length, clockModalOpen]);

  useEffect(() => {
    const roundAvant = previousRoundRef.current;
    previousRoundRef.current = scene.round;
    if (currentView === 'scene' && scene.round > roundAvant && scene.temporalite === temporalityModes.PHASES && scene.phaseRerollEachRound) {
      setInitiativeEntryOpen(true);
    }
  }, [currentView, scene.phaseRerollEachRound, scene.round, scene.temporalite]);

  useEffect(() => {
    const compteur = scene.globalTracker;
    if (scene.round < 0 || !compteur?.enabled || compteur.mode !== 'timer') {
      timerDoneRef.current = false;
      return undefined;
    }
    const duree = Math.max(1, Number(compteur.max || 60)) * 1000;
    const verifier = () => {
      const elapsed = Math.max(0, Number(compteur.elapsedMs || 0)) + (compteur.running && compteur.startedAt ? Math.max(0, Date.now() - Number(compteur.startedAt)) : 0);
      if (elapsed < duree) {
        timerDoneRef.current = false;
        return;
      }
      if (timerDoneRef.current) return;
      timerDoneRef.current = true;
      actions.updateGlobalTracker({ running: false, startedAt: null, elapsedMs: duree });
      setTimerDoneOpen(true);
    };
    verifier();
    if (!compteur.running) return undefined;
    const id = window.setInterval(verifier, 500);
    return () => window.clearInterval(id);
  }, [actions, scene.globalTracker]);

  const nextTurn = (direction) => {
    if (direction < 0 && !retourPossible) return;
    if (temporaliteSouple && direction > 0 && !toutLeMondeAJoueSouple) return;
    if (temporalitePhases && direction > 0 && !phaseParticipants.length) return;
    if (direction > 0 && blocked.length) {
      setClockModalOpen(true);
      return;
    }
    actions.nextTurn(direction);
  };

  const marquerAJoue = (participantId) => {
    actions.markFlexiblePlayed(participantId);
  };

  const annulerAJoue = (participantId) => {
    actions.unmarkFlexiblePlayed(participantId);
  };

  const openAddCharacter = () => {
    setOpenMenu(false);
    setAddSheetOpen(true);
  };
  const openInitiativeEntry = () => {
    setOpenMenu(false);
    setInitiativeEntryOpen(true);
  };
  const createBlankCharacter = (options) => {
    characters.addCharacter(createBlankParticipant(), options);
    setAddSheetOpen(false);
  };
  const createFromTemplate = (templateId, options = { placement: 'reserve' }) => {
    const participant = templates.createParticipantFromTemplate(templateId);
    if (!participant) return;
    characters.addCharacter(participant, options);
    setAddSheetOpen(false);
  };
  const newScene = () => {
    actions.newScene();
    setOpenMenu(false);
  };
  const chooseScene = (index) => {
    actions.setSceneIndex(index);
    setCurrentView('scene');
  };
  const importCampaign = async (file) => {
    const result = await actions.importCampaign(file);
    if (result?.ok === false) {
      setNotice({ title: 'Import impossible', message: result.message || 'Le fichier n’a pas pu être lu. Essaie avec un export .cad récent, et note le nom du fichier si le problème revient.' });
      return;
    }
    setOpenMenu(false);
    characters.closeCharacterPanels();
    setCurrentView('hub');
    setNotice({ title: 'Import terminé', message: 'La campagne a bien été chargée.' });
  };
  const importTemplatesFromCampaign = async (file) => {
    const result = await actions.importTemplatesFromCampaign(file);
    if (result?.ok === false) {
      setNotice({ title: 'Import impossible', message: result.message });
      return;
    }
    setNotice({ title: 'Templates importés', message: `${result.added} ajouté(s), ${result.skipped} ignoré(s) car déjà présents.` });
  };
  const createTemplateInCategory = (category) => {
    const template = templates.createTemplateInCategory(category);
    if (template) setEditingTemplateId(template.id);
  };
  const addTemplateCategory = (category) => {
    const result = templates.addCategory(category);
    if (result?.ok === false) setNotice({ title: 'Catégorie impossible', message: result.message });
    return result;
  };
  const renameTemplateCategory = (category, nextName) => {
    const result = templates.renameCategory(category, nextName);
    if (result?.ok === false) setNotice({ title: 'Renommage impossible', message: result.message });
    return result;
  };
  const deleteTemplateCategory = (category) => {
    const result = templates.deleteCategory(category);
    if (result?.ok === false) setNotice({ title: 'Suppression impossible', message: result.message });
    return result;
  };
  const duplicateTemplate = (templateId) => {
    const duplicate = templates.duplicateTemplate(templateId);
    if (duplicate) setEditingTemplateId(duplicate.id);
  };
  const saveEditedTemplate = (participant) => {
    if (!editingTemplateId) return;
    templates.updateTemplateParticipant(editingTemplateId, participant, editingTemplate.category);
    setEditingTemplateId('');
  };
  const deleteEditedTemplate = () => {
    if (!editingTemplateId) return;
    templates.deleteTemplate(editingTemplateId);
    setEditingTemplateId('');
  };
  const resetDemo = () => {
    actions.resetDemo();
    setOpenMenu(false);
    characters.closeCharacterPanels();
    setCurrentView('hub');
  };
  const restoreScene = (pointId) => {
    actions.restoreScene(pointId);
    setOpenMenu(false);
    characters.closeCharacterPanels();
  };
  const returnToPreparation = () => {
    actions.returnToPreparation();
    setOpenMenu(false);
    characters.closeCharacterPanels();
  };
  const advanceRound = () => {
    actions.advanceRound();
    setOpenMenu(false);
    characters.closeCharacterPanels();
  };
  const resetSceneTrackers = () => {
    actions.resetSceneTrackers();
    setOpenMenu(false);
    characters.closeCharacterPanels();
  };
  const clearSceneStatuses = () => {
    actions.clearSceneStatuses();
    setOpenMenu(false);
    characters.closeCharacterPanels();
  };
  const toggleGlobalRealtime = () => {
    const compteur = scene.globalTracker;
    if (scene.round < 0) return;
    if (!['stopwatch', 'timer'].includes(compteur?.mode)) return;
    const elapsed = Math.max(0, Number(compteur.elapsedMs || 0)) + (compteur.running && compteur.startedAt ? Math.max(0, Date.now() - Number(compteur.startedAt)) : 0);
    actions.updateGlobalTracker(compteur.running
      ? { running: false, startedAt: null, elapsedMs: elapsed }
      : { running: true, startedAt: Date.now() });
  };
  const restartTimer = () => {
    actions.updateGlobalTracker({ running: true, startedAt: Date.now(), elapsedMs: 0 });
    timerDoneRef.current = false;
    setTimerDoneOpen(false);
  };
  const resetTimer = () => {
    actions.updateGlobalTracker({ running: false, startedAt: null, elapsedMs: 0 });
    timerDoneRef.current = false;
    setTimerDoneOpen(false);
  };
  const openTimerMenu = () => {
    setTimerDoneOpen(false);
    setOpenMenu(true);
  };
  const exportCampaign = async (name) => {
    try {
      const result = await actions.exportCampaign(name);
      if (result?.ok) setNotice({ title: 'Export terminé', message: 'La campagne a bien été exportée.' });
      if (result?.ok === false && !result.cancelled) setNotice({ title: 'Export impossible', message: result.message || 'Le navigateur a refusé l’enregistrement. Réessaie depuis Opera ou choisis un autre emplacement.' });
      return result;
    } catch (error) {
      setNotice({ title: 'Export impossible', message: `Le navigateur a interrompu l’export : ${error?.message || 'erreur inconnue'}.` });
      return { ok: false, message: error?.message };
    }
  };
  const openTemplateSave = (participant) => {
    setTemplateTarget(participant);
    setTemplateError(null);
  };
  const saveTemplate = (data) => {
    if (!templateTarget) return;
    const result = templates.saveParticipantAsTemplate(templateTarget, data);
    if (!result.ok) {
      setTemplateError({ kind: result.kind, message: result.message });
      return;
    }
    setTemplateTarget(null);
    setTemplateError(null);
    setNotice({ title: result.overwritten ? 'Template remplacé' : 'Template enregistré', message: `${result.template.name} est disponible dans la catégorie ${result.template.category}.` });
  };

  const findClock = (participantId, trackerId) => {
    const participant = [...scene.participants, ...(scene.reserve || [])].find((item) => item.id === participantId);
    return participant?.trackers.find((item) => item.id === trackerId);
  };
  const resetClock = (participantId, trackerId) => {
    const tracker = findClock(participantId, trackerId);
    if (!tracker) return;
    actions.trackerChange(participantId, trackerId, { ...tracker, current: 0 });
  };
  const deleteClock = (participantId, trackerId) => {
    actions.deleteTracker(participantId, trackerId);
  };

  const nextLabel = scene.round < 0 ? 'Commencer' : temporaliteSouple
    ? toutLeMondeAJoueSouple ? 'Nouveau round' : 'Mode souple : choisir dans la liste'
    : blocked.length
      ? 'Gérer horloge bloquante'
      : temporalitePhases
        ? phaseAttendRelanceInitiative
          ? 'Saisir les initiatives'
          : !phaseParticipants.length
            ? 'Aucun participant actif'
            : phaseEnFin && phaseSuivanteDisponible
              ? 'Phase suivante'
              : phaseDemarreNouveauRound
                ? 'Nouveau round'
                : 'Participant suivant'
        : nextStartsRound ? 'Nouveau round' : 'Participant suivant';
  const classeSuivantEffective = scene.round < 0 ? 'next-round' : temporaliteSouple && toutLeMondeAJoueSouple
    ? 'next-round'
    : blocked.length
      ? 'blocked'
      : temporalitePhases
        ? phaseDemarreNouveauRound ? 'next-round' : phaseEnFin && phaseSuivanteDisponible ? 'next-phase' : ''
        : nextClass;
  const suivantDesactive = scene.round < 0 ? false : (temporaliteSouple && !toutLeMondeAJoueSouple) || (temporalitePhases && !phaseParticipants.length);
  const libelleBas = scene.round < 0 ? 'Commencer' : temporaliteSouple
    ? toutLeMondeAJoueSouple ? `Nouveau round · R${scene.round + 1}` : 'Choisir'
    : temporalitePhases
      ? phaseAttendRelanceInitiative
        ? 'Init requise'
        : phaseDemarreNouveauRound
          ? `Nouveau round · R${scene.round + 1}`
          : phaseEnFin && phaseSuivanteDisponible
            ? `Phase ${scene.phase + 1}`
            : `Suivant · P${scene.phase}`
      : nextStartsRound ? `Nouveau round · R${scene.round + 1}` : `Suivant · ${libelleRoundCourant}`;

  const fenetresCommunes = (
    <>
      <FenetresSuperposees
        campaignName={campaignName}
        scene={scene}
        restorePoints={restorePoints}
        dark={dark}
        characters={characters}
        templates={templates}
        actions={actions}
        etatInterface={{ addSheetOpen, openMenu: currentView === 'scene' && openMenu, notice, globalSheetOpen, clockModalOpen, initiativeEntryOpen: currentView === 'scene' && initiativeEntryOpen }}
        commandesInterface={{
          ouvrirAjoutPersonnage: openAddCharacter,
          ouvrirSaisieInitiatives: openInitiativeEntry,
          ouvrirHubCampagne: () => setCurrentView('hub'),
          fermerAjoutPersonnage: () => setAddSheetOpen(false),
          fermerMenu: () => setOpenMenu(false),
          fermerNotice: () => setNotice(null),
          fermerCompteurGlobal: () => setGlobalSheetOpen(false),
          fermerResolutionHorloge: () => setClockModalOpen(false),
          fermerSaisieInitiatives: () => setInitiativeEntryOpen(false),
          ouvrirSauvegardeTemplate: openTemplateSave,
          creerPersonnageVierge: createBlankCharacter,
          creerDepuisTemplate: createFromTemplate,
          restaurerScene: restoreScene,
          retourPreparation: returnToPreparation,
          avancerRound: advanceRound,
          resetSuivisScene: resetSceneTrackers,
          effacerEtatsScene: clearSceneStatuses,
        }}
        compteurGlobal={{ horlogesBloquantes: blocked }}
        resolutionHorloge={{ resetClock, deleteClock }}
        templatesUi={{ templateTarget, templateError, fermerSauvegardeTemplate: () => setTemplateTarget(null), enregistrerTemplate: saveTemplate }}
      />
      {exportOpen && <FenetreExportCampagne nomInitial={campaignName} onFermer={() => setExportOpen(false)} onExporter={exportCampaign} />}
      {timerDoneOpen && <Fenetre title="Minuteur terminé" onClose={() => setTimerDoneOpen(false)}>
        <div className="stack">
          <p className="muted compact-help">Le minuteur est arrivé à zéro.</p>
          <div className="grid2">
            <button className="primary" onClick={restartTimer}>Relancer</button>
            <button className="small-btn" onClick={resetTimer}>Reset</button>
          </div>
          <button className="small-btn" onClick={openTimerMenu}>Ouvrir le menu</button>
        </div>
      </Fenetre>}
      {editingTemplate && <FenetreEditionFiche participant={editingTemplate.participant} title={`Modifier le template · ${editingTemplate.name}`} saveTemplateVisible={false} deleteLabel="Supprimer le template" onClose={() => setEditingTemplateId('')} onSave={saveEditedTemplate} onDelete={deleteEditedTemplate} />}
    </>
  );

  if (currentView === 'hub') {
    return (
      <div className={`app ${dark ? 'dark' : ''}`}>
        <HubCampagne
          campaignName={campaignName}
          scene={scene}
          scenes={scenes}
          templates={templates.templates}
          templateCategories={templates.categories}
          dark={dark}
          onChangerTheme={actions.setDark}
          onChoisirScene={chooseScene}
          onNouvelleScene={newScene}
          onModifierScene={actions.updateSceneMeta}
          onDupliquerScene={actions.duplicateScene}
          onSupprimerScene={actions.deleteScene}
          onModifierReglesInitiative={actions.updateCampaignInitiativeRules}
          onExporter={() => setExportOpen(true)}
          onImporter={importCampaign}
          onReinitialiser={resetDemo}
          onAjouterTemplateCategorie={createTemplateInCategory}
          onAjouterCategorieTemplate={addTemplateCategory}
          onRenommerCategorieTemplate={renameTemplateCategory}
          onSupprimerCategorieTemplate={deleteTemplateCategory}
          onDeplacerCategorieTemplate={templates.moveCategory}
          onChangerCategorieTemplate={templates.setTemplateCategory}
          onEditerTemplate={setEditingTemplateId}
          onDupliquerTemplate={duplicateTemplate}
          onSupprimerTemplate={templates.deleteTemplate}
          onImporterTemplates={importTemplatesFromCampaign}
        />
        {fenetresCommunes}
      </div>
    );
  }

  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <div className="shell">
        <EnteteScene
          scene={scene}
          actif={temporalitePhases ? phaseActive : active}
          groupeActif={activeGroup}
          horlogesBloquantes={blocked}
          effetRound={roundEffect}
          compteurGlobalAuto={globalAutoTick}
          classeSuivant={classeSuivantEffective}
          libelleSuivant={nextLabel}
          temporaliteSouple={temporaliteSouple}
          temporalitePhases={temporalitePhases}
          suivantDesactive={suivantDesactive}
          retourDesactive={!retourPossible}
          dark={dark}
          onRetourHub={() => setCurrentView('hub')}
          onTourPrecedent={() => nextTurn(-1)}
          onTourSuivant={() => nextTurn(1)}
          onRetourPreparation={retourPreparationVisible ? returnToPreparation : null}
          onModifierCompteurGlobal={actions.stepGlobal}
          onToggleCompteurTemps={toggleGlobalRealtime}
        />

        <main>
          <ListeInitiative scene={scene} participants={scene.participants} actifId={temporalitePhases ? phaseActiveId : scene.activeId} interactions={characters} temporaliteSouple={temporaliteSouple} temporalitePhases={temporalitePhases} phaseAttendRelanceInitiative={phaseAttendRelanceInitiative} onMarquerAJoue={marquerAJoue} onAnnulerAJoue={annulerAJoue} />
          <ReserveHorsInitiative scene={scene} interactions={characters} onModifierNotes={(notes) => actions.updateSceneField('reserveNotes', notes)} />
        </main>
      </div>

      <BarreActionBas
        dark={dark}
        classeSuivant={classeSuivantEffective}
        prochainRound={temporaliteSouple ? toutLeMondeAJoueSouple : temporalitePhases ? phaseDemarreNouveauRound : nextStartsRound}
        round={scene.round}
        horlogeBloquee={blocked.length > 0}
        suivantDesactive={suivantDesactive}
        retourDesactive={!retourPossible}
        libelleSuivant={libelleBas}
        onRetourHub={() => setCurrentView('hub')}
        onTourPrecedent={() => nextTurn(-1)}
        onTourSuivant={() => nextTurn(1)}
        onRetourPreparation={retourPreparationVisible ? returnToPreparation : null}
        onSaisirInitiatives={openInitiativeEntry}
        onOuvrirMenu={() => setOpenMenu(true)}
      />

      {fenetresCommunes}
    </div>
  );
}
