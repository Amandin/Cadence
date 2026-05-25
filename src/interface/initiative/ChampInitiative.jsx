import { composeInitiativeLabel, initiativeTextOrderEnabled, normalizeInitiativeTextOrder, splitInitiativeLabel } from '../../domain/initiativeTextOrder.js';

function valeurNumeriqueSaisie(value) {
  const text = String(value ?? '').replace(',', '.').replace(/[^\d.-]/g, '');
  const sign = text.startsWith('-') ? '-' : '';
  const unsigned = text.replace(/-/g, '');
  const [integer, ...decimals] = unsigned.split('.');
  return `${sign}${integer}${decimals.length ? `.${decimals.join('')}` : ''}`;
}

function ChampNumerique({ valeur, onChange, autoFocus = false, placeholder = '-', onKeyDown, ariaLabel }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      step="any"
      placeholder={placeholder}
      value={valeur ?? ''}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      onChange={(event) => onChange(valeurNumeriqueSaisie(event.target.value))}
    />
  );
}

function ChampLabels({ valeur, onChange, textConfig, autoFocus = false, onKeyDown }) {
  const config = normalizeInitiativeTextOrder(textConfig);
  const selection = splitInitiativeLabel(valeur, config);
  const changerPartie = (index, next) => {
    const parts = config.parts.map((_, position) => position === index ? next : (selection[position] || ''));
    onChange(composeInitiativeLabel(parts, config));
  };

  return (
    <div className="initiative-select-parts" onKeyDown={onKeyDown}>
      {config.parts.map((part, index) => (
        <label className="initiative-select-part" key={`${part.label}-${index}`}>
          <small>{part.label}</small>
          <select value={selection[index] || ''} onChange={(event) => changerPartie(index, event.target.value)} autoFocus={autoFocus && index === 0}>
            <option value="">-</option>
            {part.values.map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}

export function ChampInitiative({ label = '', valeur, onChange, textConfig, className = '', autoFocus = false, placeholder = '-', onKeyDown, ariaLabel }) {
  const content = initiativeTextOrderEnabled(textConfig)
    ? <ChampLabels valeur={valeur} onChange={onChange} textConfig={textConfig} autoFocus={autoFocus} onKeyDown={onKeyDown} />
    : <ChampNumerique valeur={valeur} onChange={onChange} autoFocus={autoFocus} placeholder={placeholder} onKeyDown={onKeyDown} ariaLabel={ariaLabel || label} />;

  if (!label) return content;
  return <label className={`field ${className}`.trim()}>{label}{content}</label>;
}
