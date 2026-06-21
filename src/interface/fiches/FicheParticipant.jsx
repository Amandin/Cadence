import { useState } from 'react';
import { defaultPhaseCount, phaseActionModes } from '../../constants.js';
import { initiativesActionParticipant } from '../../domain/initiative.js';
import { initiativeInputIsValid, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { uiGlyphs } from '../../uiAssets.js';
import { EtiquetteEtat, Fenetre, teinteEtatParticipant } from '../commun/ComposantsCommuns.jsx';
import { IconeOeilMystiqueOuvert, IconeOeilMystiqueFerme } from '../icones/IconesOeilMystique.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';
import { EditeurPhasesParticipant, normaliserPhaseActions } from '../initiative/EditeurPhasesParticipant.jsx';
import { Suivi } from '../suivis/Suivi.jsx';
import { InfosRapides } from './InfosRapides.jsx';

function valeurNumerique(valeur, defaut = 0) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : defaut;
}

function formatBonusInitiative(valeur) {
  const bonus = valeurNumerique(valeur, 0);
  return bonus > 0 ? `+${bonus}` : String(bonus);
}

function FenetreInitiativesRapides({ participant, initiatives, initiativeTextOrder, phaseActionMode, phaseCount = defaultPhaseCount, multipleActionSlots = true, onFermer, onValider }) {
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const modePhasesCochees = phaseActionMode === phaseActionModes.CHECKED;
  const [brouillon, setBrouillon] = useState(() => (multipleActionSlots ? initiatives : initiatives.slice(0, 1)).map(String));
  const [phaseActionsBrouillon, setPhaseActionsBrouillon] = useState(() => normaliserPhaseActions(Array.isArray(participant.phaseActions) ? participant.phaseActions : ['1'], phaseCount));
  const modifier = (index, valeur) => setBrouillon((courant) => courant.map((item, position) => position === index ? valeur : item));
  const ajouter = () => setBrouillon((courant) => [...courant, courant.at(-1) || '']);
  const retirer = (index) => setBrouillon((courant) => courant.length <= 1 ? courant : courant.filter((_, position) => position !== index));
  const valeurs = brouillon.map((valeur) => String(valeur ?? '').trim()).filter(Boolean);
  const valeursValides = valeurs.length > 0 && valeurs.every((valeur) => initiativeInputIsValid(valeur, textConfig));
  const valider = () => {
    if (!valeursValides) return;
    onValider(
      valeurs.map((valeur) => initiativeValueForMode(valeur, textConfig)),
      modePhasesCochees ? normaliserPhaseActions(phaseActionsBrouillon, phaseCount) : undefined,
    );
  };

  return (
    <Fenetre title={`Initiative - ${participant.name}`} onClose={onFermer}>
      <div className="stack">
        {brouillon.map((initiative, index) => (
          <div className="initiative-action-row" key={index}>
            <ChampInitiative label={t('initiative.entry.slotLabel', { index: index + 1 })} valeur={initiative} textConfig={textConfig} onChange={(valeur) => modifier(index, valeur)} autoFocus={index === 0} />
            <button className="small-btn subtle-danger" type="button" onClick={() => retirer(index)} disabled={brouillon.length <= 1}>x</button>
          </div>
        ))}
        {multipleActionSlots && <button className="small-btn" type="button" onClick={ajouter}>{t('sheet.actions.add')}</button>}
        {modePhasesCochees && <EditeurPhasesParticipant phaseActions={phaseActionsBrouillon} phaseCount={phaseCount} onChange={setPhaseActionsBrouillon} />}
        <div className="grid2">
          <button className="primary" onClick={valider} disabled={!valeursValides}>{t('sheet.validate')}</button>
          <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
        </div>
      </div>
    </Fenetre>
  );
}

function MiniCompteurInitiative({ participant, departage, initiativeTextOrder, phaseActionMode, phaseCount, multipleActionSlots, initiativeBonusEnabled = true, tiebreakerVisible, onChangerInitiatives }) {
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const initiatives = initiativesActionParticipant(participant, { initiativeTextOrder: textConfig, multipleActionSlots });
  const [edition, setEdition] = useState(false);
  const libelle = initiatives.join(' / ');
  const valeurDepartage = valeurNumerique(departage, 0);
  const bonusInitiative = initiativeBonusEnabled ? valeurNumerique(participant.initiativeBonus, 0) : 0;
  const afficherDepartage = tiebreakerVisible && valeurDepartage !== 0;

  return (
    <>
      <button className="mini-init-counter compact-init-display" onClick={() => setEdition(true)} aria-label={t('initiative.quickEdit.aria')}>
        <small>{t('initiative.groupShort')}</small>
        <strong>{libelle}{afficherDepartage && <em className="init-tiebreak">{valeurDepartage > 0 ? `+${valeurDepartage}` : valeurDepartage}</em>}</strong>
        {bonusInitiative !== 0 && <span className="init-bonus-badge">{formatBonusInitiative(bonusInitiative)}</span>}
      </button>
      {edition && <FenetreInitiativesRapides participant={participant} initiatives={initiatives} initiativeTextOrder={initiativeTextOrder} phaseActionMode={phaseActionMode} phaseCount={phaseCount} multipleActionSlots={multipleActionSlots} onFermer={() => setEdition(false)} onValider={(valeurs, phaseActions) => { onChangerInitiatives(valeurs, phaseActions); setEdition(false); }} />}
    </>
  );
}

export function FicheParticipant({ participant, enInitiative, initiativeTextOrder, phaseActionMode, phaseCount = defaultPhaseCount, multipleActionSlots = true, utiliserInitiative = true, initiativeBonusEnabled = true, tiebreakerVisible = true, onFermer, onModifier, onBasculerDissimule, onChangerInitiatives, onRejoindreInitiative, onQuitterInitiative, onInfoRapide, onSuivi, onSupprimerSuivi, onAjouterEtat, onModifierEtat, onRetirerEtat, onNote }) {
  const teinteEtat = teinteEtatParticipant(participant);
  const dissimule = !!participant.secret;
  const basculerVisibilite = (suivi) => onSuivi(suivi.id, { ...suivi, visible: suivi.visible === false });
  const basculerSecret = (suivi) => onSuivi(suivi.id, { ...suivi, secret: !suivi.secret });
  const boutonOeil = (suivi) => {
    const visible = suivi.visible !== false;
    return <button className={`eye-toggle ${visible ? 'active' : 'inactive'}`} onClick={(event) => { event.stopPropagation(); basculerVisibilite(suivi); }} aria-label={visible ? t('sheet.tracker.hideOnCard') : t('sheet.tracker.showOnCard')} title={visible ? t('sheet.tracker.visibleOnCard') : t('sheet.tracker.hiddenOnCard')} type="button">{visible ? <IconeOeilMystiqueOuvert /> : <IconeOeilMystiqueFerme />}</button>;
  };
  const boutonsSuivi = (suivi) => (
    <span className="sheet-tracker-quick-actions">
      {boutonOeil(suivi)}
      <button className={`spy-toggle sheet-spy-toggle ${suivi.secret ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); basculerSecret(suivi); }} aria-pressed={!!suivi.secret} title={t('sheet.tracker.secret')} type="button"><span aria-hidden="true">{uiGlyphs.stealth}</span><b>{t('sheet.tracker.secret')}</b></button>
    </span>
  );
  const enteteFiche = (
    <div className="character-sheet-header">
      <div className="character-sheet-title-row">
        <h2>{participant.name}</h2>
        <button className="icon-btn" onClick={onFermer} aria-label={t('common.close')} type="button">{uiGlyphs.close}</button>
      </div>
      <button className={`conceal-character-btn discreet ${dissimule ? 'active' : ''}`} type="button" onClick={onBasculerDissimule} aria-pressed={dissimule} title={dissimule ? t('sheet.character.revealTitle') : t('sheet.character.hideTitle')}><span aria-hidden="true">{uiGlyphs.stealth}</span><b>{t('sheet.character.hide')}</b></button>
    </div>
  );

  return (
    <Fenetre title={participant.name} onClose={onFermer} header={enteteFiche} className={`character-sheet ${teinteEtat ? 'status-tinted-character' : ''} ${dissimule ? 'secret-character-sheet' : ''}`} style={teinteEtat ? { '--status-tint-gradient': teinteEtat.gradient } : undefined}>
      <p>{participant.description}</p>
      <div className={`sheet-action-row ${enInitiative && utiliserInitiative ? '' : 'without-init-counter'}`}>
        <button className="primary" onClick={onModifier}>{t('common.edit')}</button>
        {enInitiative && utiliserInitiative && <MiniCompteurInitiative participant={participant} departage={participant.departage} initiativeTextOrder={initiativeTextOrder} phaseActionMode={phaseActionMode} phaseCount={phaseCount} multipleActionSlots={multipleActionSlots} initiativeBonusEnabled={initiativeBonusEnabled} tiebreakerVisible={tiebreakerVisible} onChangerInitiatives={onChangerInitiatives} />}
        {enInitiative ? <button className="small-btn" onClick={onQuitterInitiative}>{t('initiative.leave')}</button> : <button className="small-btn join-init-wide" onClick={onRejoindreInitiative}>{t('initiative.join')}</button>}
      </div>
      <InfosRapides stats={participant.stats || []} editable onChanger={onInfoRapide} />
      <h3>{t('sheet.trackers.title')}</h3>
      <div className="stack sheet-trackers">{participant.trackers.map((suivi) => <Suivi key={suivi.id} suivi={suivi} avantTitre={boutonsSuivi(suivi)} couleur={participant.color} afficherBadgeSecret={false} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} />)}</div>
      <h3>{t('sheet.statuses.title')}</h3>
      <div className="statuses">{participant.statuses?.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onModifier={() => onModifierEtat?.(etat.id)} onRetirer={() => onRetirerEtat(etat.id)} />)}<button className="small-btn sheet-add-status-btn" onClick={onAjouterEtat}>{t('scene.status.add')}</button></div>
      <label className="field">{t('sheet.note')}<textarea value={participant.note || ''} onChange={(event) => onNote(event.target.value)} /></label>
    </Fenetre>
  );
}
