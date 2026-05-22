import { useState } from 'react';
import { createStatus } from '../domain/statuses.js';

/**
 * Centralizes every mutation that must work both for initiative participants
 * and reserve characters. App.jsx can then stay focused on screen layout.
 */
export function useCharacterInteractions(scene, actions) {
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusTargetId, setStatusTargetId] = useState(null);
  const [joinTargetId, setJoinTargetId] = useState(null);

  const allCharacters = [...scene.participants, ...(scene.reserve || [])];
  const selected = allCharacters.find((participant) => participant.id === selectedId);
  const editing = allCharacters.find((participant) => participant.id === editingId);
  const statusTarget = allCharacters.find((participant) => participant.id === statusTargetId);
  const joinTarget = (scene.reserve || []).find((participant) => participant.id === joinTargetId);

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

  const updateCharacterTracker = (participantId, trackerId, next) => updateCharacter(participantId, (participant) => ({
    ...participant,
    trackers: (participant.trackers || []).map((tracker) => tracker.id === trackerId ? next : tracker),
  }));

  const deleteCharacterTracker = (participantId, trackerId) => updateCharacter(participantId, (participant) => ({
    ...participant,
    trackers: (participant.trackers || []).filter((tracker) => tracker.id !== trackerId),
  }));

  const removeCharacterStatus = (participantId, statusId) => updateCharacter(participantId, (participant) => ({
    ...participant,
    statuses: (participant.statuses || []).filter((status) => status.id !== statusId),
  }));

  const addCharacterStatus = (participantId, data) => {
    const status = createStatus(data);
    if (status) updateCharacter(participantId, (participant) => ({ ...participant, statuses: [...(participant.statuses || []), status] }));
  };

  const addCharacter = (participant, { placement = 'init', initiative = 1 } = {}) => {
    if (!participant) return;
    const initiativeValue = Number.isFinite(Number(initiative)) ? Number(initiative) : participant.initiative;
    const nextParticipant = placement === 'init' ? { ...participant, initiative: initiativeValue, actionSlots: [{ id: 'slot-1', initiative: initiativeValue, order: 0 }] } : participant;
    actions.addParticipant(nextParticipant, placement === 'reserve' ? 'reserve' : 'init');
    setEditingId(nextParticipant.id);
    setSelectedId(null);
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

  return {
    selected,
    editing,
    statusTarget,
    joinTarget,
    isInInit,
    openCharacter: setSelectedId,
    closeCharacter: () => setSelectedId(null),
    editCharacter: setEditingId,
    closeEditor: () => setEditingId(null),
    requestStatus: setStatusTargetId,
    cancelStatus: () => setStatusTargetId(null),
    requestJoin: setJoinTargetId,
    cancelJoin: () => setJoinTargetId(null),
    closeCharacterPanels,
    updateCharacter,
    updateCharacterTracker,
    deleteCharacterTracker,
    removeCharacterStatus,
    addCharacter,
    saveStatus,
    joinInit,
    leaveInit,
    saveCharacter,
    deleteCharacter,
  };
}
