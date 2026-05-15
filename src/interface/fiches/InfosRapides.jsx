function valeurSembleVariable(valeur = '') {
  return /[0-9]|[+\-–]|\bd\d+/i.test(String(valeur));
}

function decomposerTexteInfoRapide(stat = '') {
  const texte = String(stat || '').trim();
  const separation = texte.match(/^(.*\S)\s+(\S+)$/);
  if (!separation) return { label: texte, value: '', editable: false };
  const [, label, value] = separation;
  return { label, value, editable: valeurSembleVariable(value) };
}

export function normaliserInfoRapide(stat = '') {
  if (typeof stat === 'object' && stat !== null && !Array.isArray(stat)) {
    return {
      label: String(stat.label || stat.titre || '').trim(),
      value: String(stat.value || stat.valeur || '').trim(),
      editable: !!stat.editable,
    };
  }
  return decomposerTexteInfoRapide(stat);
}

export function normaliserInfosRapides(stats = []) {
  return stats.map(normaliserInfoRapide).filter((info) => info.label || info.value);
}

export function serialiserInfosRapides(stats = []) {
  return normaliserInfosRapides(stats).map((info) => ({
    label: info.label,
    value: info.editable ? info.value : '',
    editable: !!info.editable,
  }));
}

function texteInfoRapide(info) {
  return [info.label, info.editable ? info.value : ''].filter(Boolean).join(' ');
}

export function InfosRapides({ stats = [], editable = false, onChanger }) {
  const infos = normaliserInfosRapides(stats);
  if (infos.length === 0) return null;

  return (
    <div className="quick-stats-inline" onClick={(event) => event.stopPropagation()}>
      {infos.map((info, index) => {
        if (!editable || !info.editable) {
          return <span className="chip quick-stat-chip" key={`${index}-${info.label}`}>{texteInfoRapide(info)}</span>;
        }
        return (
          <span className="quick-stat-editable" key={`${index}-${info.label}`}>
            <span className="quick-stat-title">{info.label}</span>
            <input
              value={info.value}
              aria-label={`Valeur de ${info.label}`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onChanger?.(index, { ...info, value: event.target.value })}
            />
          </span>
        );
      })}
    </div>
  );
}
