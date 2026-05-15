export function BarreActionBas({ dark, classeSuivant, prochainRound, round, horlogeBloquee, suivantDesactive, libelleSuivant, onRetourHub, onTourPrecedent, onTourSuivant, onAjouterPersonnage, onSaisirInitiatives, onOuvrirMenu }) {
  const texteSuivant = libelleSuivant || (horlogeBloquee ? 'Horloge' : prochainRound ? `Nouveau round · R${round + 1}` : `Suivant · R${round}`);
  const logo = dark ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';

  return (
    <div className="bottom" style={{ gridTemplateColumns: 'auto auto minmax(0, .82fr) auto auto auto', gap: 6, padding: 6 }}>
      <button className="small-btn hub-bottom-logo" onClick={onRetourHub} aria-label="Retour au Hub de campagne"><img src={logo} alt="" /></button>
      <button className="turn-btn compact" onClick={onTourPrecedent} aria-label="Participant précédent">↶</button>
      <button className={`primary ${classeSuivant}`} style={{ minWidth: 0, padding: '10px 11px', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={onTourSuivant} disabled={suivantDesactive}>{texteSuivant}</button>
      <button className="small-btn" onClick={onSaisirInitiatives}>Init</button>
      <button className="small-btn" onClick={onAjouterPersonnage}>+</button>
      <button className="small-btn" onClick={onOuvrirMenu}>☰</button>
    </div>
  );
}
