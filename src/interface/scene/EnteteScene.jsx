import { BadgeRound, EtiquetteEtat } from '../commun/ComposantsCommuns.jsx';
import { participantEstInactif, participantEstLimite } from '../../domain/statuses.js';
import { CompteurGlobal } from '../suivis/CompteurGlobal.jsx';

export function EnteteScene(props) {
  const {
    scene,
    actif,
    groupeActif = [],
    horlogesBloquantes,
    effetRound,
    compteurGlobalAuto,
    classeSuivant,
    libelleSuivant,
    temporaliteSouple,
    temporalitePhases,
    temporaliteDeclaration,
    suivantDesactive,
    dark,
    onRetourHub,
    onTourSuivant,
    onModifierCompteurGlobal,
    onToggleCompteurTemps,
    onToggleSurprisePreparation,
    onRetirerEtatScene,
  } = props;
  const horlogeABloquee = horlogesBloquantes.length > 0;
  const enPreparation = scene.round < 0;
  const tourSimultane = !temporaliteSouple && !horlogeABloquee && groupeActif.length > 1;
  const nomTourActif = enPreparation
    ? 'Préparer la scène'
    : horlogeABloquee
      ? horlogesBloquantes.map((participant) => participant.name).join(', ')
      : tourSimultane
        ? groupeActif.map((participant) => participant.name).join(' + ')
        : temporaliteDeclaration && !actif ? 'Déclarer les actions' : actif?.name || 'Aucun participant';
  const suffixeTemporalite = `${temporaliteSouple ? ' · souple' : temporalitePhases ? ' · phases' : ''}${temporaliteDeclaration ? ' · déclaration' : ''}`;
  const actionDeclaree = temporaliteDeclaration && actif && scene.declarationStage === 'resolution' && !(scene.declarationPlayedIds || []).includes(actif.id) ? scene.declarations?.[actif.id] : '';
  const statutActif = participantEstInactif(actif) ? 'Inactif' : participantEstLimite(actif) ? 'Limité' : 'Actif';
  const libelleTour = enPreparation
    ? 'Préparation'
    : horlogeABloquee
      ? 'Horloge à gérer'
      : tourSimultane
        ? 'Participants simultanés'
        : temporaliteDeclaration && !actif ? 'Déclaration' : statutActif;
  const logo = dark ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';

  return (
    <header className="top compact">
      <div className="scene-head scene-head-with-logo" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: 8 }}>
        <button className="hub-return-logo" onClick={onRetourHub} aria-label="Retour au Hub de campagne"><img src={logo} alt="" /></button>
        <div className="scene-title-block" style={{ minWidth: 0 }}>
          <h1>{scene.title}</h1>
          <div className="muted">{scene.type} · {scene.participants.length} en initiative{suffixeTemporalite}</div>
        </div>
        <BadgeRound round={scene.round} effect={effetRound} phase={temporalitePhases ? scene.phase || 1 : null} />
      </div>
      {enPreparation && <label className={`reset-switch preparation-surprise-toggle ${scene.preparationSurprise ? 'active' : ''}`}><span>Surprise</span><input type="checkbox" checked={!!scene.preparationSurprise} onChange={(event) => onToggleSurprisePreparation?.(event.target.checked)} /></label>}
      <div className="turn-row header-turn-row">
        <div className={`active-box panel ${tourSimultane ? 'simultaneous-turn' : ''} ${temporaliteSouple ? 'flexible-turn' : ''} ${temporalitePhases ? 'phase-turn' : ''} ${temporaliteDeclaration ? 'declaration-turn' : ''}`}>
          <div className="turn-active-line">
            <div className="active-name">
              {temporaliteSouple && !horlogeABloquee && !enPreparation ? <><div className="muted">Mode souple</div><strong>Marquer les personnages ayant joué</strong></> : <><div className="muted">{libelleTour}</div><strong>{nomTourActif}</strong>{actionDeclaree && <strong className="declaration-header-action">({actionDeclaree})</strong>}</>}
            </div>
            {temporaliteSouple && !horlogeABloquee && !enPreparation && <span className="chip flexible-chip">Souple</span>}
            <CompteurGlobal compteur={scene.globalTracker} onChanger={onModifierCompteurGlobal} onToggleTemps={onToggleCompteurTemps} animationTick={compteurGlobalAuto} />
          </div>
        </div>
        <button className={`turn-btn next ${classeSuivant}`} onClick={onTourSuivant} disabled={suivantDesactive} aria-label={libelleSuivant}>{horlogeABloquee ? '⏸' : '➜'}</button>
      </div>
      <div className="statuses status-control-row scene-status-row">
        {(scene.statuses || []).map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onRetirer={() => onRetirerEtatScene?.(etat.id)} />)}
      </div>
    </header>
  );
}
