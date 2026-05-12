import { useEffect, useState } from 'react';
import { ClockResolutionModal } from './components/ClockResolutionModal.jsx';
import { EditSheet } from './components/EditSheet.jsx';
import { GlobalTracker, GlobalTrackerSheet } from './components/GlobalTracker.jsx';
import { JoinInitSheet } from './components/JoinInitSheet.jsx';
import { Menu } from './components/Menu.jsx';
import { NoticeModal } from './components/NoticeModal.jsx';
import { ParticipantCard } from './components/ParticipantCard.jsx';
import { ParticipantSheet } from './components/ParticipantSheet.jsx';
import { ReserveCard } from './components/ReserveCard.jsx';
import { RoundBadge } from './components/common.jsx';
import { StatusSheet } from './components/StatusSheet.jsx';
import { createStatus } from './domain/statuses.js';
import { useCampaign } from './hooks/useCampaign.js';

export default function App() {
  const campaign = useCampaign();
  const { scenes, scene, restorePoints, dark, active, blocked, nextStartsRound, nextClass, roundEffect, actions } = campaign;
  const [openMenu, setOpenMenu] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusTargetId, setStatusTargetId] = useState(null);
  const [joinTargetId, setJoinTargetId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showNotes, setShowNotes] = useState(true);
  const [clockModalOpen, setClockModalOpen] = useState(false);
  const [globalSheetOpen, setGlobalSheetOpen] = useState(false);

  const allCharacters = [...scene.participants, ...(scene.reserve || [])];
  const selected = allCharacters.find((participant) => participant.id === selectedId);
  const editing = allCharacters.find((participant) => participant.id === editingId);
  const statusTarget = allCharacters.find((participant) => participant.id === statusTargetId);
  const joinTarget = (scene.reserve || []).find((participant) => participant.id === joinTargetId);
  const globalAutoTick = roundEffect === 'next' && !!scene.globalTracker?.enabled && !!scene.globalTracker?.auto;

  useEffect(() => {
    if (!scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    element?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [scene.activeId]);

  useEffect(() => {
    if (clockModalOpen && blocked.length === 0) setClockModalOpen(false);
  }, [blocked.length, clockModalOpen]);

  const closeCharacterPanels = () => {
    setSelectedId(null);
    setEditingId(null);
  };

  const isInInit = (id) => scene.participants.some((participant) => participant.id === id);
  const updateReserve = (updater) => actions.updateSceneField('reserve', updater(scene.reserve || []));
  const updateCharacter = (id, updater) => {
    if (isInInit(id)) actions.updateParticipant(id, updater);
    else updateReserve((reserve) => reserve.map((participant) => participant.id === id ? updater(participant) : participant));
  };

  const updateCharacterTracker = (participantId, trackerId, next) => updateCharacter(participantId, (participant) => ({ ...participant, trackers: (participant.trackers || []).map((tracker) => tracker.id === trackerId ? next : tracker) }));
  const deleteCharacterTracker = (participantId, trackerId) => updateCharacter(participantId, (participant) => ({ ...participant, trackers: (participant.trackers || []).filter((tracker) => tracker.id !== trackerId) }));
  const removeCharacterStatus = (participantId, statusId) => updateCharacter(participantId, (participant) => ({ ...participant, statuses: (participant.statuses || []).filter((status) => status.id !== statusId) }));
  const addCharacterStatus = (participantId, data) => {
    const status = createStatus(data);
    if (status) updateCharacter(participantId, (participant) => ({ ...participant, statuses: [...(participant.statuses || []), status] }));
  };

  const nextTurn = (direction) => {
    if (direction > 0) setShowNotes(false);
    if (direction > 0 && blocked.length) {
      setClockModalOpen(true);
      return;
    }
    actions.nextTurn(direction);
  };

  const addParticipant = () => {
    actions.addParticipant();
    setOpenMenu(false);
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
    closeCharacterPanels();
  };
  const resetDemo = () => {
    actions.resetDemo();
    setOpenMenu(false);
    closeCharacterPanels();
  };
  const restoreScene = (pointId) => {
    actions.restoreScene(pointId);
    setOpenMenu(false);
    closeCharacterPanels();
  };
  const saveStatus = (data) => {
    if (!statusTargetId) return;
    addCharacterStatus(statusTargetId, data);
    setStatusTargetId(null);
  };
  const joinInit = (initiative) => {
    if (!joinTargetId) return;
    actions.joinInit(joinTargetId, initiative);
    setJoinTargetId(null);
  };

  const leaveInit = (id) => {
    actions.leaveInit(id);
    closeCharacterPanels();
  };
  const saveCharacter = (draft) => {
    updateCharacter(draft.id, () => draft);
    setEditingId(null);
  };
  const deleteCharacter = (id) => {
    actions.deleteParticipant(id);
    closeCharacterPanels();
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
              onOpen={() => setSelectedId(participant.id)}
              onTracker={(trackerId, next) => updateCharacterTracker(participant.id, trackerId, next)}
              onDeleteTracker={(trackerId) => deleteCharacterTracker(participant.id, trackerId)}
              onAddStatus={() => setStatusTargetId(participant.id)}
              onRemoveStatus={(statusId) => removeCharacterStatus(participant.id, statusId)}
              onLeaveInit={() => leaveInit(participant.id)}
            />
          ))}
          {scene.reserve?.length > 0 && (
            <section className="reserve">
              <h3>Hors initiative</h3>
              {scene.reserve.map((participant) => (
                <ReserveCard
                  key={participant.id}
                  participant={participant}
                  onOpen={() => setSelectedId(participant.id)}
                  onJoin={() => setJoinTargetId(participant.id)}
                  onTracker={(trackerId, next) => updateCharacterTracker(participant.id, trackerId, next)}
                  onDeleteTracker={(trackerId) => deleteCharacterTracker(participant.id, trackerId)}
                  onAddStatus={() => setStatusTargetId(participant.id)}
                  onRemoveStatus={(statusId) => removeCharacterStatus(participant.id, statusId)}
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
        <button className="small-btn" onClick={addParticipant}>+</button>
        <button className="small-btn" onClick={() => setOpenMenu(true)}>☰</button>
      </div>

      {selected && <ParticipantSheet participant={selected} onClose={() => setSelectedId(null)} onEdit={() => setEditingId(selected.id)} onTracker={(trackerId, next) => updateCharacterTracker(selected.id, trackerId, next)} onDeleteTracker={(trackerId) => deleteCharacterTracker(selected.id, trackerId)} onAddStatus={() => setStatusTargetId(selected.id)} onRemoveStatus={(statusId) => removeCharacterStatus(selected.id, statusId)} onNote={(note) => updateCharacter(selected.id, (participant) => ({ ...participant, note }))} />}
      {editing && <EditSheet participant={editing} onClose={() => setEditingId(null)} onSave={saveCharacter} onDelete={() => deleteCharacter(editing.id)} />}
      {statusTarget && <StatusSheet participant={statusTarget} onClose={() => setStatusTargetId(null)} onSave={saveStatus} />}
      {joinTarget && <JoinInitSheet participant={joinTarget} onClose={() => setJoinTargetId(null)} onSave={joinInit} />}
      {globalSheetOpen && <GlobalTrackerSheet tracker={scene.globalTracker} onChange={actions.updateGlobalTracker} onStep={actions.stepGlobal} onClose={() => setGlobalSheetOpen(false)} />}
      {clockModalOpen && <ClockResolutionModal participants={blocked} onClose={() => setClockModalOpen(false)} onResetClock={resetClock} onDeleteClock={deleteClock} />}
      {notice && <NoticeModal title={notice.title} message={notice.message} onClose={() => setNotice(null)} />}
      {openMenu && <Menu scenes={scenes} scene={scene} restorePoints={restorePoints} onRestore={restoreScene} onClose={() => setOpenMenu(false)} setSceneIndex={actions.setSceneIndex} dark={dark} setDark={actions.setDark} onAddParticipant={addParticipant} onNewScene={newScene} onExport={actions.exportCampaign} onImport={importCampaign} onReset={resetDemo} onGlobalTracker={actions.updateGlobalTracker} />}
    </div>
  );
}
