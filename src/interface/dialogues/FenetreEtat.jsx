import { useEffect, useState } from 'react';
import { colorNames } from '../../constants.js';
import { t } from '../../i18n/index.js';
import { colors } from '../../logic.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { SelecteurImpactEtat } from '../commun/SelecteurImpactEtat.jsx';

const optionsDuree = [
  { label: '∞', value: 'infinite' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
  { label: t('status.duration.custom'), value: 'custom' },
];

export function FenetreEtat({ participant, initialStatus = null, onFermer, onValider, onSaveTemplate, defaultAdvanceOn = 'activation', afficherChoixEvolution = true, afficherInactif = true, allowActivationAdvance = true, activationAdvanceNote = '', statusTemplates = [], tintLabel = t('status.tintParticipant') }) {
  const advanceOnInitial = allowActivationAdvance && defaultAdvanceOn !== 'round' ? 'activation' : 'round';
  const initialAdvanceOn = initialStatus?.advanceOn === 'round' || !allowActivationAdvance ? 'round' : advanceOnInitial;
  const [nom, setNom] = useState(() => initialStatus?.name || t('status.defaultName'));
  const [duree, setDuree] = useState(() => initialStatus?.duration == null ? 'infinite' : 'custom');
  const [dureePersonnalisee, setDureePersonnalisee] = useState(() => String(initialStatus?.duration || 8));
  const [boucle, setBoucle] = useState(() => !!initialStatus?.loop);
  const [impact, setImpact] = useState(() => afficherInactif && initialStatus?.inactive ? 'inactive' : afficherInactif && initialStatus?.limited ? 'limited' : 'normal');
  const [couleur, setCouleur] = useState(() => initialStatus?.color || '');
  const [teintePersonnage, setTeintePersonnage] = useState(() => !!initialStatus?.color && !!initialStatus?.tintParticipant);
  const [advanceOn, setAdvanceOn] = useState(() => afficherChoixEvolution ? initialAdvanceOn : defaultAdvanceOn);
  const [templateId, setTemplateId] = useState(statusTemplates[0]?.id || '');
  const [templateMessage, setTemplateMessage] = useState('');

  useEffect(() => {
    if (!templateId && statusTemplates[0]?.id) setTemplateId(statusTemplates[0].id);
    if (templateId && !statusTemplates.some((template) => template.id === templateId)) setTemplateId(statusTemplates[0]?.id || '');
  }, [statusTemplates, templateId]);

  useEffect(() => {
    if (!initialStatus) return;
    setNom(initialStatus.name || t('status.defaultName'));
    setDuree(initialStatus.duration == null ? 'infinite' : 'custom');
    setDureePersonnalisee(String(initialStatus.duration || 1));
    setBoucle(!!initialStatus.loop);
    setImpact(afficherInactif && initialStatus.inactive ? 'inactive' : afficherInactif && initialStatus.limited ? 'limited' : 'normal');
    setCouleur(initialStatus.color || '');
    setTeintePersonnage(!!initialStatus.color && !!initialStatus.tintParticipant);
    const statusAdvanceOn = initialStatus.advanceOn === 'round' || !allowActivationAdvance ? 'round' : 'activation';
    setAdvanceOn(afficherChoixEvolution ? statusAdvanceOn : defaultAdvanceOn);
    setTemplateMessage('');
  }, [initialStatus, afficherChoixEvolution, afficherInactif, allowActivationAdvance, defaultAdvanceOn]);

  const dureeFinie = duree !== 'infinite';
  const valeurDuree = duree === 'custom' ? Number(dureePersonnalisee) : Number(duree);
  const dureeValide = !dureeFinie || (Number.isFinite(valeurDuree) && valeurDuree >= 1);
  const peutEnregistrer = nom.trim() && dureeValide;
  const nomSurpris = nom.trim().toLocaleLowerCase('fr') === 'surpris';
  const modeEdition = !!initialStatus;

  const appliquerTemplate = () => {
    const template = statusTemplates.find((item) => item.id === templateId);
    const status = template?.status;
    if (!status) return;
    setTemplateMessage('');
    setNom(status.name || template.name || t('status.templateFallback'));
    setDuree(status.duration == null ? 'infinite' : 'custom');
    setDureePersonnalisee(String(status.duration || 1));
    setBoucle(!!status.loop);
    setImpact(afficherInactif && status.inactive ? 'inactive' : afficherInactif && status.limited ? 'limited' : 'normal');
    setCouleur(status.color || '');
    setTeintePersonnage(!!status.tintParticipant);
    const templateAdvanceOn = status.advanceOn === 'round' || !allowActivationAdvance ? 'round' : 'activation';
    setAdvanceOn(afficherChoixEvolution ? templateAdvanceOn : defaultAdvanceOn);
  };

  const construireEtat = () => {
    const nomNettoye = nom.trim();
    if (!nomNettoye || !dureeValide) return null;
    const prochainDeclencheur = afficherChoixEvolution ? advanceOn : defaultAdvanceOn;
    return {
      name: nomNettoye,
      duration: dureeFinie ? valeurDuree : null,
      loop: dureeFinie && boucle,
      inactive: afficherInactif && impact === 'inactive',
      limited: afficherInactif && impact === 'limited',
      advanceOn: allowActivationAdvance || prochainDeclencheur === 'round' ? prochainDeclencheur : 'round',
      color: couleur,
      tintParticipant: !!couleur && teintePersonnage,
    };
  };

  const enregistrer = () => {
    const etat = construireEtat();
    if (!etat) return;
    onValider(etat);
  };

  const enregistrerTemplate = () => {
    const etat = construireEtat();
    if (!etat) return;
    const template = onSaveTemplate?.(etat);
    if (!template) return;
    setTemplateId(template.id);
    setTemplateMessage(t('templates.editor.saved', { name: template.name }));
  };

  const choisirCouleur = (value) => {
    setCouleur(value);
    if (!value) setTeintePersonnage(false);
  };

  const entete = onSaveTemplate ? (
    <div className="status-window-header">
      <button className="icon-btn tracker-template-save-btn" type="button" onClick={enregistrerTemplate} disabled={!peutEnregistrer} title={t('templates.editor.status.saveCurrent')} aria-label={t('templates.editor.status.saveCurrent')}>&#128190;</button>
      <h2>{t('status.add.title', { name: participant.name })}</h2>
      <button className="icon-btn" onClick={onFermer} aria-label={t('common.close')}>×</button>
    </div>
  ) : null;

  return (
    <Fenetre title={t('status.add.title', { name: participant.name })} onClose={onFermer} header={entete || undefined}>
      {statusTemplates.length > 0 && <div className="template-picker-row status-template-picker"><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{statusTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><button className="small-btn" type="button" onClick={appliquerTemplate}>{t('common.use')}</button></div>}
      <label className="field">
        {t('common.name')}
        <input value={nom} onChange={(event) => setNom(event.target.value)} autoFocus />
      </label>
      {nomSurpris && <p className="rule-warning">{t('status.surprised.warning')}</p>}
      {afficherInactif && <SelecteurImpactEtat value={impact} onChange={setImpact} />}
      <div className="field">
        {t('status.duration')}
        <div className="choice-row status-duration-row">
          {optionsDuree.map((option) => <button key={option.value} className={`choice ${duree === option.value ? 'selected' : ''}`} onClick={() => setDuree(option.value)}>{option.label}</button>)}
        </div>
      </div>
      {duree === 'custom' && <label className="field">{t('status.duration.customField')}<input type="number" inputMode="numeric" min="1" value={dureePersonnalisee} onChange={(event) => setDureePersonnalisee(event.target.value)} /></label>}
      <details className="advanced-options">
        <summary>{t('sheet.advancedOptions')}</summary>
        <label className="field">{t('status.color')}<select className={`status-color-select ${couleur ? `color-${couleur}` : 'color-none'}`} value={couleur} onChange={(event) => choisirCouleur(event.target.value)}><option value="">{t('status.color.none')}</option>{colors.map((color) => <option key={color} value={color}>{colorNames[color] || color}</option>)}</select></label>
        <label className={`limit-switch-row ${!couleur ? 'disabled' : ''}`}><span>{tintLabel}</span><input type="checkbox" checked={!!couleur && teintePersonnage} disabled={!couleur} onChange={(event) => setTeintePersonnage(event.target.checked)} /></label>
        {afficherChoixEvolution && <div className="field">{t('status.advance.field')}{allowActivationAdvance ? <div className="choice-row status-advance-row"><button className={`choice ${advanceOn === 'activation' ? 'selected' : ''}`} onClick={() => setAdvanceOn('activation')}>{t('status.advance.activation')}</button><button className={`choice ${advanceOn === 'round' ? 'selected' : ''}`} onClick={() => setAdvanceOn('round')}>{t('status.advance.roundStart')}</button></div> : <div className="fixed-rule-value">{t('status.advance.roundStart')}</div>}{!allowActivationAdvance && activationAdvanceNote && <p className="rule-option-note">{activationAdvanceNote}</p>}</div>}
      </details>
      {dureeFinie && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> {t('status.loop')}</label>}
      {templateMessage && <p className="export-feedback">{templateMessage}</p>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" onClick={enregistrer} disabled={!peutEnregistrer}>{modeEdition ? t('common.save') : t('common.add')}</button>
        <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
      </div>
    </Fenetre>
  );
}
