import { useState } from 'react';
import { normalizeGlobalTracker } from '../../domain/globalTracker.js';
import { clone, newTracker } from '../../logic.js';
import { Fenetre, MessageChangementTemplate } from '../commun/ComposantsCommuns.jsx';
import { SelecteurImpactEtat } from '../commun/SelecteurImpactEtat.jsx';
import { EditeurSuivi } from '../fiches/FenetreEditionFiche.jsx';
import { EditeurSeuilsCompteurScene } from '../suivis/CompteurGlobal.jsx';

export function FenetreEditionTemplateSuivi({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const [nom, setNom] = useState(template?.name || 'Indicateur');
  const [brouillon, setBrouillon] = useState(() => clone(template?.tracker || newTracker('bar')));
  const valider = () => onValider(template.id, { ...brouillon, name: brouillon.name || nom || 'Indicateur' }, nom || brouillon.name || 'Indicateur');

  return (
    <Fenetre title="Modèle d’indicateur" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du modèle<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
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
  const [nomTemplate, setNomTemplate] = useState(template?.name || status.name || 'État');
  const [nom, setNom] = useState(status.name || 'État');
  const [duree, setDuree] = useState(status.duration == null ? '' : String(status.duration));
  const [boucle, setBoucle] = useState(!!status.loop);
  const [impact, setImpact] = useState(status.inactive ? 'inactive' : status.limited ? 'limited' : 'normal');
  const [advanceOn, setAdvanceOn] = useState(status.advanceOn === 'round' ? 'round' : 'activation');
  const dureeNettoyee = duree === '' ? null : Math.max(1, Number(duree) || 1);
  const valider = () => onValider(template.id, { id: 'template-status', name: nom || nomTemplate || 'État', duration: dureeNettoyee, remaining: dureeNettoyee, loop: dureeNettoyee !== null && boucle, inactive: impact === 'inactive', limited: impact === 'limited', advanceOn, expired: false }, nomTemplate || nom || 'État');

  return (
    <Fenetre title="Modèle d’état" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du modèle<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom de l’état<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <label className="field">Durée<input type="number" inputMode="numeric" min="1" placeholder="illimitée" value={duree} onChange={(event) => setDuree(event.target.value)} /></label>
        <SelecteurImpactEtat value={impact} onChange={setImpact} />
        <details className="advanced-options">
          <summary>Options avancées</summary>
          <label className="field">Évolution<select value={advanceOn} onChange={(event) => setAdvanceOn(event.target.value)}><option value="activation">Activation</option><option value="round">Début du round</option></select></label>
          {dureeNettoyee !== null && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> renouveler en boucle</label>}
        </details>
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
  const [nomTemplate, setNomTemplate] = useState(template?.name || status.name || 'État de scène');
  const [nom, setNom] = useState(status.name || 'État de scène');
  const [duree, setDuree] = useState(status.duration == null ? '' : String(status.duration));
  const [boucle, setBoucle] = useState(!!status.loop);
  const dureeNettoyee = duree === '' ? null : Math.max(1, Number(duree) || 1);
  const valider = () => onValider(template.id, {
    id: 'template-status',
    name: nom || nomTemplate || 'État de scène',
    duration: dureeNettoyee,
    remaining: dureeNettoyee,
    loop: dureeNettoyee !== null && boucle,
    inactive: false,
    limited: false,
    advanceOn: 'round',
    expired: false,
  }, nomTemplate || nom || 'État de scène');

  return (
    <Fenetre title="Modèle d’état de scène" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du modèle<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom de l’état<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <label className="field">Durée<input type="number" inputMode="numeric" min="1" placeholder="illimitée" value={duree} onChange={(event) => setDuree(event.target.value)} /></label>
        <details className="advanced-options">
          <summary>Options avancées</summary>
          {dureeNettoyee !== null && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> renouveler en boucle</label>}
        </details>
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreEditionTemplateCompteurScene({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const [nomTemplate, setNomTemplate] = useState(template?.name || template?.counter?.name || 'Indicateur de scène');
  const [brouillon, setBrouillon] = useState(() => normalizeGlobalTracker(template?.counter || { enabled: true, name: 'Indicateur de scène', mode: 'clock', current: 0, max: 6, auto: false, thresholds: [] }));
  const tempsReel = ['stopwatch', 'timer'].includes(brouillon.mode);
  const minutesMinuteur = Math.max(1, Math.round(Number(brouillon.max || 60) / 60));
  const modifier = (patch) => setBrouillon((courant) => normalizeGlobalTracker({ ...courant, ...patch }));
  const valider = () => onValider(template.id, { ...brouillon, name: brouillon.name || nomTemplate || 'Indicateur de scène', running: false, startedAt: null, elapsedMs: 0 }, nomTemplate || brouillon.name || 'Indicateur de scène');

  return (
    <Fenetre title="Modèle d’indicateur de scène" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du modèle<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom de l’indicateur<input value={brouillon.name || ''} onChange={(event) => modifier({ name: event.target.value })} /></label>
        <div className="grid2">
          <label className="field">Type<select value={brouillon.mode || 'clock'} onChange={(event) => modifier({ mode: event.target.value, running: false, startedAt: null, elapsedMs: 0 })}><option value="clock">Horloge</option><option value="counter">Compteur</option><option value="stopwatch">Chronomètre</option><option value="timer">Minuteur</option></select></label>
          {!tempsReel && <label className="field">Valeur<input type="number" inputMode="numeric" value={brouillon.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {brouillon.mode === 'timer' && <label className="field">Durée minutes<input type="number" inputMode="numeric" min="1" value={minutesMinuteur} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) * 60 })} /></label>}
        </div>
        {!tempsReel && <label className="field">Maximum<input type="number" inputMode="numeric" min="1" value={brouillon.max ?? 6} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>}
        <details className="advanced-options">
          <summary>Options avancées</summary>
          {!tempsReel && <label className="row"><input type="checkbox" checked={!!brouillon.auto} onChange={(event) => modifier({ auto: event.target.checked })} /> avancer automatiquement à chaque nouveau round</label>}
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
