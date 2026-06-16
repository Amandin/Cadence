import { useState } from 'react';
import { normalizeGlobalTracker } from '../../domain/globalTracker.js';
import { clone, newTracker } from '../../logic.js';
import { t } from '../../i18n/index.js';
import { Fenetre, MessageChangementTemplate } from '../commun/ComposantsCommuns.jsx';
import { SelecteurImpactEtat } from '../commun/SelecteurImpactEtat.jsx';
import { EditeurSuivi } from '../fiches/FenetreEditionFiche.jsx';
import { EditeurSeuilsCompteurScene } from '../suivis/CompteurGlobal.jsx';

export function FenetreEditionTemplateSuivi({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const [nom, setNom] = useState(template?.name || t('templates.editor.tracker.defaultName'));
  const [brouillon, setBrouillon] = useState(() => clone(template?.tracker || newTracker('bar')));
  const valider = () => onValider(template.id, { ...brouillon, name: brouillon.name || nom || t('templates.editor.tracker.defaultName') }, nom || brouillon.name || t('templates.editor.tracker.defaultName'));

  return (
    <Fenetre title={t('templates.editor.tracker.title')} className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">{t('templates.editor.modelName')}<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <EditeurSuivi suivi={brouillon} onChange={setBrouillon} onDelete={onFermer} />
        <div className="grid2">
          <button className="primary" onClick={valider}>{t('common.confirm')}</button>
          <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreEditionTemplateEtat({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const status = template?.status || {};
  const [nomTemplate, setNomTemplate] = useState(template?.name || status.name || t('templates.editor.status.defaultName'));
  const [nom, setNom] = useState(status.name || t('templates.editor.status.defaultName'));
  const [duree, setDuree] = useState(status.duration == null ? '' : String(status.duration));
  const [boucle, setBoucle] = useState(!!status.loop);
  const [impact, setImpact] = useState(status.inactive ? 'inactive' : status.limited ? 'limited' : 'normal');
  const [advanceOn, setAdvanceOn] = useState(status.advanceOn === 'round' ? 'round' : 'activation');
  const dureeNettoyee = duree === '' ? null : Math.max(1, Number(duree) || 1);
  const valider = () => onValider(template.id, { id: 'template-status', name: nom || nomTemplate || t('templates.editor.status.defaultName'), duration: dureeNettoyee, remaining: dureeNettoyee, loop: dureeNettoyee !== null && boucle, inactive: impact === 'inactive', limited: impact === 'limited', advanceOn, expired: false }, nomTemplate || nom || t('templates.editor.status.defaultName'));

  return (
    <Fenetre title={t('templates.editor.status.title')} className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">{t('templates.editor.modelName')}<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">{t('templates.editor.status.name')}<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <label className="field">{t('templates.editor.status.duration')}<input type="number" inputMode="numeric" min="1" placeholder={t('templates.editor.status.durationPlaceholder')} value={duree} onChange={(event) => setDuree(event.target.value)} /></label>
        <SelecteurImpactEtat value={impact} onChange={setImpact} />
        <details className="advanced-options">
          <summary>{t('templates.editor.advanced')}</summary>
          <label className="field">{t('templates.editor.status.advance')}<select value={advanceOn} onChange={(event) => setAdvanceOn(event.target.value)}><option value="activation">{t('templates.editor.status.advance.activation')}</option><option value="round">{t('templates.editor.status.advance.round')}</option></select></label>
          {dureeNettoyee !== null && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> {t('templates.editor.status.loop')}</label>}
        </details>
        <div className="grid2">
          <button className="primary" onClick={valider}>{t('common.confirm')}</button>
          <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreEditionTemplateEtatScene({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const status = template?.status || {};
  const [nomTemplate, setNomTemplate] = useState(template?.name || status.name || t('templates.editor.sceneStatus.defaultName'));
  const [nom, setNom] = useState(status.name || t('templates.editor.sceneStatus.defaultName'));
  const [duree, setDuree] = useState(status.duration == null ? '' : String(status.duration));
  const [boucle, setBoucle] = useState(!!status.loop);
  const dureeNettoyee = duree === '' ? null : Math.max(1, Number(duree) || 1);
  const valider = () => onValider(template.id, {
    id: 'template-status',
    name: nom || nomTemplate || t('templates.editor.sceneStatus.defaultName'),
    duration: dureeNettoyee,
    remaining: dureeNettoyee,
    loop: dureeNettoyee !== null && boucle,
    inactive: false,
    limited: false,
    advanceOn: 'round',
    expired: false,
  }, nomTemplate || nom || t('templates.editor.sceneStatus.defaultName'));

  return (
    <Fenetre title={t('templates.editor.sceneStatus.title')} className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">{t('templates.editor.modelName')}<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">{t('templates.editor.status.name')}<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <label className="field">{t('templates.editor.status.duration')}<input type="number" inputMode="numeric" min="1" placeholder={t('templates.editor.status.durationPlaceholder')} value={duree} onChange={(event) => setDuree(event.target.value)} /></label>
        <details className="advanced-options">
          <summary>{t('templates.editor.advanced')}</summary>
          {dureeNettoyee !== null && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> {t('templates.editor.status.loop')}</label>}
        </details>
        <div className="grid2">
          <button className="primary" onClick={valider}>{t('common.confirm')}</button>
          <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function FenetreEditionTemplateCompteurScene({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const [nomTemplate, setNomTemplate] = useState(template?.name || template?.counter?.name || t('templates.editor.sceneCounter.defaultName'));
  const [brouillon, setBrouillon] = useState(() => normalizeGlobalTracker(template?.counter || { enabled: true, name: t('templates.editor.sceneCounter.defaultName'), mode: 'clock', current: 0, max: 6, auto: false, thresholds: [] }));
  const tempsReel = ['stopwatch', 'timer'].includes(brouillon.mode);
  const minutesMinuteur = Math.max(1, Math.round(Number(brouillon.max || 60) / 60));
  const modifier = (patch) => setBrouillon((courant) => normalizeGlobalTracker({ ...courant, ...patch }));
  const valider = () => onValider(template.id, { ...brouillon, name: brouillon.name || nomTemplate || t('templates.editor.sceneCounter.defaultName'), running: false, startedAt: null, elapsedMs: 0 }, nomTemplate || brouillon.name || t('templates.editor.sceneCounter.defaultName'));

  return (
    <Fenetre title={t('templates.editor.sceneCounter.title')} className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">{t('templates.editor.modelName')}<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">{t('templates.editor.sceneCounter.name')}<input value={brouillon.name || ''} onChange={(event) => modifier({ name: event.target.value })} /></label>
        <div className="grid2">
          <label className="field">{t('templates.editor.sceneCounter.type')}<select value={brouillon.mode || 'clock'} onChange={(event) => modifier({ mode: event.target.value, running: false, startedAt: null, elapsedMs: 0 })}><option value="clock">{t('dialogs.sceneIndicator.clock')}</option><option value="counter">{t('dialogs.sceneIndicator.counter')}</option><option value="stopwatch">{t('dialogs.sceneIndicator.stopwatch')}</option><option value="timer">{t('dialogs.sceneIndicator.timer')}</option></select></label>
          {!tempsReel && <label className="field">{t('templates.editor.sceneCounter.value')}<input type="number" inputMode="numeric" value={brouillon.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {brouillon.mode === 'timer' && <label className="field">{t('templates.editor.sceneCounter.durationMinutes')}<input type="number" inputMode="numeric" min="1" value={minutesMinuteur} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) * 60 })} /></label>}
        </div>
        {!tempsReel && <label className="field">{t('templates.editor.sceneCounter.max')}<input type="number" inputMode="numeric" min="1" value={brouillon.max ?? 6} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>}
        <details className="advanced-options">
          <summary>{t('templates.editor.advanced')}</summary>
          {!tempsReel && <label className="row"><input type="checkbox" checked={!!brouillon.auto} onChange={(event) => modifier({ auto: event.target.checked })} /> {t('templates.editor.sceneCounter.auto')}</label>}
          <EditeurSeuilsCompteurScene compteur={brouillon} onModifier={modifier} />
        </details>
        <div className="grid2">
          <button className="primary" onClick={valider}>{t('common.confirm')}</button>
          <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
        </div>
      </div>
    </Fenetre>
  );
}
