import { t } from '../../i18n/index.js';

export function OutcomeDetailEditor({
  title,
  help,
  selectorLabel,
  selectorValue,
  selectorOptions,
  onSelect,
  nameLabel,
  nameValue,
  onNameChange,
  namePlaceholder = '',
  valueLabel = '',
  valueValue = '',
  onValueChange = null,
  valuePlaceholder = '',
  weightLabel = '',
  weightValue = '',
  onWeightChange = null,
  symbolValue = '',
  onSymbolChange,
  imageValue = '',
  onImageChange,
  textValue = '',
  onTextChange,
}) {
  return (
    <section className="rs-source-details-editor">
      <div className="rs-subhead">
        <div>
          <h3>{title}</h3>
          {help && <span>{help}</span>}
        </div>
      </div>
      <label className="field">
        {selectorLabel}
        <select value={selectorValue} onChange={(event) => onSelect(event.target.value)}>
          {selectorOptions.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="rs-source-detail-grid">
        <label className="field">
          {nameLabel}
          <input
            type="text"
            value={nameValue}
            placeholder={namePlaceholder}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>
        {onWeightChange && (
          <label className="field">
            {weightLabel}
            <input
              type="number"
              min="0.000001"
              step="any"
              value={weightValue}
              onChange={(event) => onWeightChange(event.target.value)}
            />
          </label>
        )}
        {onValueChange && (
          <label className="field">
            {valueLabel}
            <input
              type="text"
              value={valueValue}
              placeholder={valuePlaceholder}
              onChange={(event) => onValueChange(event.target.value)}
            />
          </label>
        )}
      </div>
      <div className="rs-card-visual-fields">
        <label className="field">
          {t('random.source.outcomeSymbol')}
          <input
            type="text"
            maxLength="24"
            value={symbolValue}
            onChange={(event) => onSymbolChange(event.target.value)}
          />
        </label>
        <label className="field">
          {t('random.source.outcomeImage')}
          <input
            type="url"
            value={imageValue}
            placeholder="https://..."
            onChange={(event) => onImageChange(event.target.value)}
          />
        </label>
      </div>
      <label className="field">
        {t('random.source.outcomeText')}
        <textarea
          rows="5"
          value={textValue}
          onChange={(event) => onTextChange(event.target.value)}
        />
      </label>
    </section>
  );
}
