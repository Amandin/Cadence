import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreInitiativeDepassee({ kind, onActiver, onAjouter, onModifier, onSurpris }) {
  const insertionImmediate = ['classic-insert', 'phase-insert'].includes(kind);
  const insertionPhase = kind === 'phase-insert';
  const phaseDepassee = kind === 'phase-passed';
  const horsPhase = kind === 'phase-not-current';

  const title = insertionPhase
    ? 'Insertion dans la phase'
    : insertionImmediate
      ? 'Insertion dans la sequence'
      : horsPhase
        ? "N'agit pas dans cette phase"
        : phaseDepassee
          ? 'Initiative depassee dans cette phase'
          : 'Initiative deja depassee';

  return (
    <Fenetre title={title} onClose={onAjouter}>
      <div className="stack">
        {insertionImmediate
          ? <><p style={{ margin: 0 }}>Cette initiative se place juste avant le personnage actuellement actif.</p><p style={{ margin: 0 }}>Cadence peut activer ce personnage maintenant pour l'inserer dans la sequence.</p></>
          : horsPhase
            ? <><p style={{ margin: 0 }}>Ce personnage n'agit pas pendant la phase courante.</p><p style={{ margin: 0 }}>Cadence l'ajoutera a l'initiative, mais ne l'activera pas dans cette phase.</p></>
            : phaseDepassee
              ? <><p style={{ margin: 0 }}>Cette initiative est deja depassee pour la phase en cours.</p><p style={{ margin: 0 }}>Le personnage ne sera pas active automatiquement par Cadence pendant cette phase.</p></>
              : <><p style={{ margin: 0 }}>Cette initiative est deja depassee.</p><p style={{ margin: 0 }}>Le personnage ne sera donc pas active par Cadence ce round.</p></>}
        <p className="muted compact-help">Le MJ peut tout de meme le faire agir narrativement si necessaire.</p>
        {insertionImmediate && <button className="primary" type="button" onClick={onActiver}>Activer maintenant</button>}
        <div className="grid2 dynamic-insertion-secondary-actions with-surprise-action">
          <button className="small-btn" type="button" onClick={onAjouter}>Ajouter quand meme</button>
          <button className="small-btn suggested" type="button" onClick={onSurpris}>Ajouter surpris</button>
          <button className="small-btn" type="button" onClick={onModifier}>Modifier son initiative</button>
        </div>
      </div>
    </Fenetre>
  );
}
