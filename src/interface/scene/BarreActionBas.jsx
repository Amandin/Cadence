export function BarreActionBas({ classeSuivant, prochainRound, round, horlogeBloquee, suivantDesactive, libelleSuivant, onTourPrecedent, onTourSuivant, onAjouterPersonnage, onSaisirInitiatives, onOuvrirMenu }) {
  const texteSuivant = libelleSuivant || (horlogeBloquee ? 'Horloge' : prochainRound ? `Nouveau round · R${round + 1}` : `Suivant · R${round}`);

  return (
    <div className="bottom">
      <button className="turn-btn compact" onClick={onTourPrecedent} aria-label="Participant précédent">↶</button>
      <button className={`primary ${classeSuivant}`} onClick={onTourSuivant} disabled={suivantDesactive}>{texteSuivant}</button>
      <button className="small-btn" onClick={onSaisirInitiatives}>Init</button>
      <button className="small-btn" onClick={onAjouterPersonnage}>+</button>
      <button className="small-btn" onClick={onOuvrirMenu}>☰</button>
    </div>
  );
}
