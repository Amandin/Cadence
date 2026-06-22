import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { numberedCopyName } from '../../templates.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const NOUVELLE_CATEGORIE = '__new__';

function devinerCategorie(participant, categories) {
  if (participant.kind === 'PJ' && categories.includes('PJ')) return 'PJ';
  if (participant.kind === 'Horloge' && categories.includes('Horloge')) return 'Horloge';
  if (participant.kind === 'Opposition' && categories.includes('Créature')) return 'Créature';
  if (participant.kind === 'Autre' && categories.includes('Autre')) return 'Autre';
  return categories.includes('PNJ') ? 'PNJ' : categories[0] || NOUVELLE_CATEGORIE;
}

export function FenetreSauvegardeTemplate({ participant, categories = [], erreur, onFermer, onEnregistrer }) {
  const [nom, setNom] = useState(participant.name || '');
  const [categorie, setCategorie] = useState(() => devinerCategorie(participant, categories));
  const [nouvelleCategorie, setNouvelleCategorie] = useState('');

  const enregistrer = (overwrite = false) => onEnregistrer({
    name: nom,
    category: categorie === NOUVELLE_CATEGORIE ? '' : categorie,
    newCategory: categorie === NOUVELLE_CATEGORIE ? nouvelleCategorie : '',
    overwrite,
  });

  return (
    <Fenetre title={t('templates.save.title')} onClose={onFermer}>
      <p className="muted" style={{ marginTop: 0 }}>
        {t('templates.save.help')}
      </p>
      <label className="field">{t('templates.editor.modelName')}<input value={nom} onChange={(event) => setNom(event.target.value)} placeholder={participant.name || t('templates.editor.modelName')} /></label>
      <label className="field">{t('sheet.category')}<select value={categorie} onChange={(event) => setCategorie(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}<option value={NOUVELLE_CATEGORIE}>{t('templates.save.newCategory')}</option></select></label>
      {categorie === NOUVELLE_CATEGORIE && <label className="field">{t('templates.save.newCategoryLabel')}<input value={nouvelleCategorie} onChange={(event) => setNouvelleCategorie(event.target.value)} placeholder={t('templates.save.categoryNamePlaceholder')} /></label>}
      {erreur && <div className={`delete-confirm ${erreur.kind === 'duplicate' ? 'template-warning' : ''}`}><strong>{erreur.kind === 'duplicate' ? t('templates.save.duplicateName') : t('templates.save.error')}</strong><span className="muted">{erreur.message}</span>{erreur.kind === 'duplicate' && <div className="grid2"><button className="danger-btn" onClick={() => enregistrer(true)}>{t('templates.save.overwrite')}</button><button className="small-btn" onClick={() => setNom(numberedCopyName([nom], nom, t('templates.fallback.unnamed')))}>{t('templates.save.rename')}</button></div>}</div>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" onClick={() => enregistrer(false)}>{t('common.save')}</button>
        <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
      </div>
    </Fenetre>
  );
}
