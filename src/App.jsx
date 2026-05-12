import { useEffect, useState } from 'react';
import { Avatar, RoundBadge, Sheet } from './components/common.jsx';
import { ClockResolutionModal } from './components/ClockResolutionModal.jsx';
import { ParticipantCard } from './components/ParticipantCard.jsx';
import { ParticipantSheet } from './components/ParticipantSheet.jsx';
import { EditSheet } from './components/EditSheet.jsx';
import { JoinInitSheet } from './components/JoinInitSheet.jsx';
import { Menu } from './components/Menu.jsx';
import { NoticeModal } from './components/NoticeModal.jsx';
import { StatusSheet } from './components/StatusSheet.jsx';
import { Tracker } from './components/Tracker.jsx';
import { useCampaign } from './hooks/useCampaign.js';

function GlobalTracker({ tracker, onStep, onOpen, tick }) {
  if (!tracker?.enabled) return null;
  const max = Math.max(1, Number(tracker.max || 10));
  const current = Math.max(0, Number(tracker.current || 0));
  const overflowing = current > max;
  const overflow = Math.max(0, current - max);
  const overflowRemainder = overflow % max;
  const overflowRatio = overflowing ? (overflowRemainder === 0 ? 1 : overflowRemainder / max) : 0;
  const completedCycles = overflowing ? Math.floor(current / max) : 0;
  const fullCycle = current >= max && current % max === 0;
  const progress = overflowing ? 1 : Math.min(1, current / max);
  return <div className={`global-mini ${tracker.auto ? 'auto-active' : ''} ${tick ? 'auto-tick' : ''} ${fullCycle ? 'cycle-complete' : ''} ${overflowing ? 'overflowing' : ''}`}><button onClick={(e) => { e.stopPropagation(); onStep(-1); }}>−</button><div className="global-mini-main"><span>{tracker.name || 'Menace'}</span><button className={`clock-face global-clock ${tracker.mode === 'counter' ? 'counter-mode' : ''} ${fullCycle ? 'cycle-complete' : ''} ${overflowing ? 'overflowing' : ''}`} style={{ '--clock-progress': `${progress * 360}deg`, '--overflow-progress': `${overflowRatio * 360}deg` }} onClick={onOpen} aria-label="Gérer le compteur de scène"><span>{current}</span>{tracker.mode === 'clock' && <small>/{max}</small>}</button>{overflowing && <em className="overflow-badge">×{completedCycles}</em>}{tick && <em className="auto-plus">+1</em>}</div><button onClick={(e) => { e.stopPropagation(); onStep(1); }}>+</button></div>;
}

function GlobalTrackerSheet({ tracker, onChange, onStep, onClose }) {
  const current = { enabled: false, name: 'Menace', mode: 'clock', current: 0, max: 10, auto: false, ...(tracker || {}) };
  const patch = (value) => onChange({ ...current, ...value });
  return <Sheet title="Compteur de scène" onClose={onClose}><div className="stack"><label className="row"><input type="checkbox" checked={!!current.enabled} onChange={(e) => patch({ enabled: e.target.checked })} /> actif dans l’entête</label><label className="field">Nom<input value={current.name || ''} onChange={(e) => patch({ name: e.target.value })} placeholder="Menace" /></label><div className="grid2"><label className="field">Type<select value={current.mode || 'clock'} onChange={(e) => patch({ mode: e.target.value })}><option value="clock">Horloge</option><option value="counter">Compteur</option></select></label><label className="field">Valeur<input type="number" inputMode="numeric" value={current.current ?? 0} onChange={(e) => patch({ current: e.target.value === '' ? 0 : Number(e.target.value) })} /></label></div><label className="field">Maximum<input type="number" inputMode="numeric" min="1" value={current.max ?? 10} onChange={(e) => patch({ max: Math.max(1, Number(e.target.value) || 1) })} /></label><label className="row"><input type="checkbox" checked={!!current.auto} onChange={(e) => patch({ auto: e.target.checked })} /> avance automatiquement à chaque nouveau round</label><div className="grid2"><button className="small-btn" onClick={() => onStep(-1)}>−1</button><button className="small-btn" onClick={() => onStep(1)}>+1</button></div></div></Sheet>;
}

function ReserveCard({ participant, onJoin, onOpen, onTracker, onDeleteTracker, onAddStatus, onRemoveStatus }) {
  const [collapsed, setCollapsed] = useState(false);
  return <div className={`card reserve-card ${collapsed ? 'collapsed' : ''}`} data-participant-id={participant.id}><div className="card-head"><button className="icon-btn collapse-btn" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Dérouler la fichette' : 'Enrouler la fichette'}>{collapsed ? '⌄' : '⌃'}</button><button className="card-main" onClick={onOpen}><Avatar participant={participant} /><div className="info"><strong>{participant.name}</strong><div className="muted">{participant.description}</div></div></button><button className="small-btn" onClick={onJoin}>Rejoindre init</button></div>{!collapsed && <div className="trackers">{participant.trackers?.map((tracker) => <Tracker key={tracker.id} tracker={tracker} onChange={(next) => onTracker(tracker.id, next)} onDelete={() => onDeleteTracker(tracker.id)} />)}<div className="statuses">{participant.statuses?.map((s) => <span className={`status ${s.duration == null ? 'permanent' : s.loop ? 'loop' : 'temporary'} ${s.expired ? 'expired' : ''}`} key={s.id}>{s.name}</span>)}<button className="small-btn" onClick={onAddStatus}>+ état</button></div></div>}</div>;
}

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
  const selected = allCharacters.find((p) => p.id === selectedId);
  const editing = allCharacters.find((p) => p.id === editingId);
  const statusTarget = allCharacters.find((p) => p.id === statusTargetId);
  const joinTarget = (scene.reserve || []).find((p) => p.id === joinTargetId);
  const globalAutoTick = roundEffect === 'next' && !!scene.globalTracker?.enabled && !!scene.globalTracker?.auto;

  useEffect(() => {
    if (!scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    element?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [scene.activeId]);

  useEffect(() => {
    if (clockModalOpen && blocked.length === 0) setClockModalOpen(false);
  }, [blocked.length, clockModalOpen]);

  const closeCharacterPanels = () => { setSelectedId(null); setEditingId(null); };
  const leaveInit = (id) => { actions.leaveInit(id); closeCharacterPanels(); };

  const nextTurn = (direction) => {
    if (direction > 0) setShowNotes(false);
    if (direction > 0 && blocked.length) { setClockModalOpen(true); return; }
    actions.nextTurn(direction);
  };

  const addParticipant = () => { actions.addParticipant(); setOpenMenu(false); };
  const newScene = () => { actions.newScene(); setOpenMenu(false); };
  const importCampaign = async (file) => {
    const result = await actions.importCampaign(file);
    if (result?.ok === false) { setNotice({ title: 'Import impossible', message: result.message }); return; }
    setOpenMenu(false); closeCharacterPanels();
  };
  const resetDemo = () => { actions.resetDemo(); setOpenMenu(false); closeCharacterPanels(); };
  const restoreScene = (pointId) => { actions.restoreScene(pointId); setOpenMenu(false); closeCharacterPanels(); };
  const saveStatus = (data) => { if (!statusTargetId) return; actions.addStatus(statusTargetId, data); setStatusTargetId(null); };
  const joinInit = (initiative) => { if (!joinTargetId) return; actions.joinInit(joinTargetId, initiative); setJoinTargetId(null); };

  const saveCharacter = (draft) => {
    const inInit = scene.participants.some((p) => p.id === draft.id);
    if (inInit) actions.updateParticipant(draft.id, () => draft);
    else actions.updateSceneField('reserve', (scene.reserve || []).map((p) => p.id === draft.id ? draft : p));
    setEditingId(null);
  };

  const updateReserveTracker = (pid, tid, next) => actions.updateSceneField('reserve', (scene.reserve || []).map((p) => p.id === pid ? { ...p, trackers: p.trackers.map((t) => t.id === tid ? next : t) } : p));
  const deleteReserveTracker = (pid, tid) => actions.updateSceneField('reserve', (scene.reserve || []).map((p) => p.id === pid ? { ...p, trackers: p.trackers.filter((t) => t.id !== tid) } : p));
  const deleteCharacter = (id) => { actions.deleteParticipant(id); closeCharacterPanels(); };

  const resetClock = (participantId, trackerId) => {
    const participant = scene.participants.find((p) => p.id === participantId);
    const tracker = participant?.trackers.find((t) => t.id === trackerId);
    if (!tracker) return;
    actions.trackerChange(participantId, trackerId, { ...tracker, current: 0 });
    setClockModalOpen(false);
  };
  const deleteClock = (participantId, trackerId) => { actions.deleteTracker(participantId, trackerId); setClockModalOpen(false); };
  const nextLabel = blocked.length ? 'Gérer horloge bloquante' : nextStartsRound ? 'Nouveau round' : 'Participant suivant';

  return <div className={`app ${dark ? 'dark' : ''}`}><div className="shell"><header className="top compact"><div className="scene-head"><button className="icon-btn" onClick={() => setShowNotes(!showNotes)}>{showNotes ? '⌃' : '⌄'}</button><div><h1>{scene.title}</h1><div className="muted">{scene.type} · {scene.participants.length} en initiative</div></div><RoundBadge round={scene.round} effect={roundEffect} /></div>{showNotes && <div className="scene-notes panel">{scene.notes}</div>}<div className="turn-row"><button className="turn-btn" onClick={() => nextTurn(-1)} aria-label="Participant précédent">↶</button><div className="active-box panel"><div className="turn-active-line"><div className="active-name"><div className="muted">{blocked.length ? 'Horloge à gérer' : 'Tour actif'}</div><strong>{blocked.length ? blocked.map((p) => p.name).join(', ') : active?.name || 'Aucun participant'}</strong></div><GlobalTracker tracker={scene.globalTracker} onStep={actions.stepGlobal} onOpen={() => setGlobalSheetOpen(true)} tick={globalAutoTick} /></div></div><button className={`turn-btn next ${nextClass}`} onClick={() => nextTurn(1)} aria-label={nextLabel}>{blocked.length ? '⏸' : '➜'}</button></div></header><main>{scene.participants.map((p) => <ParticipantCard key={p.id} participant={p} active={p.id === scene.activeId} onOpen={() => setSelectedId(p.id)} onTracker={(tid, next) => actions.trackerChange(p.id, tid, next)} onDeleteTracker={(tid) => actions.deleteTracker(p.id, tid)} onAddStatus={() => setStatusTargetId(p.id)} onRemoveStatus={(sid) => actions.removeStatus(p.id, sid)} onLeaveInit={() => leaveInit(p.id)} />)}{scene.reserve?.length > 0 && <section className="reserve"><h3>Hors initiative</h3>{scene.reserve.map((p) => <ReserveCard key={p.id} participant={p} onOpen={() => setSelectedId(p.id)} onJoin={() => setJoinTargetId(p.id)} onTracker={(tid, next) => updateReserveTracker(p.id, tid, next)} onDeleteTracker={(tid) => deleteReserveTracker(p.id, tid)} onAddStatus={() => setStatusTargetId(p.id)} onRemoveStatus={() => {}} />)}<label className="field reserve-notes">Notes hors initiative<textarea value={scene.reserveNotes || ''} onChange={(e) => actions.updateSceneField('reserveNotes', e.target.value)} placeholder="Notes, PNJ en attente, effets hors ordre de tour…" /></label></section>}</main></div><div className="bottom"><button className="turn-btn compact" onClick={() => nextTurn(-1)} aria-label="Participant précédent">↶</button><button className={`primary ${nextClass}`} onClick={() => nextTurn(1)}>{blocked.length ? 'Horloge' : nextStartsRound ? `Nouveau round · R${scene.round + 1}` : `Suivant · R${scene.round}`}</button><button className="small-btn" onClick={addParticipant}>+</button><button className="small-btn" onClick={() => setOpenMenu(true)}>☰</button></div>{selected && <ParticipantSheet participant={selected} onClose={() => setSelectedId(null)} onEdit={() => setEditingId(selected.id)} onTracker={(tid, next) => actions.trackerChange(selected.id, tid, next)} onDeleteTracker={(tid) => actions.deleteTracker(selected.id, tid)} onAddStatus={() => setStatusTargetId(selected.id)} onRemoveStatus={(sid) => actions.removeStatus(selected.id, sid)} onNote={(note) => actions.updateParticipant(selected.id, (p) => ({ ...p, note }))} />}{editing && <EditSheet participant={editing} onClose={() => setEditingId(null)} onSave={saveCharacter} onDelete={() => deleteCharacter(editing.id)} />}{statusTarget && <StatusSheet participant={statusTarget} onClose={() => setStatusTargetId(null)} onSave={saveStatus} />}{joinTarget && <JoinInitSheet participant={joinTarget} onClose={() => setJoinTargetId(null)} onSave={joinInit} />}{globalSheetOpen && <GlobalTrackerSheet tracker={scene.globalTracker} onChange={actions.updateGlobalTracker} onStep={actions.stepGlobal} onClose={() => setGlobalSheetOpen(false)} />}{clockModalOpen && <ClockResolutionModal participants={blocked} onClose={() => setClockModalOpen(false)} onResetClock={resetClock} onDeleteClock={deleteClock} />}{notice && <NoticeModal title={notice.title} message={notice.message} onClose={() => setNotice(null)} />}{openMenu && <Menu scenes={scenes} scene={scene} restorePoints={restorePoints} onRestore={restoreScene} onClose={() => setOpenMenu(false)} setSceneIndex={actions.setSceneIndex} dark={dark} setDark={actions.setDark} onAddParticipant={addParticipant} onNewScene={newScene} onExport={actions.exportCampaign} onImport={importCampaign} onReset={resetDemo} onGlobalTracker={actions.updateGlobalTracker} />}</div>;
}
