import { randomChoiceControlKinds } from '../engine.js';

export function choiceControlKind(choiceCount, preferred = randomChoiceControlKinds.AUTO) {
  if (choiceCount <= 1) return 'hidden';
  if (preferred === randomChoiceControlKinds.SWITCH && choiceCount === 2) return 'switch';
  if (preferred === randomChoiceControlKinds.SLIDER) return 'slider';
  if (preferred === randomChoiceControlKinds.SELECT) return 'select';
  if (choiceCount === 2) return 'switch';
  if (choiceCount <= 5) return 'slider';
  return 'select';
}

export function ChoiceOptionControl({ option, value, onChange }) {
  const kind = choiceControlKind(option.choices.length, option.control);
  const selectedIndex = Math.max(0, option.choices.findIndex((choice) => choice.value === value));
  if (kind === 'hidden') return null;
  if (kind === 'switch') {
    return (
      <fieldset className="rs-choice-control rs-choice-switch">
        <legend>{option.label}</legend>
        <span className={selectedIndex === 0 ? 'selected' : ''}>{option.choices[0].label}</span>
        <input
          type="checkbox"
          checked={selectedIndex === 1}
          onChange={(event) => onChange(option.choices[event.target.checked ? 1 : 0].value)}
          aria-label={option.label}
        />
        <span className={selectedIndex === 1 ? 'selected' : ''}>{option.choices[1].label}</span>
      </fieldset>
    );
  }
  if (kind === 'slider') {
    return (
      <fieldset className="rs-choice-control rs-choice-slider">
        <legend>{option.label}</legend>
        <output>{option.choices[selectedIndex].label}</output>
        <input
          type="range"
          min="0"
          max={option.choices.length - 1}
          step="1"
          value={selectedIndex}
          onChange={(event) => onChange(option.choices[Number(event.target.value)].value)}
          aria-label={option.label}
        />
        <div>
          {option.choices.map((choice, index) => <span className={index === selectedIndex ? 'selected' : ''} key={choice.value}>{choice.label}</span>)}
        </div>
      </fieldset>
    );
  }
  return (
    <label className="field">
      {option.label}
      <select value={selectedIndex} onChange={(event) => onChange(option.choices[Number(event.target.value)].value)}>
        {option.choices.map((choice, index) => <option value={index} key={choice.value}>{choice.label}</option>)}
      </select>
    </label>
  );
}
