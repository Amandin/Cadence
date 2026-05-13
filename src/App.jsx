import { useEffect, useState } from 'react';
import { GlobalTrackerSheet } from './components/GlobalTracker.jsx';
import { Menu } from './components/Menu.jsx';
import { FenetreEtat } from './interface/dialogues/FenetreEtat.jsx';
import { FenetreInformation } from './interface/dialogues/FenetreInformation.jsx';
import { FenetreRejoindreInitiative } from './interface/dialogues/FenetreRejoindreInitiative.jsx';
import { FenetreResolutionHorloge } from './interface/dialogues/FenetreResolutionHorloge.jsx';
import { FenetreSauvegardeTemplate } from './interface/dialogues/FenetreSauvegardeTemplate.jsx';
import { FenetreAjoutPersonnage } from './interface/fiches/FenetreAjoutPersonnage.jsx';
import { FenetreEditionFiche } from './interface/fiches/FenetreEditionFiche.jsx';
import { FicheParticipant } from './interface/fiches/FicheParticipant.jsx';
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

  const globalAutoTick = roundEffect === 'next' && !!scene.globalTracker?.enabled && !!scene.globalTracker?.auto;

  useEffect(() => {
    if (!scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    element?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [scene.activeId]);

  useEffect(() => {
    if (clockModalOpen && blocked.length === 0) setClockModalOpen(false);
  }, [blocked.length, clockModalOpen]);

  const nextTurn = (direction) => {
    if (direction > 0) setShowNotes(false);
    if (direction > 0 && blocked.length) {
      setClockModalOpen(true);
      return;
    }
    actions.nextTurn(direction);
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

  const resetClock = (participantId, trackerId) => {
    const participant = scene.participants.find((item) => item.id === participantId);
    const tracker = participant?.trackers.find((item) => item.id === trackerId);
    if (!tracker) return;
    actions.trackerChange(participantId, trackerId, { ...tracker, current: 0 });
    setClockModalOpen(false);
  };
  const deleteClock = (participantId, trackerId) => {
    actions.deleteTracker(participantId, trackerId);
    setClockModalOpen(false);
  };
  const nextLabel = blocked.length ? 'Gérer horloge bloquante' : nextStartsRound ? 'Nouveau round' : 'Participant suivant';

  return (
    <div className={`app ${dark ? 'dark' : ''}`}>
      <div className="shell">
        <EnteteScene
          scene={scene}
          actif={active}
          horlogesBloquantes={blocked}
          effetRound={roundEffect}
          compteurGlobalAuto={globalAutoTick}
          notesVisibles={showNotes}
          classeSuivant={nextClass}
          libelleSuivant={nextLabel}
          onBasculerNotes={() => setShowNotes(!showNotes)}
          onTourPrecedent={() => nextTurn(-1)}
          onTourSuivant={() => nextTurn(1)}
          onModifierCompteurGlobal={actions.stepGlobal}
          onOuvrirCompteurGlobal={() => setGlobalSheetOpen(true)}
        />

        <main>
          <ListeInitiative participants={scene.participants} actifId={scene.activeId} interactions={characters} />
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

      {characters.selected && <FicheParticipant participant={characters.selected} enInitiative={characters.isInInit(characters.selected.id)} onFermer={characters.closeCharacter} onModifier={() => characters.editCharacter(characters.selected.id)} onRejoindreInitiative={() => characters.requestJoin(characters.selected.id)} onQuitterInitiative={() => characters.leaveInit(characters.selected.id)} onSuivi={(trackerId, next) => characters.updateCharacterTracker(characters.selected.id, trackerId, next)} onSupprimerSuivi={(trackerId) => characters.deleteCharacterTracker(characters.selected.id, trackerId)} onAjouterEtat={() => characters.requestStatus(characters.selected.id)} onRetirerEtat={(statusId) => characters.removeCharacterStatus(characters.selected.id, statusId)} onNote={(note) => characters.updateCharacter(characters.selected.id, (participant) => ({ ...participant, note }))} />}
      {characters.editing && <FenetreEditionFiche participant={characters.editing} onClose={characters.closeEditor} onSave={characters.saveCharacter} onDelete={() => characters.deleteCharacter(characters.editing.id)} onSaveTemplate={openTemplateSave} />}
      {characters.statusTarget && <FenetreEtat participant={characters.statusTarget} onFermer={characters.cancelStatus} onValider={characters.saveStatus} />}
      {characters.joinTarget && <FenetreRejoindreInitiative participant={characters.joinTarget} onFermer={characters.cancelJoin} onValider={characters.joinInit} />}
      {addSheetOpen && <FenetreAjoutPersonnage templates={templates.templates} onFermer={() => setAddSheetOpen(false)} onCreerVierge={createBlankCharacter} onCreerDepuisTemplate={createFromTemplate} />}
      {templateTarget && <FenetreSauvegardeTemplate participant={templateTarget} categories={templates.categories} erreur={templateError} onFermer={() => setTemplateTarget(null)} onEnregistrer={saveTemplate} />}
      {globalSheetOpen && <GlobalTrackerSheet tracker={scene.globalTracker} onChange={actions.updateGlobalTracker} onStep={actions.stepGlobal} onClose={() => setGlobalSheetOpen(false)} />}
      {clockModalOpen && <FenetreResolutionHorloge participants={blocked} onFermer={() => setClockModalOpen(false)} onRelancerHorloge={resetClock} onSupprimerHorloge={deleteClock} />}
      {notice && <FenetreInformation titre={notice.title} message={notice.message} onFermer={() => setNotice(null)} />}
      {openMenu && <Menu scenes={scenes} scene={scene} restorePoints={restorePoints} onRestore={restoreScene} onClose={() => setOpenMenu(false)} setSceneIndex={actions.setSceneIndex} dark={dark} setDark={actions.setDark} onAddParticipant={openAddCharacter} onNewScene={newScene} onExport={actions.exportCampaign} onImport={importCampaign} onReset={resetDemo} onGlobalTracker={actions.updateGlobalTracker} />}
    </div>
  );
}
