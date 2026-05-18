export function BoutonTourPrecedent({ disabled = false, compact = false, onClick }) {
  return (
    <button className={`turn-btn ${compact ? 'compact' : ''} previous-turn ${disabled ? 'disabled' : 'available'}`} onClick={onClick} disabled={disabled} aria-label="Participant précédent">↶</button>
  );
}
