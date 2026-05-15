import { useEffect, useRef, useState } from 'react';
import { defaultCategoryOrder, defaultEqualityRule, temporalityModes } from './constants.js';
import { groupeEgalitePourParticipant, participantsPourPhase, phaseSuivanteExiste } from './domain/initiative.js';
import { FenetresSuperposees } from './interface/app/FenetresSuperposees.jsx';
import { HubCampagne } from './interface/campaign/HubCampagne.jsx';
import { FenetreExportCampagne } from './interface/dialogues/FenetreExportCampagne.jsx';
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
  const [showNotes, setShowNotes] = useState(true);
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);
  const [initiativeEntryOpen, setInitiativeEntryOpen] = useState(false);
  const [templateTarget, setTemplateTarget] = useState(null);
  const [templateError, setTemplateError] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const previousRoundRef = useRef(scene.round);

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

  const participantsPourEgalites = temporalitePhases ? phaseParticipants : scene.participants;
  const idActifPourEgalites = temporalitePhases ? phaseActiveId : scene.activeId;
  const activeGroup = !temporaliteSouple && idActifPourEgalites ? groupeEgalitePourParticipant(participantsPourEgalites, idActifPourEgalites, optionsInitiative) : [];

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

  const nextTurn = (direction) => {
    if (temporaliteSouple && direction > 0 && !toutLeMondeAJoueSouple) return;
    if (temporalitePhases && direction > 0 && !phaseParticipants.length) return;
    if (direction > 0) setShowNotes(false);
    if (direction > 0 && blocked.length) {
      setClockModalOpen(true);
      return;
    }
    actions.nextTurn(direction);
  };

  const marquerAJoue = (participantId) => {
    actions.markFlexiblePlayed(participantId);
    setShowNotes(false);
  };

  const annulerAJoue = (participantId) => {
    actions.unmarkFlexiblePlayed(participantId);
    setShowNotes(false);
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
      setNotice({ title: 'Import impossible', message: result.message });
      return;
    }
    setOpenMenu(false);
    characters.closeCharacterPanels();
    setCurrentView('hub');
  };
  const importTemplatesFromCampaign = async (file) => {
    const result = await actions.importTemplatesFromCampaign(file);
    if (result?.ok === false) {
      setNotice({ title: 'Import impossible', message: result.message });
      return;
    }
    setNotice({ title: 'Templates importés', message: `${result.added} ajouté(s), ${result.skipped} ignoré(s) car déjà présents.` });
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

  const nextLabel = temporaliteSouple
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
  const classeSuivantEffective = temporaliteSouple && toutLeMondeAJoueSouple
    ? 'next-round'
    : blocked.length
      ? 'blocked'
      : temporalitePhases
        ? phaseDemarreNouveauRound ? 'next-round' : phaseEnFin && phaseSuivanteDisponible ? 'next-phase' : ''
        : nextClass;
  const suivantDesactive = (temporaliteSouple && !toutLeMondeAJoueSouple) || (temporalitePhases && !phaseParticipants.length);
  const libelleBas = temporaliteSouple
    ? toutLeMondeAJoueSouple ? `Nouveau round · R${scene.round + 1}` : 'Choisir'
    : temporalitePhases
      ? phaseAttendRelanceInitiative
        ? 'Init requise'
        : phaseDemarreNouveauRound
          ? `Nouveau round · R${scene.round + 1}`
          : phaseEnFin && phaseSuivanteDisponible
            ? `Phase ${scene.phase + 1}`
            : `Suivant · P${scene.phase}`
      : undefined;

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
        }}
        compteurGlobal={{ horlogesBloquantes: blocked }}
        resolutionHorloge={{ resetClock, deleteClock }}
        templatesUi={{ templateTarget, templateError, fermerSauvegardeTemplate: () => setTemplateTarget(null), enregistrerTemplate: saveTemplate }}
      />
      {exportOpen && <FenetreExportCampagne nomInitial={campaignName} onFermer={() => setExportOpen(false)} onExporter={actions.exportCampaign} />}
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
          onAjouterDepuisTemplate={(templateId) => createFromTemplate(templateId, { placement: 'reserve' })}
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
          notesVisibles={showNotes}
          classeSuivant={classeSuivantEffective}
          libelleSuivant={nextLabel}
          temporaliteSouple={temporaliteSouple}
          temporalitePhases={temporalitePhases}
          suivantDesactive={suivantDesactive}
          onBasculerNotes={() => setShowNotes(!showNotes)}
          onRetourHub={() => setCurrentView('hub')}
          onTourPrecedent={() => nextTurn(-1)}
          onTourSuivant={() => nextTurn(1)}
          onModifierCompteurGlobal={actions.stepGlobal}
          onOuvrirCompteurGlobal={() => setGlobalSheetOpen(true)}
        />

        <main>
          <ListeInitiative scene={scene} participants={scene.participants} actifId={temporalitePhases ? phaseActiveId : scene.activeId} interactions={characters} temporaliteSouple={temporaliteSouple} temporalitePhases={temporalitePhases} phaseAttendRelanceInitiative={phaseAttendRelanceInitiative} onMarquerAJoue={marquerAJoue} onAnnulerAJoue={annulerAJoue} />
          <ReserveHorsInitiative scene={scene} interactions={characters} onModifierNotes={(notes) => actions.updateSceneField('reserveNotes', notes)} />
        </main>
      </div>

      <BarreActionBas
        classeSuivant={classeSuivantEffective}
        prochainRound={temporaliteSouple ? toutLeMondeAJoueSouple : temporalitePhases ? phaseDemarreNouveauRound : nextStartsRound}
        round={scene.round}
        horlogeBloquee={blocked.length > 0}
        suivantDesactive={suivantDesactive}
        libelleSuivant={libelleBas}
        onTourPrecedent={() => nextTurn(-1)}
        onTourSuivant={() => nextTurn(1)}
        onAjouterPersonnage={openAddCharacter}
        onSaisirInitiatives={openInitiativeEntry}
        onOuvrirMenu={() => setOpenMenu(true)}
      />

      {fenetresCommunes}
    </div>
  );
}
