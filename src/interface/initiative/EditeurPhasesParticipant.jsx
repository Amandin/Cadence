import { defaultPhaseCount } from '../../constants.js';

export function clesPhases(phaseCount = defaultPhaseCount) {
  return Array.from({ length: Math.max(1, Math.min(20, Number(phaseCount) || defaultPhaseCount)) }, (_, index) => String(index + 1));
}

export function normaliserPhaseActions(values = [], phaseCount = defaultPhaseCount) {
  const autorisees = new Set(clesPhases(phaseCount));
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value)).filter((value) => autorisees.has(value)))];
}

export function EditeurPhasesParticipant({ phaseActions = [], phaseCount = defaultPhaseCount, onChange }) {
  const valeurs = new Set(normaliserPhaseActions(phaseActions, phaseCount));
  const basculer = (phase, active) => {
    const suivants = new Set(valeurs);
    if (active) suivants.add(phase);
    else suivants.delete(phase);
    onChange(clesPhases(phaseCount).filter((item) => suivants.has(item)));
  };

  return (
    <div className="phase-actions-editor">
      <div className="line-count-row"><label>Phases actives</label><strong>{valeurs.size}</strong></div>
      <div className="phase-check-grid">
        {clesPhases(phaseCount).map((phase) => <label className={`phase-check ${valeurs.has(phase) ? 'selected' : ''}`} key={phase}><input type="checkbox" checked={valeurs.has(phase)} onChange={(event) => basculer(phase, event.target.checked)} /><span>P{phase}</span></label>)}
      </div>
    </div>
  );
}
