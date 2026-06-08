import { useState } from 'react';
import { classerAjoutDynamique } from '../actions/dynamicInitiative.js';
import { phaseActionModes, temporalityModes } from '../constants.js';
import { createStatus, createSurprisedStatus } from '../domain/statuses.js';

/**
 * Centralizes every mutation that must work both for initiative participants
 * and reserve characters. App.jsx can then stay focused on screen layout.
 */
export function useCharacterInteractions(scene, actions) {
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusTargetId, setStatusTargetId] = useState(null);
  const [joinTargetId, setJoinTargetId] = useState(null);
  const [lateInitiativeAddition, setLateInitiativeAddition] = useState(null);
  const [initiativeEditId, setInitiativeEditId] = useState(null);
  const [initiativeEditOrigin, setInitiativeEditOrigin] = useState(null);

  const allCharacters = [...scene.participants, ...(scene.reserve || [])];
  const selected = allCharacters.find((participant) => participant.id === selectedId);
  const editing = allCharacters.find((participant) => participant.id === editingId);
  const statusTarget = allCharacters.find((participant) => participant.id === statusTargetId);
  const joinTarget = (scene.reserve || []).find((participant) => participant.id === joinTargetId);
  const lateInitiativeParticipant = allCharacters.find((participant) => participant.id === lateInitiativeAddition?.participantId);
  const initiativeEditParticipant = allCharacters.find((participant) => participant.id === initiativeEditId);

  const closeCharacterPanels = () => {
    setSelectedId(null);
    setEditingId(null);
    setInitiativeEditId(null);
    setInitiativeEditOrigin(null);
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

  const addSurprisedStatus = (participantId) => {
    const status = createSurprisedStatus(scene.surpriseImpact, { advanceOn: scene.surpriseAdvanceOn });
    updateCharacter(participantId, (participant) => ({ ...participant, statuses: [...(participant.statuses || []), status] }));
  };

  const addCharacter = (participant, { placement = 'init', initiative = 1, editAfterAdd = true } = {}) => {
    if (!participant) return;
    const cleanInitiative = String(initiative ?? '').trim();
    const initiativeValue = cleanInitiative ? (Number.isFinite(Number(cleanInitiative)) ? Number(cleanInitiative) : cleanInitiative) : participant.initiative;
    const phasePatch = scene.temporalite === temporalityModes.PHASES && scene.phaseActionMode === phaseActionModes.CHECKED && !Array.isArray(participant.phaseActions) ? { phaseActions: ['1'] } : {};
    const nextParticipant = placement === 'init' ? { ...participant, ...phasePatch, initiative: initiativeValue, actionSlots: [{ id: 'slot-1', initiative: initiativeValue, order: 0 }] } : { ...participant, ...phasePatch };
    const dynamicAdditionKind = placement === 'init' ? classerAjoutDynamique(scene, nextParticipant) : null;
    actions.addParticipant(nextParticipant, placement === 'reserve' ? 'reserve' : 'init');
    if (dynamicAdditionKind) setLateInitiativeAddition({ participantId: nextParticipant.id, editAfterAdd, kind: dynamicAdditionKind });
    else if (editAfterAdd) setEditingId(nextParticipant.id);
    setSelectedId(null);
    return nextParticipant;
  };

  const saveStatus = (data) => {
    if (!statusTargetId) return;
    addCharacterStatus(statusTargetId, data);
    setStatusTargetId(null);
  };

  const joinCharacter = (participantId, initiative) => {
    if (!participantId) return;
    const participant = (scene.reserve || []).find((item) => item.id === participantId);
    const dynamicAdditionKind = classerAjoutDynamique(scene, participant, initiative);
    actions.joinInit(participantId, initiative);
    if (dynamicAdditionKind) setLateInitiativeAddition({ participantId, editAfterAdd: false, kind: dynamicAdditionKind });
    setJoinTargetId(null);
  };

  const requestJoin = (participantId) => {
    const participant = (scene.reserve || []).find((item) => item.id === participantId);
    if (scene.temporalite === 'souple' && scene.flexibleUseInitiative === false) {
      joinCharacter(participantId, participant?.initiative ?? 0);
      return;
    }
    setJoinTargetId(participantId);
  };

  const joinInit = (initiative) => joinCharacter(joinTargetId, initiative);

  const confirmLateInitiativeAddition = () => {
    const pending = lateInitiativeAddition;
    setLateInitiativeAddition(null);
    if (pending?.editAfterAdd) setEditingId(pending.participantId);
  };

  const surpriseLateInitiativeAddition = () => {
    const pending = lateInitiativeAddition;
    setLateInitiativeAddition(null);
    if (pending?.participantId) addSurprisedStatus(pending.participantId);
    if (pending?.editAfterAdd) setEditingId(pending.participantId);
  };

  const editLateInitiativeAddition = () => {
    const pending = lateInitiativeAddition;
    setLateInitiativeAddition(null);
    if (pending?.participantId) {
      setInitiativeEditId(pending.participantId);
      setInitiativeEditOrigin(pending);
    }
  };

  const activateLateInitiativeAddition = () => {
    const pending = lateInitiativeAddition;
    setLateInitiativeAddition(null);
    if (pending?.participantId) actions.activateParticipantNow(pending.participantId);
  };

  const saveInitiativeEdit = (initiative, phaseActions) => {
    if (!initiativeEditId) return;
    const participant = allCharacters.find((item) => item.id === initiativeEditId);
    const participantReclasse = participant && Array.isArray(phaseActions) ? { ...participant, phaseActions } : participant;
    const nextKind = participantReclasse ? classerAjoutDynamique(scene, participantReclasse, initiative) : null;
    const origin = initiativeEditOrigin;
    actions.adjustParticipantInitiative(initiativeEditId, initiative, '');
    if (Array.isArray(phaseActions)) updateCharacter(initiativeEditId, (item) => ({ ...item, phaseActions }));
    setInitiativeEditId(null);
    setInitiativeEditOrigin(null);
    if (nextKind) setLateInitiativeAddition({ ...(origin || {}), participantId: initiativeEditId, kind: nextKind });
    else if (origin?.editAfterAdd) setEditingId(initiativeEditId);
  };

  const cancelInitiativeEdit = () => {
    setInitiativeEditId(null);
    setInitiativeEditOrigin(null);
    if (initiativeEditOrigin) setLateInitiativeAddition(initiativeEditOrigin);
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
    lateInitiativeParticipant,
    lateInitiativeAdditionKind: lateInitiativeAddition?.kind || '',
    initiativeEditParticipant,
    isInInit,
    openCharacter: setSelectedId,
    closeCharacter: () => setSelectedId(null),
    editCharacter: setEditingId,
    closeEditor: () => setEditingId(null),
    requestStatus: setStatusTargetId,
    cancelStatus: () => setStatusTargetId(null),
    requestJoin,
    cancelJoin: () => setJoinTargetId(null),
    confirmLateInitiativeAddition,
    editLateInitiativeAddition,
    activateLateInitiativeAddition,
    surpriseLateInitiativeAddition,
    cancelInitiativeEdit,
    saveInitiativeEdit,
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
