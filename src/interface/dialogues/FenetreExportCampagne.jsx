import { useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { normalizeCampaignName } from '../../storage.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreExportCampagne({ nomInitial, onFermer, onExporter }) {
  const [nom, setNom] = useState(nomInitial || t('export.defaultName'));
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
      setMessage(t('export.cancelled'));
      return;
    }
    setMessage(result?.message || t('export.unconfirmed'));
  };

  return (
    <Fenetre title={t('export.title')} onClose={onFermer}>
      <div className="stack">
        <p className="muted compact-help">{t('export.help')}</p>
        <label className="field">
          {t('export.campaignName')}
          <input
            type="text"
            value={nom}
            autoFocus
            placeholder={t('export.defaultName')}
            onChange={(event) => setNom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') valider();
            }}
          />
        </label>
        <div className="grid2">
          <button className="primary" onClick={valider} disabled={exportEnCours}>{exportEnCours ? t('export.saving') : t('common.save')}</button>
          <button className="small-btn" onClick={onFermer} disabled={exportEnCours}>{t('common.cancel')}</button>
        </div>
        {message && <p className="export-feedback">{message}</p>}
      </div>
    </Fenetre>
  );
}
