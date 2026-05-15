function decomposerInfoRapide(stat = '') {
  const texte = String(stat || '').trim();
  const separation = texte.match(/^(.*\S)\s+(\S+)$/);
  if (!separation) return { titre: texte, valeur: '' };
  return { titre: separation[1], valeur: separation[2] };
}

function recomposerInfoRapide(titre, valeur) {
  const titreNettoye = String(titre || '').trim();
  const valeurNettoyee = String(valeur || '').trim();
  return [titreNettoye, valeurNettoyee].filter(Boolean).join(' ');
}

export function InfosRapidesEditables({ stats = [], onChanger }) {
  const infos = stats.map((stat, index) => ({ index, brut: stat, ...decomposerInfoRapide(stat) })).filter((info) => info.titre || info.valeur);
  if (infos.length === 0) return null;

  return (
    <div className="quick-stats-inline" onClick={(event) => event.stopPropagation()}>
      {infos.map((info) => (
        <span className="quick-stat-editable" key={`${info.index}-${info.titre}`}>
          <span className="quick-stat-title">{info.titre}</span>
          <input
            value={info.valeur}
            aria-label={`Valeur de ${info.titre}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onChanger?.(info.index, recomposerInfoRapide(info.titre, event.target.value))}
          />
        </span>
      ))}
    </div>
  );
}
