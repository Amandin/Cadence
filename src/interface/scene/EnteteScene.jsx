import { BadgeRound } from '../commun/ComposantsCommuns.jsx';
import { CompteurGlobal } from '../suivis/CompteurGlobal.jsx';

export function EnteteScene(props) {
  const {
    scene,
    actif,
    groupeActif = [],
    horlogesBloquantes,
    effetRound,
    compteurGlobalAuto,
    notesVisibles,
    classeSuivant,
    libelleSuivant,
    temporaliteSouple,
    temporalitePhases,
    suivantDesactive,
    onBasculerNotes,
    onTourPrecedent,
    onTourSuivant,
    onModifierCompteurGlobal,
    onOuvrirCompteurGlobal,
  } = props;
  const horlogeABloquee = horlogesBloquantes.length > 0;
  const tourSimultane = !temporaliteSouple && !horlogeABloquee && groupeActif.length > 1;
  const nomTourActif = horlogeABloquee
    ? horlogesBloquantes.map((participant) => participant.name).join(', ')
    : tourSimultane
      ? groupeActif.map((participant) => participant.name).join(' + ')
      : actif?.name || 'Aucun participant';
  const suffixeTemporalite = temporaliteSouple ? ' · souple' : temporalitePhases ? ' · phases' : '';
  const libelleTour = horlogeABloquee
    ? 'Horloge à gérer'
    : tourSimultane
      ? 'Tour simultané'
      : temporalitePhases
        ? 'Tour actif'
        : 'Tour actif';

  return (
    <header className="top compact">
      <div className="scene-head">
        <button className="icon-btn" onClick={onBasculerNotes}>{notesVisibles ? '⌃' : '⌄'}</button>
        <div>
          <h1>{scene.title}</h1>
          <div className="muted">{scene.type} · {scene.participants.length} en initiative{suffixeTemporalite}</div>
        </div>
        <BadgeRound round={scene.round} effect={effetRound} phase={temporalitePhases ? scene.phase || 1 : null} />
      </div>
      {notesVisibles && <div className="scene-notes panel">{scene.notes}</div>}
      <div className="turn-row">
        <button className="turn-btn" onClick={onTourPrecedent} aria-label="Participant précédent">↶</button>
        <div className={`active-box panel ${tourSimultane ? 'simultaneous-turn' : ''} ${temporaliteSouple ? 'flexible-turn' : ''} ${temporalitePhases ? 'phase-turn' : ''}`}>
          <div className="turn-active-line">
            <div className="active-name">
              {temporaliteSouple && !horlogeABloquee ? <><div className="muted">Mode souple</div><strong>Marquer les tours dans la liste</strong></> : <><div className="muted">{libelleTour}</div><strong>{nomTourActif}</strong></>}
            </div>
            {tourSimultane && <span className="chip simultaneous-chip">Même temps</span>}
            {temporaliteSouple && !horlogeABloquee && <span className="chip flexible-chip">Souple</span>}
            <CompteurGlobal compteur={scene.globalTracker} onChanger={onModifierCompteurGlobal} onOuvrir={onOuvrirCompteurGlobal} animationTick={compteurGlobalAuto} />
          </div>
        </div>
        <button className={`turn-btn next ${classeSuivant}`} onClick={onTourSuivant} disabled={suivantDesactive} aria-label={libelleSuivant}>{horlogeABloquee ? '⏸' : '➜'}</button>
      </div>
    </header>
  );
}
