import { BoutonTourPrecedent } from './BoutonTourPrecedent.jsx';

export function BarreActionBas({ classeSuivant, prochainRound, round, horlogeBloquee, suivantDesactive, retourDesactive, libelleSuivant, onTourPrecedent, onTourSuivant, onRetourPreparation, onAjouterParticipant, onOuvrirMenu }) {
  const prochainRoundAffiche = Math.max(1, Number(round || 0) + 1);
  const texteSuivant = libelleSuivant || (horlogeBloquee ? 'Horloge' : prochainRound ? `Nouveau round - R${prochainRoundAffiche}` : `Suivant - R${Math.max(1, round)}`);
  const enPreparation = round < 0;

  return (
    <div className={`bottom ${enPreparation ? 'bottom-preparation' : ''}`} style={{ gridTemplateColumns: enPreparation ? 'minmax(0, 1fr) minmax(0, 1fr) auto' : 'auto minmax(0, 1fr) auto', gap: 6, padding: 6 }}>
      {enPreparation
        ? <button className="primary bottom-add-participant" type="button" onClick={onAjouterParticipant}>Ajouter</button>
        : onRetourPreparation
          ? <button className="turn-btn compact prep-return-btn bottom-prep-return" onClick={onRetourPreparation} aria-label="Retour en preparation" title="Retour en preparation">↤</button>
          : <BoutonTourPrecedent compact disabled={retourDesactive} onClick={onTourPrecedent} />}
      <button className={`primary ${classeSuivant}`} style={{ minWidth: 0, padding: '10px 11px', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={onTourSuivant} disabled={suivantDesactive}>{texteSuivant}</button>
      <button className="small-btn" onClick={onOuvrirMenu}>☰</button>
    </div>
  );
}
