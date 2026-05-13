export function BarreActionBas({ classeSuivant, prochainRound, round, horlogeBloquee, onTourPrecedent, onTourSuivant, onAjouterPersonnage, onOuvrirMenu }) {
  return (
    <div className="bottom">
      <button className="turn-btn compact" onClick={onTourPrecedent} aria-label="Participant précédent">↶</button>
      <button className={`primary ${classeSuivant}`} onClick={onTourSuivant}>{horlogeBloquee ? 'Horloge' : prochainRound ? `Nouveau round · R${round + 1}` : `Suivant · R${round}`}</button>
      <button className="small-btn" onClick={onAjouterPersonnage}>+</button>
      <button className="small-btn" onClick={onOuvrirMenu}>☰</button>
    </div>
  );
}
