import { useEffect, useState } from 'react';
import { AddCharacterSheet } from './components/AddCharacterSheet.jsx';
import { ClockResolutionModal } from './components/ClockResolutionModal.jsx';
import { GlobalTracker, GlobalTrackerSheet } from './components/GlobalTracker.jsx';
import { JoinInitSheet } from './components/JoinInitSheet.jsx';
import { Menu } from './components/Menu.jsx';
import { NoticeModal } from './components/NoticeModal.jsx';
import { ParticipantCard } from './components/ParticipantCard.jsx';
import { ParticipantSheet } from './components/ParticipantSheet.jsx';
import { ReserveCard } from './components/ReserveCard.jsx';
import { RoundBadge } from './components/common.jsx';
import { StatusSheet } from './components/StatusSheet.jsx';
import { TemplateSaveSheet } from './components/TemplateSaveSheet.jsx';
import { FenetreEditionFiche } from './interface/fiches/FenetreEditionFiche.jsx';
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
            <ParticipantCard
              key={participant.id}
              participant={participant}
              active={participant.id === scene.activeId}
              onOpen={() => characters.openCharacter(participant.id)}
              onTracker={(trackerId, next) => characters.updateCharacterTracker(participant.id, trackerId, next)}
              onDeleteTracker={(trackerId) => characters.deleteCharacterTracker(participant.id, trackerId)}
              onAddStatus={() => characters.requestStatus(participant.id)}
              onRemoveStatus={(statusId) => characters.removeCharacterStatus(participant.id, statusId)}
              onLeaveInit={() => characters.leaveInit(participant.id)}
            />
          ))}
          {scene.reserve?.length > 0 && (
            <section className="reserve">
              <h3>Hors initiative</h3>
              {scene.reserve.map((participant) => (
                <ReserveCard
                  key={participant.id}
                  participant={participant}
                  onOpen={() => characters.openCharacter(participant.id)}
                  onJoin={() => characters.requestJoin(participant.id)}
                  onTracker={(trackerId, next) => characters.updateCharacterTracker(participant.id, trackerId, next)}
                  onDeleteTracker={(trackerId) => characters.deleteCharacterTracker(participant.id, trackerId)}
                  onAddStatus={() => characters.requestStatus(participant.id)}
                  onRemoveStatus={(statusId) => characters.removeCharacterStatus(participant.id, statusId)}
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

      {characters.selected && <ParticipantSheet participant={characters.selected} inInitiative={characters.isInInit(characters.selected.id)} onClose={characters.closeCharacter} onEdit={() => characters.editCharacter(characters.selected.id)} onJoinInit={() => characters.requestJoin(characters.selected.id)} onLeaveInit={() => characters.leaveInit(characters.selected.id)} onTracker={(trackerId, next) => characters.updateCharacterTracker(characters.selected.id, trackerId, next)} onDeleteTracker={(trackerId) => characters.deleteCharacterTracker(characters.selected.id, trackerId)} onAddStatus={() => characters.requestStatus(characters.selected.id)} onRemoveStatus={(statusId) => characters.removeCharacterStatus(characters.selected.id, statusId)} onNote={(note) => characters.updateCharacter(characters.selected.id, (participant) => ({ ...participant, note }))} />}
      {characters.editing && <FenetreEditionFiche participant={characters.editing} onClose={characters.closeEditor} onSave={characters.saveCharacter} onDelete={() => characters.deleteCharacter(characters.editing.id)} onSaveTemplate={openTemplateSave} />}
      {characters.statusTarget && <StatusSheet participant={characters.statusTarget} onClose={characters.cancelStatus} onSave={characters.saveStatus} />}
      {characters.joinTarget && <JoinInitSheet participant={characters.joinTarget} onClose={characters.cancelJoin} onSave={characters.joinInit} />}
      {addSheetOpen && <AddCharacterSheet templates={templates.templates} onClose={() => setAddSheetOpen(false)} onCreateBlank={createBlankCharacter} onCreateFromTemplate={createFromTemplate} />}
      {templateTarget && <TemplateSaveSheet participant={templateTarget} categories={templates.categories} error={templateError} onClose={() => setTemplateTarget(null)} onSave={saveTemplate} />}
      {globalSheetOpen && <GlobalTrackerSheet tracker={scene.globalTracker} onChange={actions.updateGlobalTracker} onStep={actions.stepGlobal} onClose={() => setGlobalSheetOpen(false)} />}
      {clockModalOpen && <ClockResolutionModal participants={blocked} onClose={() => setClockModalOpen(false)} onResetClock={resetClock} onDeleteClock={deleteClock} />}
      {notice && <NoticeModal title={notice.title} message={notice.message} onClose={() => setNotice(null)} />}
      {openMenu && <Menu scenes={scenes} scene={scene} restorePoints={restorePoints} onRestore={restoreScene} onClose={() => setOpenMenu(false)} setSceneIndex={actions.setSceneIndex} dark={dark} setDark={actions.setDark} onAddParticipant={openAddCharacter} onNewScene={newScene} onExport={actions.exportCampaign} onImport={importCampaign} onReset={resetDemo} onGlobalTracker={actions.updateGlobalTracker} />}
    </div>
  );
}
