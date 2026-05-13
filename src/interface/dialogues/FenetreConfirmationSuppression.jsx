import { Sheet } from '../../components/common.jsx';

export function FenetreConfirmationSuppression({ nom, onAnnuler, onConfirmer }) {
  return (
    <Sheet title="Supprimer la fiche ?" onClose={onAnnuler}>
      <div className="stack">
        <p style={{ marginTop: 0 }}>
          Tu es sur le point de supprimer <strong>{nom}</strong> de la scène.
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Cette action retire la fiche et ses suivis. Elle ne peut pas être annulée depuis cette fenêtre.
        </p>
        <div className="grid2" style={{ marginTop: 12 }}>
          <button className="small-btn" onClick={onAnnuler}>Annuler</button>
          <button className="danger-btn" onClick={onConfirmer}>Supprimer définitivement</button>
        </div>
      </div>
    </Sheet>
  );
}
