export function BarreActionBas({ classeSuivant, prochainRound, round, horlogeBloquee, suivantDesactive, libelleSuivant, onRetourHub, onTourPrecedent, onTourSuivant, onAjouterPersonnage, onSaisirInitiatives, onOuvrirMenu }) {
  const texteSuivant = libelleSuivant || (horlogeBloquee ? 'Horloge' : prochainRound ? `Nouveau round · R${round + 1}` : `Suivant · R${round}`);

  return (
    <div className="bottom" style={{ gridTemplateColumns: 'auto minmax(0, .82fr) auto auto auto auto', gap: 6, padding: 6 }}>
      <button className="turn-btn compact" onClick={onTourPrecedent} aria-label="Participant précédent">↶</button>
      <button className={`primary ${classeSuivant}`} style={{ minWidth: 0, padding: '10px 11px', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={onTourSuivant} disabled={suivantDesactive}>{texteSuivant}</button>
      <button className="small-btn hub-bottom-logo" onClick={onRetourHub} aria-label="Retour au Hub de campagne" style={{ width: 38, minWidth: 38, padding: 4, display: 'grid', placeItems: 'center' }}><img src="/branding/logo-cadence-light.svg" alt="" style={{ width: 24, height: 24, display: 'block' }} /></button>
      <button className="small-btn" onClick={onSaisirInitiatives}>Init</button>
      <button className="small-btn" onClick={onAjouterPersonnage}>+</button>
      <button className="small-btn" onClick={onOuvrirMenu}>☰</button>
    </div>
  );
}
