import { Sheet } from '../../components/common.jsx';

const COMPTEUR_GLOBAL_PAR_DEFAUT = {
  enabled: false,
  name: 'Menace',
  mode: 'clock',
  current: 0,
  max: 10,
  auto: false,
};

function calculerEtatCompteur(compteur) {
  const maximum = Math.max(1, Number(compteur.max || 10));
  const valeur = Math.max(0, Number(compteur.current || 0));
  const deborde = valeur > maximum;
  const excedent = Math.max(0, valeur - maximum);
  const resteDebordement = excedent % maximum;
  const ratioDebordement = deborde ? (resteDebordement === 0 ? 1 : resteDebordement / maximum) : 0;
  const cyclesComplets = deborde ? Math.floor(valeur / maximum) : 0;
  const cycleExact = valeur >= maximum && valeur % maximum === 0;
  const progression = deborde ? 1 : Math.min(1, valeur / maximum);

  return { maximum, valeur, deborde, ratioDebordement, cyclesComplets, cycleExact, progression };
}

function BoutonsCompteurGlobal({ onChanger }) {
  return (
    <>
      <button onClick={(event) => { event.stopPropagation(); onChanger(-1); }}>−</button>
      <button onClick={(event) => { event.stopPropagation(); onChanger(1); }}>+</button>
    </>
  );
}

export function CompteurGlobal({ compteur, onChanger, onOuvrir, animationTick }) {
  if (!compteur?.enabled) return null;

  const { maximum, valeur, deborde, ratioDebordement, cyclesComplets, cycleExact, progression } = calculerEtatCompteur(compteur);

  return (
    <div className={`global-mini ${compteur.auto ? 'auto-active' : ''} ${animationTick ? 'auto-tick' : ''} ${cycleExact ? 'cycle-complete' : ''} ${deborde ? 'overflowing' : ''}`}>
      <BoutonsCompteurGlobal onChanger={onChanger} />
      <div className="global-mini-main">
        <span>{compteur.name || 'Menace'}</span>
        <button
          className={`clock-face global-clock ${compteur.mode === 'counter' ? 'counter-mode' : ''} ${cycleExact ? 'cycle-complete' : ''} ${deborde ? 'overflowing' : ''}`}
          style={{ '--clock-progress': `${progression * 360}deg`, '--overflow-progress': `${ratioDebordement * 360}deg` }}
          onClick={onOuvrir}
          aria-label="Gérer le compteur de scène"
        >
          <span>{valeur}</span>
          {compteur.mode === 'clock' && <small>/{maximum}</small>}
        </button>
        {deborde && <em className="overflow-badge">×{cyclesComplets}</em>}
        {animationTick && <em className="auto-plus">+1</em>}
      </div>
    </div>
  );
}

export function FenetreCompteurGlobal({ compteur, onModifier, onChanger, onFermer }) {
  const courant = { ...COMPTEUR_GLOBAL_PAR_DEFAUT, ...(compteur || {}) };
  const modifier = (valeur) => onModifier({ ...courant, ...valeur });

  return (
    <Sheet title="Compteur de scène" onClose={onFermer}>
      <div className="stack">
        <label className="row"><input type="checkbox" checked={!!courant.enabled} onChange={(event) => modifier({ enabled: event.target.checked })} /> actif dans l’entête</label>
        <label className="field">Nom<input value={courant.name || ''} onChange={(event) => modifier({ name: event.target.value })} placeholder="Menace" /></label>
        <div className="grid2">
          <label className="field">Type<select value={courant.mode || 'clock'} onChange={(event) => modifier({ mode: event.target.value })}><option value="clock">Horloge</option><option value="counter">Compteur</option></select></label>
          <label className="field">Valeur<input type="number" inputMode="numeric" value={courant.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>
        </div>
        <label className="field">Maximum<input type="number" inputMode="numeric" min="1" value={courant.max ?? 10} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>
        <label className="row"><input type="checkbox" checked={!!courant.auto} onChange={(event) => modifier({ auto: event.target.checked })} /> avance automatiquement à chaque nouveau round</label>
        <div className="grid2"><button className="small-btn" onClick={() => onChanger(-1)}>−1</button><button className="small-btn" onClick={() => onChanger(1)}>+1</button></div>
      </div>
    </Sheet>
  );
}
