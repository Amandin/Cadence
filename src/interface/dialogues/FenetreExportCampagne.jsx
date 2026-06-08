import { useRef, useState } from 'react';
import { normalizeCampaignName } from '../../storage.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreExportCampagne({ nomInitial, onFermer, onExporter }) {
  const [nom, setNom] = useState(nomInitial || 'Campagne Cadence');
  const [exportEnCours, setExportEnCours] = useState(false);
  const [message, setMessage] = useState('');
  const exportEnCoursRef = useRef(false);

  const valider = async () => {
    if (exportEnCoursRef.current) return;
    exportEnCoursRef.current = true;
    setMessage('');
    setExportEnCours(true);
    const result = await onExporter(normalizeCampaignName(nom));
    setExportEnCours(false);
    exportEnCoursRef.current = false;
    if (result?.ok) {
      onFermer();
      return;
    }
    if (result?.cancelled) {
      setMessage('Export annulé ou non confirmé par le navigateur.');
      return;
    }
    setMessage(result?.message || 'Le navigateur n’a pas confirmé l’export.');
  };

  return (
    <Fenetre title="Exporter la campagne" onClose={onFermer}>
      <div className="stack">
        <p className="muted compact-help">Vérifie le nom avant d’enregistrer. Si le navigateur le permet, Cadence ouvrira une fenêtre système pour choisir l’emplacement du fichier.</p>
        <label className="field">
          Nom de campagne
          <input
            type="text"
            value={nom}
            autoFocus
            placeholder="Campagne Cadence"
            onChange={(event) => setNom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') valider();
            }}
          />
        </label>
        <div className="grid2">
          <button className="primary" onClick={valider} disabled={exportEnCours}>{exportEnCours ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button className="small-btn" onClick={onFermer} disabled={exportEnCours}>Annuler</button>
        </div>
        {message && <p className="export-feedback">{message}</p>}
      </div>
    </Fenetre>
  );
}
