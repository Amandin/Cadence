import { useState } from 'react';
import { classerAjoutDynamique } from '../actions/dynamicInitiative.js';
import { phaseActionModes, temporalityModes } from '../constants.js';
import { createStatus, createSurprisedStatus } from '../domain/statuses.js';
import { t } from '../i18n/index.js';
import { clone, uid } from '../logic.js';
import { instantiateTrackerCopy, numberedCopyName } from '../templates.js';

export function nomCopieUniquePersonnage(personnages = [], nom = '') {
  return numberedCopyName(personnages.map((participant) => participant.name), nom, t('templates.fallback.character'));
}

function dupliquerStatut(status) {
  return { ...clone(status), id: uid('s') };
}

function dupliquerCreneauxAction(slots = []) {
  return (Array.isArray(slots) ? slots : []).map((slot, index) => ({ ...clone(slot), id: uid('slot'), order: index }));
}

export function dupliquerPersonnageScene(participant, nom) {
  return {
    ...clone(participant),
    id: uid('p'),
    name: nom,
    actionSlots: dupliquerCreneauxAction(participant.actionSlots),
    statuses: (participant.statuses || []).map(dupliquerStatut),
    trackers: (participant.trackers || []).map(instantiateTrackerCopy).filter(Boolean),
    _activationAutomationsDone: false,
  };
}

/**
 * Centralizes every mutation that must work both for initiative participants
 * and reserve characters. App.jsx can then stay focused on screen layout.
 */
export function useCharacterInteractions(scene, actions) {
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [joinTargetId, setJoinTargetId] = useState(null);
  const [lateInitiativeAddition, setLateInitiativeAddition] = useState(null);
  const [initiativeEditId, setInitiativeEditId] = useState(null);
  const [initiativeEditOrigin, setInitiativeEditOrigin] = useState(null);

  const allCharacters = [...scene.participants, ...(scene.reserve || [])];
  const selected = allCharacters.find((participant) => participant.id === selectedId);
  const editing = allCharacters.find((participant) => participant.id === editingId);
  const statusTargetParticipant = allCharacters.find((participant) => participant.id === statusTarget?.participantId);
  const statusEdited = statusTargetParticipant?.statuses?.find((status) => status.id === statusTarget?.statusId) || null;
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

  const updateCharacterStatus = (participantId, statusId, data) => {
    const status = createStatus(data);
    if (!status) return;
    updateCharacter(participantId, (participant) => ({
      ...participant,
      statuses: (participant.statuses || []).map((current) => {
        if (current.id !== statusId) return current;
        const sameDuration = current.duration === status.duration;
        return {
          ...status,
          id: statusId,
          remaining: sameDuration ? current.remaining : status.remaining,
          expired: sameDuration ? current.expired : false,
          skipNextActivation: sameDuration ? current.skipNextActivation : status.skipNextActivation,
          activationSkipConsumed: sameDuration ? current.activationSkipConsumed : status.activationSkipConsumed,
          skipNextAdvance: sameDuration ? current.skipNextAdvance : status.skipNextAdvance,
          advanceSkipConsumed: sameDuration ? current.advanceSkipConsumed : status.advanceSkipConsumed,
        };
      }),
    }));
  };

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

  const duplicateCharacter = (participantId) => {
    const source = allCharacters.find((participant) => participant.id === participantId);
    if (!source) return null;
    const placement = isInInit(participantId) ? 'init' : 'reserve';
    const duplicate = dupliquerPersonnageScene(source, nomCopieUniquePersonnage(allCharacters, source.name));
    const dynamicAdditionKind = placement === 'init' ? classerAjoutDynamique(scene, duplicate) : null;
    actions.addParticipant(duplicate, placement);
    if (dynamicAdditionKind) setLateInitiativeAddition({ participantId: duplicate.id, editAfterAdd: false, kind: dynamicAdditionKind });
    setSelectedId(null);
    return duplicate;
  };

  const saveStatus = (data) => {
    if (!statusTarget?.participantId) return;
    if (statusTarget.statusId) updateCharacterStatus(statusTarget.participantId, statusTarget.statusId, data);
    else addCharacterStatus(statusTarget.participantId, data);
    setStatusTarget(null);
  };

  const requestStatus = (participantId, statusId = '') => setStatusTarget(participantId ? { participantId, statusId } : null);

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
    statusTarget: statusTargetParticipant,
    statusEdited,
    joinTarget,
    lateInitiativeParticipant,
    lateInitiativeAdditionKind: lateInitiativeAddition?.kind || '',
    initiativeEditParticipant,
    isInInit,
    openCharacter: setSelectedId,
    closeCharacter: () => setSelectedId(null),
    editCharacter: setEditingId,
    closeEditor: () => setEditingId(null),
    requestStatus,
    cancelStatus: () => setStatusTarget(null),
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
    duplicateCharacter,
    saveStatus,
    joinInit,
    leaveInit,
    saveCharacter,
    deleteCharacter,
  };
}
