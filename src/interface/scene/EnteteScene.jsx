import { GlobalTracker } from '../../components/GlobalTracker.jsx';
import { RoundBadge } from '../../components/common.jsx';

export function EnteteScene(props) {
  const {
    scene,
    actif,
    horlogesBloquantes,
    effetRound,
    compteurGlobalAuto,
    notesVisibles,
    classeSuivant,
    libelleSuivant,
    onBasculerNotes,
    onTourPrecedent,
    onTourSuivant,
    onModifierCompteurGlobal,
    onOuvrirCompteurGlobal,
  } = props;
  const horlogeABloquee = horlogesBloquantes.length > 0;
  const nomTourActif = horlogeABloquee ? horlogesBloquantes.map((participant) => participant.name).join(', ') : actif?.name || 'Aucun participant';

  return (
    <header className="top compact">
      <div className="scene-head">
        <button className="icon-btn" onClick={onBasculerNotes}>{notesVisibles ? '⌃' : '⌄'}</button>
        <div>
          <h1>{scene.title}</h1>
          <div className="muted">{scene.type} · {scene.participants.length} en initiative</div>
        </div>
        <RoundBadge round={scene.round} effect={effetRound} />
      </div>
      {notesVisibles && <div className="scene-notes panel">{scene.notes}</div>}
      <div className="turn-row">
        <button className="turn-btn" onClick={onTourPrecedent} aria-label="Participant précédent">↶</button>
        <div className="active-box panel">
          <div className="turn-active-line">
            <div className="active-name">
              <div className="muted">{horlogeABloquee ? 'Horloge à gérer' : 'Tour actif'}</div>
              <strong>{nomTourActif}</strong>
            </div>
            <GlobalTracker tracker={scene.globalTracker} onStep={onModifierCompteurGlobal} onOpen={onOuvrirCompteurGlobal} tick={compteurGlobalAuto} />
          </div>
        </div>
        <button className={`turn-btn next ${classeSuivant}`} onClick={onTourSuivant} aria-label={libelleSuivant}>{horlogeABloquee ? '⏸' : '➜'}</button>
      </div>
    </header>
  );
}
