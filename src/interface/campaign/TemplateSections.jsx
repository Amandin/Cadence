import { trackerTypeLabels } from '../../constants.js';
import { t } from '../../i18n/index.js';
import { LigneTemplateSimple, LigneTemplateSysteme } from './TemplateRows.jsx';

function libelleDureeEtat(status = {}) {
  const impact = status.inactive
    ? t('templates.status.impact.inactive')
    : status.limited
      ? t('templates.status.impact.limited')
      : t('templates.status.impact.normal');
  const rythme = status.advanceOn === 'round'
    ? t('templates.status.advance.round')
    : t('templates.status.advance.activation');
  if (status.duration == null) return t('templates.status.summary.infinite', { impact });
  return t('templates.status.summary.duration', { impact, duration: status.duration, rythme });
}

function libelleCompteurScene(compteur = {}) {
  const mode = compteur.mode || 'clock';
  if (mode === 'timer') return t('templates.counterScene.timer', { minutes: Math.max(1, Math.round(Number(compteur.max || 60) / 60)) });
  if (mode === 'stopwatch') return t('templates.counterScene.stopwatch');
  if (mode === 'counter') return t('templates.counterScene.counter', { max: compteur.max || 10 });
  return t('templates.counterScene.clock', { segments: compteur.max || 6 });
}

export function OngletTemplatesSuivis({ templates, onAjouter, onEditer, onDupliquer, onSupprimer }) {
  return (
    <div className="stack">
      <div className="hub-section-head">
        <p className="muted compact-help">{t('templates.sections.suivis.help')}</p>
        <button className="small-btn" onClick={onAjouter}>{t('templates.sections.suivis.add')}</button>
      </div>
      {templates.length === 0 ? <div className="empty-section panel">{t('templates.sections.suivis.empty')}</div> : templates.map((template) => (
        <LigneTemplateSimple key={template.id} template={template} detail={trackerTypeLabels[template.tracker?.type] || t('templates.sections.suivis.detailFallback')} onEditer={onEditer} onDupliquer={onDupliquer} onSupprimer={onSupprimer} />
      ))}
    </div>
  );
}

export function OngletTemplatesEtats({ templates, onAjouter, onEditer, onDupliquer, onSupprimer }) {
  return (
    <div className="stack">
      <div className="hub-section-head">
        <p className="muted compact-help">{t('templates.sections.statuses.help')}</p>
        <button className="small-btn" onClick={onAjouter}>{t('templates.sections.statuses.add')}</button>
      </div>
      {templates.length === 0 ? <div className="empty-section panel">{t('templates.sections.statuses.empty')}</div> : templates.map((template) => template.id === 'status-template-surpris'
        ? <LigneTemplateSysteme key={template.id} template={template} detail={libelleDureeEtat(template.status)} />
        : <LigneTemplateSimple key={template.id} template={template} detail={libelleDureeEtat(template.status)} onEditer={onEditer} onDupliquer={onDupliquer} onSupprimer={onSupprimer} />)}
    </div>
  );
}

export function OngletTemplatesScene({ counterTemplates, statusTemplates, onAjouterCompteur, onEditerCompteur, onDupliquerCompteur, onSupprimerCompteur, onAjouterEtat, onEditerEtat, onDupliquerEtat, onSupprimerEtat }) {
  return (
    <div className="stack">
      <section className="scene-template-group">
        <div className="hub-section-head">
          <div>
            <h4>{t('templates.sections.sceneCounters.title')}</h4>
            <p className="muted compact-help">{t('templates.sections.sceneCounters.help')}</p>
          </div>
          <button className="small-btn" onClick={onAjouterCompteur}>{t('templates.sections.sceneCounters.add')}</button>
        </div>
        {counterTemplates.length === 0 ? <div className="empty-section panel">{t('templates.sections.sceneCounters.empty')}</div> : counterTemplates.map((template) => (
          <LigneTemplateSimple key={template.id} template={template} detail={libelleCompteurScene(template.counter)} onEditer={onEditerCompteur} onDupliquer={onDupliquerCompteur} onSupprimer={onSupprimerCompteur} />
        ))}
      </section>
      <section className="scene-template-group">
        <div className="hub-section-head">
          <div>
            <h4>{t('templates.sections.sceneStatuses.title')}</h4>
            <p className="muted compact-help">{t('templates.sections.sceneStatuses.help')}</p>
          </div>
          <button className="small-btn" onClick={onAjouterEtat}>{t('templates.sections.sceneStatuses.add')}</button>
        </div>
        {statusTemplates.length === 0 ? <div className="empty-section panel">{t('templates.sections.sceneStatuses.empty')}</div> : statusTemplates.map((template) => (
          <LigneTemplateSimple key={template.id} template={template} detail={libelleDureeEtat(template.status)} onEditer={onEditerEtat} onDupliquer={onDupliquerEtat} onSupprimer={onSupprimerEtat} />
        ))}
      </section>
    </div>
  );
}
