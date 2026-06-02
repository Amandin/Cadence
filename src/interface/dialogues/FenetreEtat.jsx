import { useEffect, useState } from 'react';
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
  { label: 'Perso', value: 'custom' },
];

export function FenetreEtat({ participant, onFermer, onValider, defaultAdvanceOn = 'activation', afficherChoixEvolution = true, afficherInactif = true, statusTemplates = [] }) {
  const [nom, setNom] = useState('Nouveau');
  const [duree, setDuree] = useState('infinite');
  const [dureePersonnalisee, setDureePersonnalisee] = useState('8');
  const [boucle, setBoucle] = useState(false);
  const [impact, setImpact] = useState('normal');
  const [advanceOn, setAdvanceOn] = useState(defaultAdvanceOn === 'round' ? 'round' : 'activation');
  const [templateId, setTemplateId] = useState(statusTemplates[0]?.id || '');

  useEffect(() => {
    if (!templateId && statusTemplates[0]?.id) setTemplateId(statusTemplates[0].id);
    if (templateId && !statusTemplates.some((template) => template.id === templateId)) setTemplateId(statusTemplates[0]?.id || '');
  }, [statusTemplates, templateId]);

  const dureeFinie = duree !== 'infinite';
  const valeurDuree = duree === 'custom' ? Number(dureePersonnalisee) : Number(duree);
  const dureeValide = !dureeFinie || (Number.isFinite(valeurDuree) && valeurDuree >= 1);
  const peutEnregistrer = nom.trim() && dureeValide;
  const appliquerTemplate = () => {
    const template = statusTemplates.find((item) => item.id === templateId);
    const status = template?.status;
    if (!status) return;
    setNom(status.name || template.name || 'Etat');
    setDuree(status.duration == null ? 'infinite' : 'custom');
    setDureePersonnalisee(String(status.duration || 1));
    setBoucle(!!status.loop);
    setImpact(afficherInactif && status.inactive ? 'inactive' : afficherInactif && status.limited ? 'limited' : 'normal');
    setAdvanceOn(afficherChoixEvolution ? (status.advanceOn === 'round' ? 'round' : 'activation') : defaultAdvanceOn);
  };

  const enregistrer = () => {
    const nomNettoye = nom.trim();
    if (!nomNettoye || !dureeValide) return;
    onValider({ name: nomNettoye, duration: dureeFinie ? valeurDuree : null, loop: dureeFinie && boucle, inactive: afficherInactif && impact === 'inactive', limited: afficherInactif && impact === 'limited', advanceOn: afficherChoixEvolution ? advanceOn : defaultAdvanceOn });
  };

  return (
    <Fenetre title={`Ajouter un état · ${participant.name}`} onClose={onFermer}>
      {statusTemplates.length > 0 && <div className="template-picker-row status-template-picker"><select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{statusTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><button className="small-btn" type="button" onClick={appliquerTemplate}>Utiliser</button></div>}
      <label className="field">
        Nom
        <input value={nom} onChange={(event) => setNom(event.target.value)} autoFocus />
      </label>
      {afficherInactif && <SelecteurImpactEtat value={impact} onChange={setImpact} />}
      <div className="field">
        Durée
        <div className="choice-row status-duration-row">
          {optionsDuree.map((option) => <button key={option.value} className={`choice ${duree === option.value ? 'selected' : ''}`} onClick={() => setDuree(option.value)}>{option.label}</button>)}
        </div>
      </div>
      {duree === 'custom' && <label className="field">Durée personnalisée<input type="number" inputMode="numeric" min="1" value={dureePersonnalisee} onChange={(event) => setDureePersonnalisee(event.target.value)} /></label>}
      {afficherChoixEvolution && <div className="field">Evolution<div className="choice-row status-advance-row"><button className={`choice ${advanceOn === 'activation' ? 'selected' : ''}`} onClick={() => setAdvanceOn('activation')}>Activation</button><button className={`choice ${advanceOn === 'round' ? 'selected' : ''}`} onClick={() => setAdvanceOn('round')}>Début du round</button></div></div>}
      {dureeFinie && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> renouveler en boucle</label>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" onClick={enregistrer} disabled={!peutEnregistrer}>Ajouter</button>
        <button className="small-btn" onClick={onFermer}>Annuler</button>
      </div>
    </Fenetre>
  );
}
