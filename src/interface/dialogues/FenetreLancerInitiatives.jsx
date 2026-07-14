import { useEffect, useMemo, useState } from 'react';
import { participantKinds } from '../../constants.js';
import { normaliserCreneauxAction } from '../../domain/initiative.js';
import { initiativeLabelFromCardDraw, initiativeTextOrderEnabled, initiativeToNumber, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { IconeJetDes } from '../icones/IconeJetDes.jsx';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { prepareCombinedDefinition } from '../../random-system/combinations.js';
import { activeDefinitions } from '../../random-system/definitionAccess.js';
import { randomParameterTypes, randomSourceKinds } from '../../random-system/engine.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';
import { resolveParticipantBehavior } from '../../domain/participantTypes.js';

function initiativeVide(participant) {
  const valeurs = Array.isArray(participant.actionSlots) && participant.actionSlots.length
    ? participant.actionSlots.map((slot) => slot?.initiative ?? participant.initiative)
    : [participant.initiative];
  return valeurs.every((valeur) => String(valeur ?? '').trim() === '');
}
function estPersonnage(participant) { return resolveParticipantBehavior(participant.kind).initiativeEntry !== 'environment'; }
function environnementSansInitiative(participant) { return resolveParticipantBehavior(participant.kind).initiativeEntry === 'environment' && initiativeVide(participant); }
function filtrerParticipants(participants, inclureEnvironnements) { return inclureEnvironnements ? participants : participants.filter((participant) => estPersonnage(participant) || environnementSansInitiative(participant)); }
function champRempli(valeur) { if (Array.isArray(valeur)) return valeur.some(champRempli); return String(valeur ?? '').trim() !== ''; }
const initiativeEntrySortModes = { TYPE: 'type', NAME: 'name', INITIATIVE: 'initiative' };
const initiativeEntrySwitchesKey = 'cadence:initiative-entry-switches:v1';
const defaultInitiativeEntrySwitches = { inclureEnvironnements: false, modifierDepartage: false, modifierBonusInitiative: false, inclureReserve: false };
function lireOptionsSaisieInitiative() {
  if (typeof localStorage === 'undefined') return defaultInitiativeEntrySwitches;
  try {
    const source = JSON.parse(localStorage.getItem(initiativeEntrySwitchesKey) || '{}');
    return { ...defaultInitiativeEntrySwitches, ...source };
  } catch {
    return defaultInitiativeEntrySwitches;
  }
}
function enregistrerOptionsSaisieInitiative(options) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(initiativeEntrySwitchesKey, JSON.stringify(options)); } catch { /* Preferences are optional. */ }
}
function departageManquant(participant) { return String(participant?.departage ?? '').trim() === ''; }
function bonusInitiativeManquant(participant) {
  const source = participant?.initiativeBonus;
  if (source == null || String(source).trim() === '') return true;
  const nombre = Number(source);
  return !Number.isFinite(nombre) || nombre === 0;
}
function bonusInitiative(participant, bonusInitiatives = null) { const source = bonusInitiatives && participant?.id in bonusInitiatives ? bonusInitiatives[participant.id] : participant?.initiativeBonus; const bonus = Number(source ?? 0); return Number.isFinite(bonus) ? bonus : 0; }
function bonusInitiativeTexte(participant) { return bonusInitiativeManquant(participant) ? '' : String(bonusInitiative(participant)); }
function valeurSignee(valeur) { const nombre = Number(valeur); return Number.isFinite(nombre) && nombre > 0 ? `+${nombre}` : String(valeur ?? ''); }
function valeurAvecBonus(valeur, participant, textConfig, bonusInitiatives = null, actif = true) {
  if (!actif || initiativeTextOrderEnabled(textConfig)) return valeur;
  const texte = String(valeur ?? '').trim();
  if (!texte) return valeur;
  const nombre = Number(texte);
  if (!Number.isFinite(nombre)) return valeur;
  const bonus = bonusInitiative(participant, bonusInitiatives);
  return bonus ? String(nombre + bonus) : valeur;
}
function valeurSansBonus(valeur, participant, textConfig, actif = true) {
  if (!actif || initiativeTextOrderEnabled(textConfig)) return valeur;
  const nombre = Number(valeur);
  const bonus = bonusInitiative(participant);
  return bonus && Number.isFinite(nombre) ? nombre - bonus : valeur;
}
function actionsMultiplesAutorisees(multipleActionSlots, participant) { return typeof multipleActionSlots === 'function' ? multipleActionSlots(participant) : multipleActionSlots; }
function champsParticipant(participant, valeurs, multipleActionSlots = true, textConfig = {}) { const courant = valeurs[participant.id]; if (Array.isArray(courant) && courant.length) return actionsMultiplesAutorisees(multipleActionSlots, participant) ? courant : courant.slice(0, 1); return normaliserCreneauxAction(participant, { multipleActionSlots, initiativeTextOrder: textConfig }).map(() => ''); }
function comparerNomsParticipants(a, b) { return (a?.name || '').localeCompare(b?.name || '', 'fr', { sensitivity: 'base' }); }
function valeurTriInitiative(participant, valeurs, multipleActionSlots, textConfig, bonusInitiatives, initiativeBonusEnabled = true) {
  const champs = champsParticipant(participant, valeurs, multipleActionSlots, textConfig);
  const saisie = champs.find((valeur) => String(valeur ?? '').trim() !== '');
  const fallback = normaliserCreneauxAction(participant, { multipleActionSlots, initiativeTextOrder: textConfig })[0]?.initiative ?? participant.initiative ?? 0;
  const valeur = saisie == null ? fallback : valeurAvecBonus(saisie, participant, textConfig, bonusInitiatives, initiativeBonusEnabled);
  return initiativeToNumber(valeur, textConfig, Number.NEGATIVE_INFINITY);
}
function participantsParType(participants, inclureEnvironnements, categoryOrder = []) { const visibles = filtrerParticipants(participants, inclureEnvironnements); const types = [...new Set([...categoryOrder, ...participantKinds, ...visibles.map((participant) => participant.kind)].filter(Boolean))]; return types.map((type) => ({ id: type, label: type, participants: visibles.filter((participant) => participant.kind === type) })).filter((groupe) => groupe.participants.length > 0); }
function groupesParticipants(participants, inclureEnvironnements, categoryOrder, triSaisie, valeurs, multipleActionSlots, textConfig, bonusInitiatives, initiativeBonusEnabled = true) {
  const visibles = filtrerParticipants(participants, inclureEnvironnements);
  if (triSaisie === initiativeEntrySortModes.NAME) return [{ id: 'name', label: t('initiative.entry.sort.name'), participants: [...visibles].sort(comparerNomsParticipants) }].filter((groupe) => groupe.participants.length > 0);
  if (triSaisie === initiativeEntrySortModes.INITIATIVE) return [{ id: 'initiative', label: t('initiative.entry.sort.initiative'), participants: [...visibles].sort((a, b) => valeurTriInitiative(b, valeurs, multipleActionSlots, textConfig, bonusInitiatives, initiativeBonusEnabled) - valeurTriInitiative(a, valeurs, multipleActionSlots, textConfig, bonusInitiatives, initiativeBonusEnabled) || comparerNomsParticipants(a, b)) }].filter((groupe) => groupe.participants.length > 0);
  return participantsParType(participants, inclureEnvironnements, categoryOrder);
}
export function ordreParticipantsAffiches(participants, options = {}) {
  return groupesParticipants(
    participants,
    options.inclureEnvironnements ?? false,
    options.categoryOrder || [],
    options.triSaisie || initiativeEntrySortModes.TYPE,
    options.valeurs || {},
    options.multipleActionSlots ?? true,
    options.textConfig || {},
    options.bonusInitiatives || {},
    options.initiativeBonusEnabled ?? true,
  ).flatMap((groupe) => groupe.participants);
}
export function affectationsCartesInitiative(participants, drawResult, textConfig) {
  const cards = Array.isArray(drawResult?.cards) ? drawResult.cards : [];
  return participants.flatMap((participant, index) => {
    const value = initiativeLabelFromCardDraw({ ...drawResult, cards: cards[index] ? [cards[index]] : [] }, textConfig);
    return value ? [{ participant, value }] : [];
  });
}
function valeursVides(participants, multipleActionSlots = true, textConfig = {}) { return Object.fromEntries(participants.map((participant) => [participant.id, normaliserCreneauxAction(participant, { multipleActionSlots, initiativeTextOrder: textConfig }).map(() => '')])); }
function valeursInitiales(participants, reserve, multipleActionSlots = true, prefillExisting = false, textConfig = {}, initiativeBonusEnabled = true) { return { ...valeursVides(reserve, multipleActionSlots, textConfig), ...(prefillExisting ? Object.fromEntries(participants.map((participant) => [participant.id, participant.initiativePending ? '' : normaliserCreneauxAction(participant, { multipleActionSlots, initiativeTextOrder: textConfig }).map((slot) => String(valeurSansBonus(slot.initiative ?? participant.initiative ?? '', participant, textConfig, initiativeBonusEnabled)))])) : valeursVides(participants, multipleActionSlots, textConfig)) }; }
function valeursRenseignees(participants, valeurs, multipleActionSlots = true, textConfig = {}, bonusInitiatives = {}, initiativeBonusEnabled = true, bonusDejaInclus = {}) { return Object.fromEntries(participants.filter((participant) => champRempli(valeurs[participant.id])).map((participant) => [participant.id, champsParticipant(participant, valeurs, multipleActionSlots, textConfig).map((valeur, index) => ({ valeur, index })).filter(({ valeur }) => champRempli(valeur)).map(({ valeur, index }) => bonusDejaInclus[participant.id]?.[index] ? valeur : valeurAvecBonus(valeur, participant, textConfig, bonusInitiatives, initiativeBonusEnabled))])); }
function departagesInitiaux(participants) { return Object.fromEntries(participants.map((participant) => [participant.id, String(participant.departage ?? '')])); }
function departagesRenseignes(participants, departages, actif = false) { return Object.fromEntries(participants.flatMap((participant) => { const valeur = departages[participant.id] ?? ''; return actif || (departageManquant(participant) && champRempli(valeur)) ? [[participant.id, valeur]] : []; })); }
function bonusInitiaux(participants) { return Object.fromEntries(participants.map((participant) => [participant.id, bonusInitiativeTexte(participant)])); }
function bonusRenseignes(participants, bonusInitiatives, actif = false) { return Object.fromEntries(participants.flatMap((participant) => { const valeur = bonusInitiatives[participant.id] ?? ''; return actif || (bonusInitiativeManquant(participant) && champRempli(valeur)) ? [[participant.id, bonusInitiative(participant, bonusInitiatives)]] : []; })); }

function SwitchSaisieInitiative({ label, checked, onChange }) {
  return <label className={`initiative-entry-switch ${checked ? 'active' : ''}`}><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function GroupeSwitchesSaisieInitiative({ label, children }) {
  return <div className="initiative-entry-switch-group"><span className="initiative-entry-switch-group-label">{label}</span><div className="initiative-entry-switch-group-items">{children}</div></div>;
}

function LibelleBonusInitiative() {
  return t('initiative.entry.bonusLabel');
}

function initiativeBonusParameter(parameter = {}) {
  const signature = `${parameter.id || ''} ${parameter.label || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return parameter.type !== randomParameterTypes.SOURCE
    && parameter.type !== randomParameterTypes.TEXT
    && (signature.includes('modifier') || signature.includes('modificateur') || signature.includes('bonus'));
}

function rollDefaultsWithInitiativeBonus(definition = {}, participant, bonusInitiatives = {}) {
  const bonus = bonusInitiative(participant, bonusInitiatives);
  let bonusInjected = false;
  const parameters = Object.fromEntries((definition.parameters || []).map((parameter) => {
    if (initiativeBonusParameter(parameter)) {
      bonusInjected = true;
      return [parameter.id, bonus];
    }
    return [parameter.id, parameter.defaultValue];
  }));
  const options = Object.fromEntries((definition.options || []).map((option) => [option.id, option.defaultValue]));
  return { parameters, options, bonus, bonusInjected };
}

function defaultRollOptions(definition = {}) {
  return Object.fromEntries((definition.options || []).map((option) => [option.id, option.defaultValue]));
}

function InitiativeRollButton({ label, card = false, disabled = false, onClick }) {
  return <button className="initiative-dice-roll-btn" type="button" disabled={disabled} onClick={onClick} aria-label={label} title={label}>{card ? <IconeCadence name="cardBack" /> : <IconeJetDes />}</button>;
}

function BoutonChoixInitiative({ titre, detail, onClick, disabled = false, variant = 'standard' }) {
  return <button className={`initiative-choice-action ${variant}`} onClick={onClick} disabled={disabled}><strong>{titre}</strong><small>{detail}</small></button>;
}

function SectionSaisieInitiative({ titre, participants, inclureEnvironnements, categoryOrder, triSaisie, valeurs, changerValeur, ajouterAction, retirerAction, textConfig, initiativeEnabled, multipleActionSlots, surpriseSelectionEnabled, surprisedIds, basculerSurpris, initiativeBonusEnabled = true, modifierBonusInitiative, bonusInitiatives, changerBonus, initiativeRollAvailable, initiativeRollIsCard, onRollParticipant, modifierDepartage, tiebreakerVisible, tiebreakerLabel, departages, changerDepartage }) {
  const groupes = groupesParticipants(participants, inclureEnvironnements, categoryOrder, triSaisie, valeurs, multipleActionSlots, textConfig, bonusInitiatives, initiativeBonusEnabled);
  const bonusPertinent = initiativeEnabled && initiativeBonusEnabled && !initiativeTextOrderEnabled(textConfig);
  const departagePertinent = initiativeEnabled && tiebreakerVisible;
  if (groupes.length === 0) return null;
  return <section className="initiative-entry-zone">
    {titre && <h3>{titre}</h3>}
    <div className="initiative-entry-groups">
      {groupes.map((groupe) => <section className="initiative-roll-group" key={`${titre}-${groupe.id}`}>
        <div className="initiative-roll-group-head"><h4>{groupe.label}</h4></div>
        <div className="initiative-roll-list">
          {groupe.participants.map((participant) => {
            const champs = champsParticipant(participant, valeurs, multipleActionSlots, textConfig);
            const bonusEditable = bonusPertinent && (modifierBonusInitiative || bonusInitiativeManquant(participant));
            const departageEditable = departagePertinent && (modifierDepartage || departageManquant(participant));
            const valeurBonus = bonusInitiative(participant, bonusInitiatives);
            const departageTexte = String(departages[participant.id] ?? participant.departage ?? '').trim();
            const bonusDiscret = bonusPertinent && !bonusEditable;
            const departageDiscret = departagePertinent && !departageEditable;
            const afficherBonusDiscret = bonusDiscret && valeurBonus !== 0;
            const afficherDepartageDiscret = departageDiscret && departageTexte !== '';
            const afficherAjoutAction = initiativeEnabled && actionsMultiplesAutorisees(multipleActionSlots, participant);
            const afficherMeta = surpriseSelectionEnabled || bonusEditable || departageEditable || afficherBonusDiscret || afficherDepartageDiscret;
            return <div className={`initiative-roll-row multi-roll-row ${surpriseSelectionEnabled ? 'has-surprise' : ''} ${(departageEditable || afficherDepartageDiscret) ? 'has-tiebreaker' : ''}`} key={participant.id}>
              <div className="initiative-roll-identity"><span className="type-chip">{participant.kind}</span><strong>{participant.name}</strong>{initiativeEnabled && initiativeRollAvailable && <InitiativeRollButton card={initiativeRollIsCard} label={t(initiativeRollIsCard ? 'initiative.entry.drawOne' : 'initiative.entry.rollOne', { name: participant.name })} onClick={() => onRollParticipant(participant)} />}</div>
              {afficherMeta && <div className={`initiative-meta-row ${surpriseSelectionEnabled ? 'has-surprise' : ''} ${(bonusEditable || afficherBonusDiscret) ? 'has-bonus' : ''} ${(departageEditable || afficherDepartageDiscret) ? 'has-tiebreaker' : ''}`}>
                {surpriseSelectionEnabled && <label className={`surprise-inline-toggle ${surprisedIds.has(participant.id) ? 'active' : ''}`}><input type="checkbox" checked={surprisedIds.has(participant.id)} onChange={() => basculerSurpris(participant.id)} /><span>{t('initiative.entry.surprised')}</span></label>}
                {bonusEditable && <label className="initiative-bonus-inline-field"><small><LibelleBonusInitiative /></small><input type="number" inputMode="numeric" value={bonusInitiatives[participant.id] ?? ''} onChange={(event) => changerBonus(participant.id, event.target.value)} /></label>}
                {afficherBonusDiscret && <span className="initiative-meta-pill initiative-bonus-pill"><LibelleBonusInitiative /> {valeurSignee(valeurBonus)}</span>}
                {departageEditable && <label className="initiative-tiebreaker-field"><small>{tiebreakerLabel || t('initiative.tiebreaker')}</small><input type="number" inputMode="numeric" value={departages[participant.id] ?? ''} onChange={(event) => changerDepartage(participant.id, event.target.value)} /></label>}
                {afficherDepartageDiscret && <span className="initiative-meta-pill">{tiebreakerLabel || t('initiative.tiebreaker')} {valeurSignee(departageTexte)}</span>}
              </div>}
              {initiativeEnabled && <div className="initiative-values-row">
                <div className="initiative-roll-slots">
                  {champs.map((valeur, index) => {
                    const retraitPossible = champs.length > 1 && index === champs.length - 1;
                    return <label className={`initiative-roll-slot ${retraitPossible ? 'has-remove' : ''}`} key={index}>
                    <small>{t('initiative.entry.shortSlotLabel', { index: index + 1 })}</small>
                    <ChampInitiative valeur={valeur} textConfig={textConfig} onChange={(next) => changerValeur(participant.id, index, next)} />
                    {retraitPossible && <button className="small-btn subtle-danger" onClick={() => retirerAction(participant.id, index)} type="button"><IconeCadence name="remove" /></button>}
                  </label>;
                  })}
                  {afficherAjoutAction && <button className="small-btn add-roll-slot" onClick={() => ajouterAction(participant.id)} type="button">{t('sheet.actions.add')}</button>}
                </div>
              </div>}
            </div>;
          })}
        </div>
      </section>)}
    </div>
  </section>;
}

export function FenetreLancerInitiatives({ participants = [], reserve = [], initiativeTextOrder, initiativeEnabled = true, initiativeBonusEnabled = true, initiativeBonusRollDefinitionId = '', randomSystem = null, multipleActionSlots = true, categoryOrder = [], prefillExisting = false, surpriseSelectionEnabled = false, tiebreakerVisible = false, tiebreakerLabel = t('initiative.tiebreaker'), onFermer, onValider, onPasserHorsInitiative }) {
  const textConfig = useMemo(() => normalizeInitiativeTextOrder(initiativeTextOrder), [initiativeTextOrder]);
  const [optionsSaisie, setOptionsSaisie] = useState(lireOptionsSaisieInitiative);
  const [triSaisie, setTriSaisie] = useState(initiativeEntrySortModes.TYPE);
  const { inclureEnvironnements, modifierDepartage, modifierBonusInitiative, inclureReserve } = optionsSaisie;
  useEffect(() => enregistrerOptionsSaisieInitiative(optionsSaisie), [optionsSaisie]);
  const changerOptionSaisie = (clef, valeur) => setOptionsSaisie((courant) => ({ ...courant, [clef]: valeur }));
  const candidats = useMemo(() => [...participants, ...reserve], [participants, reserve]);
  const candidatsAffiches = useMemo(() => filtrerParticipants(candidats, inclureEnvironnements), [candidats, inclureEnvironnements]);
  const [idsEnAttente, setIdsEnAttente] = useState(() => candidats.map((participant) => participant.id));
  const idsAffiches = useMemo(() => new Set(candidatsAffiches.map((participant) => participant.id)), [candidatsAffiches]);
  const participantsEnAttente = participants.filter((participant) => idsEnAttente.includes(participant.id) && idsAffiches.has(participant.id));
  const reserveEnAttente = reserve.filter((participant) => idsEnAttente.includes(participant.id) && idsAffiches.has(participant.id));
  const participantsSection = inclureReserve ? [...participantsEnAttente, ...reserveEnAttente] : participantsEnAttente;
  const reserveEnBas = inclureReserve ? [] : reserveEnAttente;
  const [valeurs, setValeurs] = useState(() => valeursInitiales(participants, reserve, multipleActionSlots, prefillExisting, textConfig, initiativeBonusEnabled));
  const [departages, setDepartages] = useState(() => departagesInitiaux(candidats));
  const [bonusInitiatives, setBonusInitiatives] = useState(() => bonusInitiaux(candidats));
  const [bonusDejaInclus, setBonusDejaInclus] = useState({});
  const [surprisedIds, setSurprisedIds] = useState(() => new Set());
  const [rollError, setRollError] = useState('');
  const participantsActifsSansValeur = initiativeEnabled ? participantsEnAttente.filter((participant) => !champRempli(valeurs[participant.id])) : [];
  const participantsActifsAvecValeur = initiativeEnabled ? participantsEnAttente.filter((participant) => champRempli(valeurs[participant.id])) : participantsEnAttente;
  const reservistesAvecValeur = initiativeEnabled ? reserveEnAttente.filter((participant) => champRempli(valeurs[participant.id])) : [];
  const aValider = [...participantsActifsAvecValeur, ...reservistesAvecValeur];
  const saisiePartielle = participantsActifsAvecValeur.length > 0 && participantsActifsSansValeur.length > 0;
  const changerValeur = (id, index, valeur) => {
    setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; return { ...courant, [id]: champs.map((champ, position) => position === index ? valeur : champ) }; });
    setBonusDejaInclus((courant) => ({ ...courant, [id]: (courant[id] || []).map((item, position) => position === index ? false : item) }));
  };
  const changerDepartage = (id, valeur) => setDepartages((courant) => ({ ...courant, [id]: valeur }));
  const changerBonus = (id, valeur) => setBonusInitiatives((courant) => ({ ...courant, [id]: valeur }));
  const bonusSwitchVisible = initiativeBonusEnabled && !initiativeTextOrderEnabled(textConfig);
  const initiativeRollDefinitions = useMemo(() => activeDefinitions(randomSystem?.state?.definitions || []), [randomSystem?.state?.definitions]);
  const initiativeRollDefinition = bonusSwitchVisible
    ? initiativeRollDefinitions.find((definition) => definition.id === initiativeBonusRollDefinitionId)
    : null;
  const initiativeCardSource = useMemo(() => {
    if (!initiativeTextOrderEnabled(textConfig) || !textConfig.cardSourceId) return null;
    return (randomSystem?.state?.sources || []).find((source) => (
      source.id === textConfig.cardSourceId && source.kind === randomSourceKinds.CARDS
    )) || null;
  }, [randomSystem?.state?.sources, textConfig]);
  const initiativeRollIsCard = !!initiativeCardSource;
  const initiativeRollAvailable = !!initiativeRollDefinition || initiativeRollIsCard;
  const appliquerValeurLancee = (participant, valeur) => setValeurs((courant) => {
    const champs = Array.isArray(courant[participant.id]) && courant[participant.id].length ? courant[participant.id] : [''];
    return { ...courant, [participant.id]: champs.map((champ, index) => index === 0 ? valeur : champ) };
  });
  const marquerBonusInclus = (participantId, index = 0) => setBonusDejaInclus((courant) => {
    const flags = [...(courant[participantId] || [])];
    flags[index] = true;
    return { ...courant, [participantId]: flags };
  });
  const lancerInitiativeParticipant = (participant) => {
    try {
      if (initiativeCardSource) {
        if (!randomSystem?.actions?.drawCards) throw new Error(t('initiative.entry.cardDrawUnavailable'));
        const result = randomSystem.actions.drawCards(initiativeCardSource.id, 1);
        const value = initiativeLabelFromCardDraw(result, textConfig);
        if (!value) throw new Error(t('initiative.entry.cardDrawUnavailable'));
        appliquerValeurLancee(participant, value);
        setRollError('');
        return true;
      }
      if (!initiativeRollDefinition || !randomSystem?.actions?.runDefinition) return false;
      const baseOptions = defaultRollOptions(initiativeRollDefinition);
      const prepared = prepareCombinedDefinition(initiativeRollDefinition, initiativeRollDefinitions, baseOptions);
      const { parameters, options, bonus, bonusInjected } = rollDefaultsWithInitiativeBonus(prepared.definition, participant, bonusInitiatives);
      const result = randomSystem.actions.runDefinition(initiativeRollDefinition.id, parameters, options);
      const raw = Number(result?.primaryAggregate?.value);
      if (!Number.isFinite(raw)) throw new Error(t('initiative.entry.rollUnavailable'));
      const value = bonusInjected ? raw : raw + bonus;
      appliquerValeurLancee(participant, String(value));
      marquerBonusInclus(participant.id, 0);
      setRollError('');
      return true;
    } catch (error) {
      setRollError(error?.message || t('initiative.entry.rollUnavailable'));
      return false;
    }
  };
  const lancerInitiativeGroupe = (participantsGroupe) => {
    for (const participant of participantsGroupe) {
      if (!lancerInitiativeParticipant(participant)) break;
    }
  };
  const ajouterAction = (id) => setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; return { ...courant, [id]: [...champs, ''] }; });
  const retirerAction = (id, index) => setValeurs((courant) => { const champs = Array.isArray(courant[id]) && courant[id].length ? courant[id] : ['']; const suivants = champs.filter((_, position) => position !== index); return { ...courant, [id]: suivants.length ? suivants : [''] }; });
  const basculerSurpris = (id) => setSurprisedIds((courant) => { const suivants = new Set(courant); if (suivants.has(id)) suivants.delete(id); else suivants.add(id); return suivants; });
  const vider = () => {
    setValeurs((courant) => ({ ...courant, ...valeursVides([...participantsEnAttente, ...reserveEnAttente], multipleActionSlots, textConfig) }));
    setBonusDejaInclus({});
  };
  const validerCourants = () => onValider(valeursRenseignees(aValider, valeurs, multipleActionSlots, textConfig, bonusInitiatives, initiativeBonusEnabled, bonusDejaInclus), [...surprisedIds], departagesRenseignes(aValider, departages, modifierDepartage), bonusRenseignes(aValider, bonusInitiatives, initiativeBonusEnabled && modifierBonusInitiative));
  const appliquer = () => { if (aValider.length === 0) return; validerCourants(); setIdsEnAttente(participantsActifsSansValeur.map((participant) => participant.id)); setValeurs((courant) => ({ ...courant, ...valeursVides(aValider, multipleActionSlots, textConfig) })); if (participantsActifsSansValeur.length === 0) onFermer(); };
  const ajouterEtConserverAutresInitiatives = () => { if (aValider.length === 0) return; validerCourants(); onFermer(); };
  const passerRestantsHorsInitiative = () => { onPasserHorsInitiative(participantsActifsSansValeur.map((participant) => participant.id)); onFermer(); };
  const appliquerEtPasserRestantsHorsInitiative = () => { if (aValider.length > 0) validerCourants(); passerRestantsHorsInitiative(); };
  const aucunCandidatAffiche = participantsSection.length === 0 && reserveEnBas.length === 0;
  const groupesRelance = useMemo(
    () => participantsParType(participantsSection, inclureEnvironnements, categoryOrder),
    [participantsSection, inclureEnvironnements, categoryOrder],
  );
  const participantsDansOrdreAffiche = useMemo(() => {
    const options = { inclureEnvironnements, categoryOrder, triSaisie, valeurs, multipleActionSlots, textConfig, bonusInitiatives, initiativeBonusEnabled };
    return [
      ...ordreParticipantsAffiches(participantsSection, options),
      ...ordreParticipantsAffiches(reserveEnBas, options),
    ];
  }, [participantsSection, reserveEnBas, inclureEnvironnements, categoryOrder, triSaisie, valeurs, multipleActionSlots, textConfig, bonusInitiatives, initiativeBonusEnabled]);
  const tirerToutesCartes = () => {
    if (!initiativeCardSource || !participantsDansOrdreAffiche.length) return false;
    try {
      if (!randomSystem?.actions?.drawCards) throw new Error(t('initiative.entry.cardDrawUnavailable'));
      const result = randomSystem.actions.drawCards(initiativeCardSource.id, participantsDansOrdreAffiche.length);
      const affectations = affectationsCartesInitiative(participantsDansOrdreAffiche, result, textConfig);
      if (!affectations.length) throw new Error(t('initiative.entry.cardDrawUnavailable'));
      setValeurs((courant) => {
        const suivant = { ...courant };
        affectations.forEach(({ participant, value }) => {
          const champs = Array.isArray(suivant[participant.id]) && suivant[participant.id].length ? suivant[participant.id] : [''];
          suivant[participant.id] = champs.map((champ, index) => index === 0 ? value : champ);
        });
        return suivant;
      });
      setRollError(affectations.length < participantsDansOrdreAffiche.length
        ? t('initiative.entry.cardDrawIncomplete', { drawn: affectations.length, count: participantsDansOrdreAffiche.length })
        : '');
      return affectations.length === participantsDansOrdreAffiche.length;
    } catch (error) {
      setRollError(error?.message || t('initiative.entry.cardDrawUnavailable'));
      return false;
    }
  };
  const propsSection = { inclureEnvironnements, categoryOrder, triSaisie, valeurs, changerValeur, ajouterAction, retirerAction, textConfig, initiativeEnabled, multipleActionSlots, surpriseSelectionEnabled, surprisedIds, basculerSurpris, initiativeBonusEnabled, modifierBonusInitiative, bonusInitiatives, changerBonus, initiativeRollAvailable, initiativeRollIsCard, onRollParticipant: lancerInitiativeParticipant, modifierDepartage, tiebreakerVisible, tiebreakerLabel, departages, changerDepartage };
  const modificationSwitchVisible = tiebreakerVisible || bonusSwitchVisible;

  return <Fenetre title={initiativeEnabled ? t('initiative.entry.title') : t('initiative.entry.surpriseTitle')} onClose={onFermer}>
    <div className="initiative-roll-panel">
      <div className="initiative-roll-toolbar manual-entry">
        <p className="muted compact-help">{!initiativeEnabled ? t('initiative.entry.helpSurprise') : initiativeTextOrderEnabled(textConfig) ? t('initiative.entry.helpTextOrder') : t('initiative.entry.helpNumeric')}</p>
        <div className="initiative-entry-controls">
          <div className="initiative-entry-topline">
            <label className="initiative-sort-field"><span>{t('initiative.entry.sort.label')}</span><select value={triSaisie} onChange={(event) => setTriSaisie(event.target.value)}><option value={initiativeEntrySortModes.TYPE}>{t('initiative.entry.sort.type')}</option><option value={initiativeEntrySortModes.NAME}>{t('initiative.entry.sort.name')}</option><option value={initiativeEntrySortModes.INITIATIVE}>{t('initiative.entry.sort.initiative')}</option></select></label>
            <div className="initiative-entry-top-actions">
              {initiativeEnabled && initiativeRollIsCard && participantsDansOrdreAffiche.length > 0 && <button className="small-btn initiative-draw-all-btn" type="button" onClick={tirerToutesCartes} aria-label={t('initiative.entry.drawAllTitle')} title={t('initiative.entry.drawAllTitle')}><IconeCadence name="cardStack" /><span>{t('initiative.entry.drawAll')}</span></button>}
              {initiativeEnabled && initiativeRollAvailable && groupesRelance.length > 0 && <details className="initiative-group-roll-menu">
                <summary>{t(initiativeRollIsCard ? 'initiative.entry.drawGrouped' : 'initiative.entry.rollGrouped')}</summary>
                <div className="initiative-group-roll-options">
                  {groupesRelance.map((groupe) => <button type="button" key={groupe.id} onClick={(event) => {
                    lancerInitiativeGroupe(groupe.participants);
                    event.currentTarget.closest('details')?.removeAttribute('open');
                  }} aria-label={t(initiativeRollIsCard ? 'initiative.entry.drawGroup' : 'initiative.entry.rollGroup', { group: groupe.label })}>
                    <span aria-hidden="true">{initiativeRollIsCard ? <IconeCadence name="cardStack" /> : <IconeJetDes />}</span>
                    <span>{groupe.label}</span>
                    <small>{groupe.participants.length}</small>
                  </button>)}
                </div>
              </details>}
              {initiativeEnabled && <button className="small-btn initiative-clear-btn" onClick={vider}>{t('initiative.entry.clear')}</button>}
            </div>
          </div>
          <div className="initiative-entry-switches">
            <GroupeSwitchesSaisieInitiative label={t('initiative.entry.includeGroup')}>
              <SwitchSaisieInitiative label={t('initiative.entry.environments')} checked={inclureEnvironnements} onChange={(valeur) => changerOptionSaisie('inclureEnvironnements', valeur)} />
              <SwitchSaisieInitiative label={t('initiative.entry.includeReserve')} checked={inclureReserve} onChange={(valeur) => changerOptionSaisie('inclureReserve', valeur)} />
            </GroupeSwitchesSaisieInitiative>
            {modificationSwitchVisible && <GroupeSwitchesSaisieInitiative label={t('common.edit')}>
              {tiebreakerVisible && <SwitchSaisieInitiative label={t('initiative.entry.editTiebreaker')} checked={modifierDepartage} onChange={(valeur) => changerOptionSaisie('modifierDepartage', valeur)} />}
              {bonusSwitchVisible && <SwitchSaisieInitiative label={t('initiative.entry.editBonus')} checked={modifierBonusInitiative} onChange={(valeur) => changerOptionSaisie('modifierBonusInitiative', valeur)} />}
            </GroupeSwitchesSaisieInitiative>}
          </div>
        </div>
      </div>
      {saisiePartielle && <div className="initiative-entry-warning">{t('initiative.entry.partialWarning')}</div>}
      {rollError && <p className="rule-option-warning" role="alert">{rollError}</p>}
      {aucunCandidatAffiche ? <p className="muted">{t('initiative.entry.empty')}</p> : <><SectionSaisieInitiative titre={t('initiative.entry.inInitiative')} participants={participantsSection} {...propsSection} />{initiativeEnabled && reserveEnBas.length > 0 && <details className="initiative-reserve-compact"><summary>{t('initiative.entry.reserveSummary', { count: reserveEnBas.length })}</summary><SectionSaisieInitiative titre="" participants={reserveEnBas} {...propsSection} surpriseSelectionEnabled={false} /></details>}</>}
      <div className="initiative-actions"><div className="initiative-decision-actions"><BoutonChoixInitiative titre={t('initiative.entry.continue')} detail={saisiePartielle ? t('initiative.entry.continuePartialDetail') : initiativeEnabled ? t('initiative.entry.continueDetail') : t('initiative.entry.continueSurpriseDetail')} onClick={appliquer} disabled={aValider.length === 0} variant="primary-choice" />{saisiePartielle && <BoutonChoixInitiative titre={t('initiative.entry.keep')} detail={t('initiative.entry.keepDetail')} onClick={ajouterEtConserverAutresInitiatives} variant="keep-choice" />}{saisiePartielle && participantsActifsSansValeur.length > 0 && <BoutonChoixInitiative titre={t('initiative.entry.ignore')} detail={t('initiative.entry.ignoreDetail')} onClick={appliquerEtPasserRestantsHorsInitiative} variant="out-choice" />}</div>{participantsActifsSansValeur.length > 0 && aValider.length === 0 && idsEnAttente.length < candidats.length && <BoutonChoixInitiative titre={t('initiative.entry.ignore')} detail={t('initiative.entry.ignoreEmptyDetail')} onClick={passerRestantsHorsInitiative} variant="out-choice" />}<button className="initiative-cancel-action" onClick={onFermer}>{t('common.cancel')}</button></div>
    </div>
  </Fenetre>;
}
