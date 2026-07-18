import { t } from '../../../i18n/index.js';
import { noCodeExampleCatalog } from '../../noCodeExamples.js';

export function NoCodeExamplePicker({ value, onChange, onApply }) {
  const selected = noCodeExampleCatalog.find((example) => example.id === value);
  return (
    <section className="rs-example-picker">
      <div>
        <strong>{t('random.definition.examplePicker')}</strong>
        <p>{t('random.definition.examplePickerHelp')}</p>
      </div>
      <div className="rs-example-picker-controls">
        <select aria-label={t('random.definition.examplePicker')} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{t('random.definition.exampleChoose')}</option>
          {noCodeExampleCatalog.map((example) => (
            <option value={example.id} key={example.id}>{example.name}</option>
          ))}
        </select>
        <button type="button" className="small-btn" disabled={!selected} onClick={() => onApply(selected.id)}>
          {t('random.definition.exampleApply')}
        </button>
      </div>
      {selected && <p className="rs-example-description">{selected.description}</p>}
    </section>
  );
}
