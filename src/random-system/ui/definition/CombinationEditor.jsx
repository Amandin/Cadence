import { t } from '../../../i18n/index.js';
import { uiSymbols } from '../../../uiAssets.js';
import { randomChoiceControlKinds, randomDefinitionKinds } from '../../engine.js';
import { createResourceId } from '../../resourceIds.js';

export function CombinationEditor({
  combination,
  definitions,
  currentDefinitionId,
  onChange,
}) {
  const availableDefinitions = definitions.filter(
    (definition) => (
      definition.id !== currentDefinitionId
      && definition.kind === randomDefinitionKinds.ROLL
    ),
  );
  const patchChoice = (choiceId, patch) => onChange({
    choices: combination.choices.map((choice) => (
      choice.id === choiceId ? { ...choice, ...patch } : choice
    )),
  });
  const addChoice = () => {
    const choice = {
      id: createResourceId('choice'),
      label: t('random.definition.combinationChoice', { index: combination.choices.length + 1 }),
      definitionId: availableDefinitions[0]?.id || '',
    };
    onChange({
      control: combination.control === randomChoiceControlKinds.SWITCH
        ? randomChoiceControlKinds.SLIDER
        : combination.control,
      defaultChoiceId: combination.defaultChoiceId || combination.choices[0]?.id || choice.id,
      choices: [...combination.choices, choice],
    });
  };
  const moveChoice = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= combination.choices.length) return;
    const choices = [...combination.choices];
    [choices[index], choices[targetIndex]] = [choices[targetIndex], choices[index]];
    onChange({ choices });
  };
  const removeChoice = (choiceId) => {
    const choices = combination.choices.filter((choice) => choice.id !== choiceId);
    onChange({
      choices,
      defaultChoiceId: combination.defaultChoiceId === choiceId
        ? choices[0]?.id || ''
        : combination.defaultChoiceId,
    });
  };

  return (
    <section className="rs-combination-editor">
      <div className="rs-combination-settings">
        <label className="field">
          {t('random.definition.optionName')}
          <input type="text" value={combination.label} onChange={(event) => onChange({ label: event.target.value })} />
        </label>
        <label className="field">
          {t('random.definition.choiceControl')}
          <select value={combination.control || randomChoiceControlKinds.SLIDER} onChange={(event) => onChange({ control: event.target.value })}>
            <option value={randomChoiceControlKinds.SWITCH} disabled={combination.choices.length !== 2}>{t('random.definition.choiceControlSwitch')}</option>
            <option value={randomChoiceControlKinds.SLIDER}>{t('random.definition.choiceControlSlider')}</option>
            <option value={randomChoiceControlKinds.SELECT}>{t('random.definition.choiceControlSelect')}</option>
          </select>
        </label>
      </div>
      <div className="rs-subhead">
        <h4>{t('random.definition.combinationChoices')}</h4>
        <button type="button" className="small-btn" onClick={addChoice}>{t('common.add')}</button>
      </div>
      {combination.choices.map((choice, index) => (
        <div className="rs-combination-choice" key={choice.id}>
          <div className="rs-combination-choice-name">
            <input
              type="radio"
              name={`default-choice-${currentDefinitionId}`}
              checked={combination.defaultChoiceId === choice.id}
              onChange={() => onChange({ defaultChoiceId: choice.id })}
              aria-label={t('random.definition.defaultChoice', { name: choice.label })}
              title={t('random.definition.defaultChoice', { name: choice.label })}
            />
            <input type="text" value={choice.label} aria-label={t('random.definition.choiceName')} onChange={(event) => patchChoice(choice.id, { label: event.target.value })} />
            <button
              type="button"
              className="small-btn"
              disabled={combination.choices.length <= 1}
              onClick={() => removeChoice(choice.id)}
              aria-label={t('random.definition.deleteChoice', { name: choice.label })}
            >
              ×
            </button>
          </div>
          <div className="rs-combination-choice-roll">
            <label>
              {t('random.definition.associatedRoll')}
              <select
                value={choice.definitionId || ''}
                onChange={(event) => patchChoice(choice.id, { definitionId: event.target.value })}
              >
                {!choice.definitionId && <option value="">{t('random.definition.chooseRoll')}</option>}
                {availableDefinitions.map((definition) => (
                  <option value={definition.id} key={definition.id}>{definition.name}</option>
                ))}
              </select>
            </label>
            <div className="rs-combination-choice-actions">
            <button type="button" className="small-btn" disabled={index === 0} onClick={() => moveChoice(index, -1)} aria-label={t('random.definition.moveChoiceUp', { name: choice.label })}>{uiSymbols.moveUp}</button>
            <button type="button" className="small-btn" disabled={index === combination.choices.length - 1} onClick={() => moveChoice(index, 1)} aria-label={t('random.definition.moveChoiceDown', { name: choice.label })}>{uiSymbols.moveDown}</button>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
