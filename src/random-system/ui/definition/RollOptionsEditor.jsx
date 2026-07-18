import { t } from '../../../i18n/index.js';
import { randomChoiceControlKinds } from '../../engine.js';
import { createResourceId } from '../../resourceIds.js';

function fallbackControl(choiceCount) {
  if (choiceCount === 2) return randomChoiceControlKinds.SWITCH;
  if (choiceCount <= 5) return randomChoiceControlKinds.SLIDER;
  return randomChoiceControlKinds.SELECT;
}

export function RollOptionsEditor({ options = [], onChange }) {
  const patchOption = (optionId, patch) => onChange(options.map((option) => (
    option.id === optionId ? { ...option, ...patch } : option
  )));
  const addOption = () => {
    const firstValue = createResourceId('answer', 'no');
    const secondValue = createResourceId('answer', 'yes');
    onChange([...options, {
      id: createResourceId('option'),
      label: t('random.definition.newRollOption'),
      control: randomChoiceControlKinds.SWITCH,
      defaultValue: firstValue,
      choices: [
        { value: firstValue, label: t('random.definition.answerNo') },
        { value: secondValue, label: t('random.definition.answerYes') },
      ],
    }]);
  };
  const addChoice = (option) => {
    const value = createResourceId('answer', `choice-${option.choices.length + 1}`);
    const choices = [...option.choices, {
      value,
      label: t('random.definition.combinationChoice', { index: option.choices.length + 1 }),
    }];
    patchOption(option.id, {
      choices,
      control: option.control === randomChoiceControlKinds.SWITCH
        ? fallbackControl(choices.length)
        : option.control,
    });
  };
  const removeChoice = (option, value) => {
    const choices = option.choices.filter((choice) => choice.value !== value);
    patchOption(option.id, {
      choices,
      defaultValue: option.defaultValue === value ? choices[0]?.value || '' : option.defaultValue,
      control: option.control === randomChoiceControlKinds.SWITCH && choices.length !== 2
        ? fallbackControl(choices.length)
        : option.control,
    });
  };

  return (
    <section className="rs-roll-options-editor">
      <div className="rs-subhead">
        <div>
          <h3>{t('random.definition.rollOptions')}</h3>
          <p className="muted compact-help">{t('random.definition.rollOptionsHelp')}</p>
        </div>
        <button type="button" className="small-btn" onClick={addOption}>{t('common.add')}</button>
      </div>
      {options.map((option, optionIndex) => (
        <div className="rs-roll-option" key={option.id}>
          <div className="rs-subhead">
            <h4>{t('random.definition.rollOption', { index: optionIndex + 1 })}</h4>
            <button
              type="button"
              className="small-btn subtle-danger"
              onClick={() => onChange(options.filter((item) => item.id !== option.id))}
            >
              {t('common.delete')}
            </button>
          </div>
          <div className="rs-editor-grid">
            <label className="field">
              {t('random.definition.optionName')}
              <input type="text" value={option.label} onChange={(event) => patchOption(option.id, { label: event.target.value })} />
            </label>
            <label className="field">
              {t('random.definition.choiceControl')}
              <select value={option.control} onChange={(event) => patchOption(option.id, { control: event.target.value })}>
                <option value={randomChoiceControlKinds.SWITCH} disabled={option.choices.length !== 2}>{t('random.definition.choiceControlSwitch')}</option>
                <option value={randomChoiceControlKinds.SLIDER}>{t('random.definition.choiceControlSlider')}</option>
                <option value={randomChoiceControlKinds.SELECT}>{t('random.definition.choiceControlSelect')}</option>
              </select>
            </label>
          </div>
          <div className="rs-roll-option-choices">
            {option.choices.map((choice) => (
              <div className="rs-roll-option-choice" key={choice.value}>
                <input
                  type="radio"
                  name={`default-roll-option-${option.id}`}
                  checked={option.defaultValue === choice.value}
                  onChange={() => patchOption(option.id, { defaultValue: choice.value })}
                  aria-label={t('random.definition.defaultChoice', { name: choice.label })}
                />
                <input
                  type="text"
                  aria-label={t('random.definition.choiceName')}
                  value={choice.label}
                  onChange={(event) => patchOption(option.id, {
                    choices: option.choices.map((item) => (
                      item.value === choice.value ? { ...item, label: event.target.value } : item
                    )),
                  })}
                />
                <button
                  type="button"
                  className="small-btn subtle-danger"
                  disabled={option.choices.length <= 2}
                  aria-label={t('random.definition.deleteChoice', { name: choice.label })}
                  onClick={() => removeChoice(option, choice.value)}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="small-btn" onClick={() => addChoice(option)}>{t('random.definition.addAnswer')}</button>
          </div>
        </div>
      ))}
    </section>
  );
}
