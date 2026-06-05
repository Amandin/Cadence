import { useState } from 'react';
import { normalizeGlobalTracker } from '../../domain/globalTracker.js';
import { clone, newTracker } from '../../logic.js';
import { Fenetre, MessageChangementTemplate } from '../commun/ComposantsCommuns.jsx';
import { SelecteurImpactEtat } from '../commun/SelecteurImpactEtat.jsx';
import { EditeurSuivi } from '../fiches/FenetreEditionFiche.jsx';
import { EditeurSeuilsCompteurScene } from '../suivis/CompteurGlobal.jsx';

export function FenetreEditionTemplateSuivi({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const [nom, setNom] = useState(template?.name || 'Suivi');
  const [brouillon, setBrouillon] = useState(() => clone(template?.tracker || newTracker('bar')));
  const valider = () => onValider(template.id, { ...brouillon, name: brouillon.name || nom || 'Suivi' }, nom || brouillon.name || 'Suivi');

  return (
    <Fenetre title="Template de suivi" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du template<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <EditeurSuivi suivi={brouillon} onChange={setBrouillon} onDelete={onFermer} />
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreEditionTemplateEtat({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const status = template?.status || {};
  const [nomTemplate, setNomTemplate] = useState(template?.name || status.name || 'Etat');
  const [nom, setNom] = useState(status.name || 'Etat');
  const [duree, setDuree] = useState(status.duration == null ? '' : String(status.duration));
  const [boucle, setBoucle] = useState(!!status.loop);
  const [impact, setImpact] = useState(status.inactive ? 'inactive' : status.limited ? 'limited' : 'normal');
  const [advanceOn, setAdvanceOn] = useState(status.advanceOn === 'round' ? 'round' : 'activation');
  const dureeNettoyee = duree === '' ? null : Math.max(1, Number(duree) || 1);
  const valider = () => onValider(template.id, { id: 'template-status', name: nom || nomTemplate || 'Etat', duration: dureeNettoyee, remaining: dureeNettoyee, loop: dureeNettoyee !== null && boucle, inactive: impact === 'inactive', limited: impact === 'limited', advanceOn, expired: false }, nomTemplate || nom || 'Etat');

  return (
    <Fenetre title="Template d'etat" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du template<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom de l'etat<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <div className="grid2">
          <label className="field">Duree<input type="number" inputMode="numeric" min="1" placeholder="illimitee" value={duree} onChange={(event) => setDuree(event.target.value)} /></label>
          <label className="field">Evolution<select value={advanceOn} onChange={(event) => setAdvanceOn(event.target.value)}><option value="activation">Activation</option><option value="round">DÃ©but du round</option></select></label>
        </div>
        <SelecteurImpactEtat value={impact} onChange={setImpact} />
        {dureeNettoyee !== null && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> renouveler en boucle</label>}
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreEditionTemplateEtatScene({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const status = template?.status || {};
  const [nomTemplate, setNomTemplate] = useState(template?.name || status.name || 'Etat de scene');
  const [nom, setNom] = useState(status.name || 'Etat de scene');
  const [duree, setDuree] = useState(status.duration == null ? '' : String(status.duration));
  const [boucle, setBoucle] = useState(!!status.loop);
  const dureeNettoyee = duree === '' ? null : Math.max(1, Number(duree) || 1);
  const valider = () => onValider(template.id, {
    id: 'template-status',
    name: nom || nomTemplate || 'Etat de scene',
    duration: dureeNettoyee,
    remaining: dureeNettoyee,
    loop: dureeNettoyee !== null && boucle,
    inactive: false,
    limited: false,
    advanceOn: 'round',
    expired: false,
  }, nomTemplate || nom || 'Etat de scene');

  return (
    <Fenetre title="Template d'etat de scene" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du template<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom de l'etat<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <label className="field">Duree<input type="number" inputMode="numeric" min="1" placeholder="illimitee" value={duree} onChange={(event) => setDuree(event.target.value)} /></label>
        {dureeNettoyee !== null && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> renouveler en boucle</label>}
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreEditionTemplateCompteurScene({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const [nomTemplate, setNomTemplate] = useState(template?.name || template?.counter?.name || 'Suivi global');
  const [brouillon, setBrouillon] = useState(() => normalizeGlobalTracker(template?.counter || { enabled: true, name: 'Suivi global', mode: 'clock', current: 0, max: 6, auto: false, thresholds: [] }));
  const tempsReel = ['stopwatch', 'timer'].includes(brouillon.mode);
  const minutesMinuteur = Math.max(1, Math.round(Number(brouillon.max || 60) / 60));
  const modifier = (patch) => setBrouillon((courant) => normalizeGlobalTracker({ ...courant, ...patch }));
  const valider = () => onValider(template.id, { ...brouillon, name: brouillon.name || nomTemplate || 'Suivi global', running: false, startedAt: null, elapsedMs: 0 }, nomTemplate || brouillon.name || 'Suivi global');

  return (
    <Fenetre title="Template de suivi global" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du template<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom du compteur<input value={brouillon.name || ''} onChange={(event) => modifier({ name: event.target.value })} /></label>
        <div className="grid2">
          <label className="field">Type<select value={brouillon.mode || 'clock'} onChange={(event) => modifier({ mode: event.target.value, running: false, startedAt: null, elapsedMs: 0 })}><option value="clock">Horloge</option><option value="counter">Compteur</option><option value="stopwatch">Chronometre</option><option value="timer">Minuteur</option></select></label>
          {!tempsReel && <label className="field">Valeur<input type="number" inputMode="numeric" value={brouillon.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {brouillon.mode === 'timer' && <label className="field">Duree minutes<input type="number" inputMode="numeric" min="1" value={minutesMinuteur} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) * 60 })} /></label>}
        </div>
        {!tempsReel && <label className="field">Maximum<input type="number" inputMode="numeric" min="1" value={brouillon.max ?? 6} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>}
        {!tempsReel && <label className="row"><input type="checkbox" checked={!!brouillon.auto} onChange={(event) => modifier({ auto: event.target.checked })} /> avance automatiquement a chaque nouveau round</label>}
        <details className="advanced-options" open>
          <summary>Seuils</summary>
          <EditeurSeuilsCompteurScene compteur={brouillon} onModifier={modifier} />
        </details>
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}
