import { useEffect, useState } from 'react';
import { Avatar, RoundBadge } from './components/common.jsx';
import { ParticipantCard } from './components/ParticipantCard.jsx';
import { ParticipantSheet } from './components/ParticipantSheet.jsx';
import { EditSheet } from './components/EditSheet.jsx';
import { JoinInitSheet } from './components/JoinInitSheet.jsx';
import { Menu } from './components/Menu.jsx';
import { NoticeModal } from './components/NoticeModal.jsx';
import { StatusSheet } from './components/StatusSheet.jsx';
import { useCampaign } from './hooks/useCampaign.js';

export default function App() {
  const campaign = useCampaign();
  const { scenes, scene, dark, active, blocked, nextStartsRound, nextClass, roundEffect, actions } = campaign;
  const [openMenu, setOpenMenu] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusTargetId, setStatusTargetId] = useState(null);
  const [joinTargetId, setJoinTargetId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showNotes, setShowNotes] = useState(true);

  const selected = scene.participants.find((p) => p.id === selectedId);
  const editing = scene.participants.find((p) => p.id === editingId);
  const statusTarget = scene.participants.find((p) => p.id === statusTargetId);
  const joinTarget = (scene.reserve || []).find((p) => p.id === joinTargetId);

  useEffect(() => {
    if (!scene.activeId) return;
    const element = document.querySelector(`[data-participant-id="${scene.activeId}"]`);
    element?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [scene.activeId]);

  const closeCharacterPanels = () => {
    setSelectedId(null);
    setEditingId(null);
  };

  const leaveInit = (id) => {
    actions.leaveInit(id);
    closeCharacterPanels();
  };

  const nextTurn = (direction) => {
    if (direction > 0) setShowNotes(false);
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

  const saveStatus = (data) => {
    if (!statusTargetId) return;
    actions.addStatus(statusTargetId, data);
    setStatusTargetId(null);
  };

  const joinInit = (initiative) => {
    if (!joinTargetId) return;
    actions.joinInit(joinTargetId, initiative);
    setJoinTargetId(null);
  };

  return <div className={`app ${dark ? 'dark' : ''}`}><div className="shell"><header className="top compact"><div className="scene-head"><button className="icon-btn" onClick={() => setShowNotes(!showNotes)}>{showNotes ? '⌃' : '⌄'}</button><div><h1 style={{ margin:'0 0 2px' }}>{scene.title}</h1><div className="muted">{scene.type} · {scene.participants.length} en initiative</div></div><RoundBadge round={scene.round} effect={roundEffect} /></div>{showNotes && <div className="scene-notes panel">{scene.notes}</div>}<div className="turn-row"><button className="primary" onClick={() => nextTurn(-1)}>↶</button><div className="active-box panel"><div className="muted">{blocked.length ? 'Horloge à gérer' : 'Tour actif'}</div><strong>{blocked.length ? blocked.map((p) => p.name).join(', ') : active?.name || 'Aucun participant'}</strong></div><button className={`primary ${nextClass}`} onClick={() => nextTurn(1)}>{blocked.length ? 'Bloqué' : nextStartsRound ? 'Nouveau round' : 'Suivant'}</button></div></header><main>{scene.participants.map((p) => <ParticipantCard key={p.id} participant={p} active={p.id === scene.activeId} onOpen={() => setSelectedId(p.id)} onTracker={(tid, next) => actions.trackerChange(p.id, tid, next)} onDeleteTracker={(tid) => actions.deleteTracker(p.id, tid)} onAddStatus={() => setStatusTargetId(p.id)} onRemoveStatus={(sid) => actions.removeStatus(p.id, sid)} onLeaveInit={() => leaveInit(p.id)} />)}{scene.reserve?.length > 0 && <section className="reserve"><h3>Hors initiative</h3>{scene.reserve.map((p) => <div className="card" key={p.id} data-participant-id={p.id}><div className="card-head"><div className="card-main"><Avatar participant={p} /><div className="info"><strong>{p.name}</strong><div className="muted">{p.description}</div></div></div><button className="small-btn" onClick={() => setJoinTargetId(p.id)}>Rejoindre init</button></div></div>)}</section>}</main></div><div className="bottom"><button className="small-btn" onClick={() => nextTurn(-1)}>Préc.</button><button className={`primary ${nextClass}`} onClick={() => nextTurn(1)}>{blocked.length ? 'Horloge' : nextStartsRound ? `Nouveau round · R${scene.round + 1}` : `Suivant · R${scene.round}`}</button><button className="small-btn" onClick={addParticipant}>+</button><button className="small-btn" onClick={() => setOpenMenu(true)}>☰</button></div>{selected && <ParticipantSheet participant={selected} onClose={() => setSelectedId(null)} onEdit={() => setEditingId(selected.id)} onTracker={(tid, next) => actions.trackerChange(selected.id, tid, next)} onDeleteTracker={(tid) => actions.deleteTracker(selected.id, tid)} onAddStatus={() => setStatusTargetId(selected.id)} onRemoveStatus={(sid) => actions.removeStatus(selected.id, sid)} onNote={(note) => actions.updateParticipant(selected.id, (p) => ({ ...p, note }))} />}{editing && <EditSheet participant={editing} onClose={() => setEditingId(null)} onSave={(draft) => { actions.updateParticipant(draft.id, () => draft); setEditingId(null); }} onDelete={() => { actions.deleteParticipant(editing.id); closeCharacterPanels(); }} />}{statusTarget && <StatusSheet participant={statusTarget} onClose={() => setStatusTargetId(null)} onSave={saveStatus} />}{joinTarget && <JoinInitSheet participant={joinTarget} onClose={() => setJoinTargetId(null)} onSave={joinInit} />}{notice && <NoticeModal title={notice.title} message={notice.message} onClose={() => setNotice(null)} />}{openMenu && <Menu scenes={scenes} onClose={() => setOpenMenu(false)} setSceneIndex={actions.setSceneIndex} dark={dark} setDark={actions.setDark} onAddParticipant={addParticipant} onNewScene={newScene} onExport={actions.exportCampaign} onImport={importCampaign} onReset={resetDemo} />}</div>;
}
