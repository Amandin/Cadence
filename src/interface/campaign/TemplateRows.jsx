import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { uiGlyphs } from '../../uiAssets.js';

export function BoutonIconeTemplate({ label, children, className = '', ...props }) {
  return (
    <button className={`small-btn template-icon-btn ${className}`.trim()} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function LigneTemplateSimple({ template, detail, onEditer, onDupliquer, onSupprimer }) {
  const [suppressionVisible, setSuppressionVisible] = useState(false);
  return (
    <div className="restore-row hub-row template-row">
      <span className="template-row-main">
        <span className="template-title-with-action">
          <strong>{template.name}</strong>
          <BoutonIconeTemplate className="template-edit-icon" label={t('templates.actions.editAria', { name: template.name })} onClick={() => onEditer(template.id)}>{uiGlyphs.edit}</BoutonIconeTemplate>
        </span>
        <small>{detail}</small>
      </span>
      <div className="compact-arrows template-row-actions">
        <BoutonIconeTemplate label={t('templates.actions.duplicateAria', { name: template.name })} onClick={() => onDupliquer(template.id)}>{uiGlyphs.duplicate}</BoutonIconeTemplate>
        {suppressionVisible ? (
          <button className="danger-btn mini-danger template-delete-confirm" onClick={() => onSupprimer(template.id)}>{t('templates.actions.deleteShort')}</button>
        ) : (
          <button className="small-btn template-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={t('templates.actions.deleteRevealAria', { name: template.name })}>x</button>
        )}
      </div>
    </div>
  );
}

export function LigneTemplateSysteme({ template, detail }) {
  return <div className="restore-row hub-row template-row"><span className="template-row-main"><strong>{template.name}</strong><small>{detail}</small></span><span className="chip">{t('templates.actions.ruleManaged')}</span></div>;
}
