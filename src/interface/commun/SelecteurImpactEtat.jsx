const impacts = [
  { value: 'normal', label: 'Normal' },
  { value: 'limited', label: 'Limité' },
  { value: 'inactive', label: 'Inactif' },
];

export function SelecteurImpactEtat({ value = 'normal', onChange }) {
  const index = Math.max(0, impacts.findIndex((impact) => impact.value === value));
  return (
    <div className="field status-impact-field">
      Impact sur le personnage
      <div className="status-impact-selector">
        <input type="range" min="0" max="2" step="1" value={index} onChange={(event) => onChange(impacts[Number(event.target.value)]?.value || 'normal')} />
        <div className="status-impact-labels">
          {impacts.map((impact) => <button className={value === impact.value ? 'active' : ''} key={impact.value} type="button" onClick={() => onChange(impact.value)}>{impact.label}</button>)}
        </div>
      </div>
    </div>
  );
}
