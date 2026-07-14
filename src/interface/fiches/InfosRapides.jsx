import { t } from '../../i18n/index.js';
import { IconeJetDes } from '../icones/IconeJetDes.jsx';

function valeurSembleVariable(valeur = '') {
  return /^[+\-−]?\d+(?:[.,]\d+)?$/.test(String(valeur).trim());
}

function decomposerTexteInfoRapide(stat = '') {
  const texte = String(stat || '').trim();
  const separation = texte.match(/^(.*\S)\s+(\S+)$/);
  if (!separation) return { label: texte, value: '', editable: false };
  const [, label, value] = separation;
  if (!valeurSembleVariable(value)) return { label: texte, value: '', editable: false };
  return { label, value, editable: true };
}

export function normaliserInfoRapide(stat = '') {
  if (typeof stat === 'object' && stat !== null && !Array.isArray(stat)) {
    return {
      label: String(stat.label || stat.titre || '').trim(),
      value: String(stat.value || stat.valeur || '').trim(),
      editable: !!stat.editable,
      quickRollEnabled: !!stat.quickRollEnabled && !!stat.quickRollDefinitionId,
      quickRollDefinitionId: String(stat.quickRollDefinitionId || '').trim(),
      quickRollParameters: stat.quickRollParameters && typeof stat.quickRollParameters === 'object' ? { ...stat.quickRollParameters } : {},
      quickRollOptions: stat.quickRollOptions && typeof stat.quickRollOptions === 'object' ? { ...stat.quickRollOptions } : {},
    };
  }
  return decomposerTexteInfoRapide(stat);
}

export function normaliserInfosRapides(stats = []) {
  return stats.map(normaliserInfoRapide).filter((info) => info.label || info.value);
}

export function serialiserInfosRapides(stats = []) {
  return normaliserInfosRapides(stats).map((info) => {
    const quickRoll = info.quickRollEnabled && info.quickRollDefinitionId ? { quickRollEnabled: true, quickRollDefinitionId: info.quickRollDefinitionId, quickRollParameters: { ...(info.quickRollParameters || {}) }, quickRollOptions: { ...(info.quickRollOptions || {}) } } : {};
    if (!info.editable) return { label: [info.label, info.value].filter(Boolean).join(' '), value: '', editable: false, ...quickRoll };
    return { label: info.label, value: info.value, editable: true, ...quickRoll };
  });
}

function texteInfoRapide(info) {
  return [info.label, info.editable ? info.value : ''].filter(Boolean).join(' ');
}

export function InfosRapides({ stats = [], editable = false, onChanger, onLancerJetRapide }) {
  const infos = normaliserInfosRapides(stats);
  if (infos.length === 0) return null;

  return (
    <div className="quick-stats-inline" onClick={(event) => event.stopPropagation()}>
      {infos.map((info, index) => {
        const peutLancer = info.quickRollEnabled && info.quickRollDefinitionId && onLancerJetRapide;
        if (peutLancer) return <button className="chip quick-stat-chip quick-stat-roll-trigger" type="button" key={`${index}-${info.label}`} onClick={() => onLancerJetRapide(info)}>{texteInfoRapide(info)}<IconeJetDes /></button>;
        if (!editable || !info.editable) {
          return <span className="chip quick-stat-chip" key={`${index}-${info.label}`}>{texteInfoRapide(info)}</span>;
        }
        return (
          <span className="quick-stat-editable" key={`${index}-${info.label}`}>
            <span className="quick-stat-title">{info.label}</span>
            <input
              value={info.value}
              aria-label={t('quickStats.valueOf', { label: info.label })}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onChanger?.(index, { ...info, value: event.target.value })}
            />
          </span>
        );
      })}
    </div>
  );
}
