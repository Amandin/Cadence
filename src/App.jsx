import { useEffect, useState } from 'react';
import { ClockResolutionModal } from './components/ClockResolutionModal.jsx';
import { GlobalTracker, GlobalTrackerSheet } from './components/GlobalTracker.jsx';
import { JoinInitSheet } from './components/JoinInitSheet.jsx';
import { Menu } from './components/Menu.jsx';
import { NoticeModal } from './components/NoticeModal.jsx';
import { RoundBadge } from './components/common.jsx';
import { StatusSheet } from './components/StatusSheet.jsx';
import { TemplateSaveSheet } from './components/TemplateSaveSheet.jsx';
import { FenetreAjoutPersonnage } from './interface/fiches/FenetreAjoutPersonnage.jsx';
import { FenetreEditionFiche } from './interface/fiches/FenetreEditionFiche.jsx';
import { FicheParticipant } from './interface/fiches/FicheParticipant.jsx';
import { FichetteInitiative } from './interface/fiches/FichetteInitiative.jsx';
import { FichetteReserve } from './interface/fiches/FichetteReserve.jsx';
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
        <header className="top compact">
          <div className="scene-head">
            <button className="icon-btn" onClick={() => setShowNotes(!showNotes)}>{showNotes ? '⌃' : '⌄'}</button>
            <div>
              <h1>{scene.title}</h1>
              <div className="muted">{scene.type} · {scene.participants.length} en initiative</div>
            </div>
            <RoundBadge round={scene.round} effect={roundEffect} />
          </div>
          {showNotes && <div className="scene-notes panel">{scene.notes}</div>}
          <div className="turn-row">
            <button className="turn-btn" onClick={() => nextTurn(-1)} aria-label="Participant précédent">↶</button>
            <div className="active-box panel">
              <div className="turn-active-line">
                <div className="active-name">
                  <div className="muted">{blocked.length ? 'Horloge à gérer' : 'Tour actif'}</div>
                  <strong>{blocked.length ? blocked.map((participant) => participant.name).join(', ') : active?.name || 'Aucun participant'}</strong>
                </div>
                <GlobalTracker tracker={scene.globalTracker} onStep={actions.stepGlobal} onOpen={() => setGlobalSheetOpen(true)} tick={globalAutoTick} />
              </div>
            </div>
            <button className={`turn-btn next ${nextClass}`} onClick={() => nextTurn(1)} aria-label={nextLabel}>{blocked.length ? '⏸' : '➜'}</button>
          </div>
        </header>

        <main>
          {scene.participants.map((participant) => (
            <FichetteInitiative
              key={participant.id}
              participant={participant}
              actif={participant.id === scene.activeId}
              onOuvrir={() => characters.openCharacter(participant.id)}
              onSuivi={(trackerId, next) => characters.updateCharacterTracker(participant.id, trackerId, next)}
              onSupprimerSuivi={(trackerId) => characters.deleteCharacterTracker(participant.id, trackerId)}
              onAjouterEtat={() => characters.requestStatus(participant.id)}
              onRetirerEtat={(statusId) => characters.removeCharacterStatus(participant.id, statusId)}
              onQuitterInitiative={() => characters.leaveInit(participant.id)}
            />
          ))}
          {scene.reserve?.length > 0 && (
            <section className="reserve">
              <h3>Hors initiative</h3>
              {scene.reserve.map((participant) => (
                <FichetteReserve
                  key={participant.id}
                  participant={participant}
                  onOuvrir={() => characters.openCharacter(participant.id)}
                  onRejoindre={() => characters.requestJoin(participant.id)}
                  onSuivi={(trackerId, next) => characters.updateCharacterTracker(participant.id, trackerId, next)}
                  onSupprimerSuivi={(trackerId) => characters.deleteCharacterTracker(participant.id, trackerId)}
                  onAjouterEtat={() => characters.requestStatus(participant.id)}
                  onRetirerEtat={(statusId) => characters.removeCharacterStatus(participant.id, statusId)}
                />
              ))}
              <label className="field reserve-notes">Notes hors initiative<textarea value={scene.reserveNotes || ''} onChange={(event) => actions.updateSceneField('reserveNotes', event.target.value)} placeholder="Notes, PNJ en attente, effets hors ordre de tour…" /></label>
            </section>
          )}
        </main>
      </div>

      <div className="bottom">
        <button className="turn-btn compact" onClick={() => nextTurn(-1)} aria-label="Participant précédent">↶</button>
        <button className={`primary ${nextClass}`} onClick={() => nextTurn(1)}>{blocked.length ? 'Horloge' : nextStartsRound ? `Nouveau round · R${scene.round + 1}` : `Suivant · R${scene.round}`}</button>
        <button className="small-btn" onClick={openAddCharacter}>+</button>
        <button className="small-btn" onClick={() => setOpenMenu(true)}>☰</button>
      </div>

      {characters.selected && <FicheParticipant participant={characters.selected} enInitiative={characters.isInInit(characters.selected.id)} onFermer={characters.closeCharacter} onModifier={() => characters.editCharacter(characters.selected.id)} onRejoindreInitiative={() => characters.requestJoin(characters.selected.id)} onQuitterInitiative={() => characters.leaveInit(characters.selected.id)} onSuivi={(trackerId, next) => characters.updateCharacterTracker(characters.selected.id, trackerId, next)} onSupprimerSuivi={(trackerId) => characters.deleteCharacterTracker(characters.selected.id, trackerId)} onAjouterEtat={() => characters.requestStatus(characters.selected.id)} onRetirerEtat={(statusId) => characters.removeCharacterStatus(characters.selected.id, statusId)} onNote={(note) => characters.updateCharacter(characters.selected.id, (participant) => ({ ...participant, note }))} />}
      {characters.editing && <FenetreEditionFiche participant={characters.editing} onClose={characters.closeEditor} onSave={characters.saveCharacter} onDelete={() => characters.deleteCharacter(characters.editing.id)} onSaveTemplate={openTemplateSave} />}
      {characters.statusTarget && <StatusSheet participant={characters.statusTarget} onClose={characters.cancelStatus} onSave={characters.saveStatus} />}
      {characters.joinTarget && <JoinInitSheet participant={characters.joinTarget} onClose={characters.cancelJoin} onSave={characters.joinInit} />}
      {addSheetOpen && <FenetreAjoutPersonnage templates={templates.templates} onFermer={() => setAddSheetOpen(false)} onCreerVierge={createBlankCharacter} onCreerDepuisTemplate={createFromTemplate} />}
      {templateTarget && <TemplateSaveSheet participant={templateTarget} categories={templates.categories} error={templateError} onClose={() => setTemplateTarget(null)} onSave={saveTemplate} />}
      {globalSheetOpen && <GlobalTrackerSheet tracker={scene.globalTracker} onChange={actions.updateGlobalTracker} onStep={actions.stepGlobal} onClose={() => setGlobalSheetOpen(false)} />}
      {clockModalOpen && <ClockResolutionModal participants={blocked} onClose={() => setClockModalOpen(false)} onResetClock={resetClock} onDeleteClock={deleteClock} />}
      {notice && <NoticeModal title={notice.title} message={notice.message} onClose={() => setNotice(null)} />}
      {openMenu && <Menu scenes={scenes} scene={scene} restorePoints={restorePoints} onRestore={restoreScene} onClose={() => setOpenMenu(false)} setSceneIndex={actions.setSceneIndex} dark={dark} setDark={actions.setDark} onAddParticipant={openAddCharacter} onNewScene={newScene} onExport={actions.exportCampaign} onImport={importCampaign} onReset={resetDemo} onGlobalTracker={actions.updateGlobalTracker} />}
    </div>
  );
}
