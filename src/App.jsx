import { useEffect, useState } from 'react';
import { defaultCategoryOrder, defaultEqualityRule, temporalityModes } from './constants.js';
import { groupeEgalitePourParticipant } from './domain/initiative.js';
import { FenetresSuperposees } from './interface/app/FenetresSuperposees.jsx';
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
  const { scenes, scene, restorePoints, dark, active, blocked, nextStartsRound, nextClass, roundEffect, actions } = campaign;
  const characters = useCharacterInteractions(scene, actions);
  const templates = useTemplates();
  const [openMenu, setOpenMenu] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showNotes, setShowNotes] = useState(true);
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);
  const [templateTarget, setTemplateTarget] = useState(null);
  const [templateError, setTemplateError] = useState(null);

  const temporaliteSouple = scene.temporalite === temporalityModes.FLEXIBLE;
  const globalAutoTick = roundEffect === 'next' && !!scene.globalTracker?.enabled && !!scene.globalTracker?.auto;
  const activeGroup = scene.activeId ? groupeEgalitePourParticipant(scene.participants, scene.activeId, { categoryOrder: scene.categoryOrder || defaultCategoryOrder, equalityRule: scene.equalityRule || defaultEqualityRule }) : [];

  useEffect(() => {
    if (!scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    element?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [scene.activeId]);

  useEffect(() => {
    if (clockModalOpen && blocked.length === 0) setClockModalOpen(false);
  }, [blocked.length, clockModalOpen]);

  // Une horloge bloquante interrompt volontairement le passage au tour suivant :
  // elle doit être résolue avant que les états/horloges avancent.
  const nextTurn = (direction) => {
    if (direction > 0) setShowNotes(false);
    if (direction > 0 && blocked.length) {
      setClockModalOpen(true);
      return;
    }
    actions.nextTurn(direction);
  };

  const choisirActif = (participantId) => {
    actions.setActiveParticipant(participantId);
    setShowNotes(false);
  };

  const openAddCharacter = () => {
    setOpenMenu(false);
    setAddSheetOpen(true);
  };
  const createBlankCharacter = (options) => {
    characters.addCharacter(createBlankParticipant(), options);
    setAddSheetOpen(false);
  };
  const createFromTemplate = (templateId, options) => {
    const participant = templates.createParticipantFromTemplate(templateId);
    if (!participant) return;
    characters.addCharacter(participant, options);
    setAddSheetOpen(false);
  };
  const newScene = () => {
    actions.newScene();
    setOpenMenu(false);
  };
  const importCampaign = async (file) => {
    const result = await actions.importCampaign(file);
    if (result?.ok === false) {
      setNotice({ title: 'Import impossible', message: result.message });
      return;
    }
    setOpenMenu(false);
    characters.closeCharacterPanels();
  };
  const resetDemo = () => {
    actions.resetDemo();
    setOpenMenu(false);
    characters.closeCharacterPanels();
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
  const nextLabel = blocked.length ? 'Gérer horloge bloquante' : nextStartsRound ? 'Nouveau round' : 'Participant suivant';

  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <div className="shell">
        <EnteteScene
          scene={scene}
          actif={active}
          groupeActif={activeGroup}
          horlogesBloquantes={blocked}
          effetRound={roundEffect}
          compteurGlobalAuto={globalAutoTick}
          notesVisibles={showNotes}
          classeSuivant={nextClass}
          libelleSuivant={nextLabel}
          temporaliteSouple={temporaliteSouple}
          onBasculerNotes={() => setShowNotes(!showNotes)}
          onTourPrecedent={() => nextTurn(-1)}
          onTourSuivant={() => nextTurn(1)}
          onModifierCompteurGlobal={actions.stepGlobal}
          onOuvrirCompteurGlobal={() => setGlobalSheetOpen(true)}
        />

        <main>
          <ListeInitiative scene={scene} participants={scene.participants} actifId={scene.activeId} interactions={characters} temporaliteSouple={temporaliteSouple} onChoisirActif={choisirActif} />
          <ReserveHorsInitiative scene={scene} interactions={characters} onModifierNotes={(notes) => actions.updateSceneField('reserveNotes', notes)} />
        </main>
      </div>

      <BarreActionBas
        classeSuivant={nextClass}
        prochainRound={nextStartsRound}
        round={scene.round}
        horlogeBloquee={blocked.length > 0}
        onTourPrecedent={() => nextTurn(-1)}
        onTourSuivant={() => nextTurn(1)}
        onAjouterPersonnage={openAddCharacter}
        onOuvrirMenu={() => setOpenMenu(true)}
      />

      <FenetresSuperposees
        scene={scene}
        scenes={scenes}
        restorePoints={restorePoints}
        dark={dark}
        characters={characters}
        templates={templates}
        actions={actions}
        etatInterface={{ addSheetOpen, openMenu, notice, globalSheetOpen, clockModalOpen }}
        commandesInterface={{
          ouvrirAjoutPersonnage: openAddCharacter,
          fermerAjoutPersonnage: () => setAddSheetOpen(false),
          fermerMenu: () => setOpenMenu(false),
          fermerNotice: () => setNotice(null),
          fermerCompteurGlobal: () => setGlobalSheetOpen(false),
          fermerResolutionHorloge: () => setClockModalOpen(false),
          ouvrirSauvegardeTemplate: openTemplateSave,
          creerPersonnageVierge: createBlankCharacter,
          creerDepuisTemplate: createFromTemplate,
          nouvelleScene: newScene,
          importerCampagne: importCampaign,
          reinitialiserDemo: resetDemo,
          restaurerScene: restoreScene,
        }}
        compteurGlobal={{ horlogesBloquantes: blocked }}
        resolutionHorloge={{ resetClock, deleteClock }}
        templatesUi={{ templateTarget, templateError, fermerSauvegardeTemplate: () => setTemplateTarget(null), enregistrerTemplate: saveTemplate }}
      />
    </div>
  );
}
