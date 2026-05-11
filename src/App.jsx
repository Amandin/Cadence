import { useEffect, useState } from 'react';
import { isValidCampaign, loadCampaign, saveCampaign, serializeCampaign } from './storage.js';
import { hasTriggeredClock, makeDefaultCampaign, newTracker, nextTurnInfo, tickParticipant, uid } from './logic.js';
import { Avatar, RoundBadge } from './components/common.jsx';
import { ParticipantCard } from './components/ParticipantCard.jsx';
import { ParticipantSheet } from './components/ParticipantSheet.jsx';
import { EditSheet } from './components/EditSheet.jsx';
import { Menu } from './components/Menu.jsx';

function promptStatus() {
  const name = prompt('Nom de l’état ?', 'Nouveau');
  if (!name) return null;

  const raw = prompt('Durée en tours ? Vide = infini', '');
  const duration = raw === '' ? null : Math.max(1, Number(raw));
  const loop = duration != null && confirm('Renouveler en boucle ?');

  return { id: uid('s'), name, duration, remaining: duration, loop, expired: false };
}

function createBlankParticipant() {
  return {
    id: uid('p'),
    name: 'Nouveau personnage',
    kind: 'Allié',
    symbol: '🛡',
    color: 'emerald',
    initiative: 1,
    description: '',
    stats: [],
    statuses: [],
    trackers: [newTracker('bar')],
  };
}

function createBlankScene() {
  return {
    id: uid('scene'),
    title: 'Nouvelle scène',
    type: 'Scène',
    round: 1,
    activeId: '',
    notes: '',
    reserve: [],
    participants: [],
  };
}

export default function App() {
  const [initialCampaign] = useState(loadCampaign);
  const [scenes, setScenes] = useState(initialCampaign.scenes);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [dark, setDark] = useState(initialCampaign.settings?.dark || false);
  const [openMenu, setOpenMenu] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [roundEffect, setRoundEffect] = useState(null);
  const [showNotes, setShowNotes] = useState(true);

  const scene = scenes[sceneIndex] || scenes[0];
  const active = scene.participants.find((p) => p.id === scene.activeId);
  const selected = scene.participants.find((p) => p.id === selectedId);
  const editing = scene.participants.find((p) => p.id === editingId);
  const blocked = scene.participants.filter(hasTriggeredClock);
  const { nextStartsRound } = nextTurnInfo(scene, blocked.length > 0);
  const nextClass = blocked.length ? 'blocked' : nextStartsRound ? 'next-round' : '';

  useEffect(() => saveCampaign(scenes, dark), [scenes, dark]);

  const updateScene = (updater) => setScenes((list) => list.map((s, i) => i === sceneIndex ? updater(s) : s));
  const updateParticipant = (id, updater) => updateScene((s) => ({ ...s, participants: s.participants.map((p) => p.id === id ? updater(p) : p) }));
  const trackerChange = (pid, tid, next) => updateParticipant(pid, (p) => ({ ...p, trackers: p.trackers.map((t) => t.id === tid ? next : t) }));
  const deleteTracker = (pid, tid) => updateParticipant(pid, (p) => ({ ...p, trackers: p.trackers.filter((t) => t.id !== tid) }));
  const addStatus = (pid) => { const status = promptStatus(); if (status) updateParticipant(pid, (p) => ({ ...p, statuses: [...(p.statuses || []), status] })); };
  const removeStatus = (pid, sid) => updateParticipant(pid, (p) => ({ ...p, statuses: (p.statuses || []).filter((s) => s.id !== sid) }));

  function nextTurn(direction = 1) {
    if (direction > 0 && blocked.length) return;
    const participants = scene.participants;
    if (!participants.length) return;

    const currentIndex = Math.max(0, participants.findIndex((p) => p.id === scene.activeId));
    const nextIndex = (currentIndex + direction + participants.length) % participants.length;
    const roundDelta = direction > 0 && nextIndex === 0 && currentIndex !== 0 ? 1 : direction < 0 && currentIndex === 0 ? -1 : 0;

    setRoundEffect(roundDelta > 0 ? 'next' : null);
    updateScene((s) => ({
      ...s,
      activeId: s.participants[nextIndex].id,
      round: Math.max(1, s.round + roundDelta),
      participants: direction > 0 ? s.participants.map((p, i) => i === nextIndex ? tickParticipant(p) : p) : s.participants,
    }));
  }

  function leaveInit(id) {
    const participant = scene.participants.find((x) => x.id === id);
    if (!participant) return;

    updateScene((s) => ({
      ...s,
      participants: s.participants.filter((x) => x.id !== id),
      reserve: [...(s.reserve || []), participant],
      activeId: s.activeId === id ? s.participants.find((x) => x.id !== id)?.id || '' : s.activeId,
    }));
    setSelectedId(null);
    setEditingId(null);
  }

  function joinInit(id) {
    const participant = scene.reserve.find((x) => x.id === id);
    const initiative = Number(prompt('Initiative ?', participant?.initiative || 1));
    if (!participant || !Number.isFinite(initiative)) return;

    updateScene((s) => ({
      ...s,
      reserve: s.reserve.filter((x) => x.id !== id),
      participants: [...s.participants, { ...participant, initiative }],
      activeId: s.activeId || participant.id,
    }));
  }

  function addParticipant() {
    const participant = createBlankParticipant();
    updateScene((s) => ({ ...s, participants: [...s.participants, participant], activeId: s.activeId || participant.id }));
    setOpenMenu(false);
  }

  function newScene() {
    setScenes((currentScenes) => [...currentScenes, createBlankScene()]);
    setSceneIndex(scenes.length);
    setOpenMenu(false);
  }

  function exportCampaign() {
    const blob = new Blob([serializeCampaign(scenes, dark)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campagne-cadence.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCampaign(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!isValidCampaign(data)) return alert('Fichier invalide');
      setScenes(data.scenes);
      setDark(data.settings?.dark || false);
      setSceneIndex(0);
      setOpenMenu(false);
    } catch {
      alert('Impossible de lire ce fichier JSON.');
    }
  }

  return <div className={`app ${dark ? 'dark' : ''}`}><div className="shell"><header className="top"><div className="brand"><div className="logo">C</div><div className="title"><div className="eyebrow">Cadence</div><div className="muted">Carnet de table · initiative · suivis</div></div><button className="icon-btn" onClick={() => setOpenMenu(true)}>☰</button></div><div className="scene-head"><button className="icon-btn" onClick={() => setShowNotes(!showNotes)}>{showNotes ? '⌃' : '⌄'}</button><div><h1 style={{ margin:'0 0 2px' }}>{scene.title}</h1><div className="muted">{scene.type} · {scene.participants.length} en initiative</div></div><RoundBadge round={scene.round} effect={roundEffect} /></div>{showNotes && <div className="scene-notes panel">{scene.notes}</div>}<div className="turn-row"><button className="primary" onClick={() => nextTurn(-1)}>↶</button><div className="active-box panel"><div className="muted">{blocked.length ? 'Horloge à gérer' : 'Tour actif'}</div><strong>{blocked.length ? blocked.map((p) => p.name).join(', ') : active?.name || 'Aucun participant'}</strong></div><button className={`primary ${nextClass}`} onClick={() => nextTurn(1)}>{blocked.length ? 'Bloqué' : nextStartsRound ? 'Nouveau round' : 'Suivant'}</button></div></header><main>{scene.participants.map((p) => <ParticipantCard key={p.id} participant={p} active={p.id === scene.activeId} onOpen={() => setSelectedId(p.id)} onTracker={(tid, next) => trackerChange(p.id, tid, next)} onDeleteTracker={(tid) => deleteTracker(p.id, tid)} onAddStatus={() => addStatus(p.id)} onRemoveStatus={(sid) => removeStatus(p.id, sid)} onLeaveInit={() => leaveInit(p.id)} />)}{scene.reserve?.length > 0 && <section className="reserve"><h3>Hors initiative</h3>{scene.reserve.map((p) => <div className="card" key={p.id}><div className="card-head"><div className="card-main"><Avatar participant={p} /><div className="info"><strong>{p.name}</strong><div className="muted">{p.description}</div></div></div><button className="small-btn" onClick={() => joinInit(p.id)}>Rejoindre init</button></div></div>)}</section>}</main></div><div className="bottom"><button className="small-btn" onClick={() => nextTurn(-1)}>Préc.</button><button className={`primary ${nextClass}`} onClick={() => nextTurn(1)}>{blocked.length ? 'Horloge' : nextStartsRound ? `Nouveau round · R${scene.round + 1}` : `Suivant · R${scene.round}`}</button><button className="small-btn" onClick={addParticipant}>+</button><button className="small-btn" onClick={() => setOpenMenu(true)}>☰</button></div>{selected && <ParticipantSheet participant={selected} onClose={() => setSelectedId(null)} onEdit={() => setEditingId(selected.id)} onTracker={(tid, next) => trackerChange(selected.id, tid, next)} onDeleteTracker={(tid) => deleteTracker(selected.id, tid)} onAddStatus={() => addStatus(selected.id)} onRemoveStatus={(sid) => removeStatus(selected.id, sid)} onNote={(note) => updateParticipant(selected.id, (p) => ({ ...p, note }))} />}{editing && <EditSheet participant={editing} onClose={() => setEditingId(null)} onSave={(draft) => { updateParticipant(draft.id, () => draft); setEditingId(null); }} onDelete={() => { updateScene((s) => ({ ...s, participants: s.participants.filter((p) => p.id !== editing.id) })); setEditingId(null); setSelectedId(null); }} />}{openMenu && <Menu scenes={scenes} onClose={() => setOpenMenu(false)} setSceneIndex={setSceneIndex} dark={dark} setDark={setDark} onAddParticipant={addParticipant} onNewScene={newScene} onExport={exportCampaign} onImport={importCampaign} onReset={() => { const fresh = makeDefaultCampaign(); setScenes(fresh.scenes); setSceneIndex(0); setOpenMenu(false); }} />}</div>;
}
