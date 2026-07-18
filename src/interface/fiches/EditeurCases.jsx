import { t } from '../../i18n/index.js';
import { boxVisualRank, newTracker, normalizeBoxTracker, sortBoxBlocks, uid } from '../../logic.js';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { entierPositif } from './ficheEditionModel.js';

function ApercuNiveaux({ niveaux, levelVisuals = null, emptyActive = true }) {
  const maximum = entierPositif(niveaux, 5);
  const marques = [...(emptyActive ? [0] : []), ...(Array.isArray(levelVisuals) && levelVisuals.length ? levelVisuals : Array.from({ length: maximum }, (_, index) => boxVisualRank(index + 1, maximum)))];
  return <div className="levels-preview">{marques.map((valeur) => <span key={valeur} className={`box preview mark-${valeur} ${valeur >= 5 ? 'full' : ''}`} />)}</div>;
}

export function ChampNombre({ label, valeur, onChange, placeholder = '', className = '', disabled = false }) {
  return <label className={`field ${className}`.trim()}>{label}<input type="number" inputMode="numeric" value={valeur ?? ''} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></label>;
}

export function nouveauSuiviPourMode(type, allowActivationAutomation = true) {
  const suivi = newTracker(type);
  return allowActivationAutomation || suivi.autoReset !== 'activation' ? suivi : { ...suivi, autoReset: 'never' };
}

function creerCasesDepuis(cases = [], total = 1) {
  const ordonnees = [...(cases || [])].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  return Array.from({ length: Math.max(1, total) }, (_, position) => {
    const existante = ordonnees[position];
    return existante ? { ...existante, position } : { id: uid('box'), position, mark: 0, initial: 0 };
  });
}

export function EditeurCases({ suivi, onChange, resetOptions = null }) {
  const niveaux = entierPositif(suivi.fillLevels, 1);
  const visuelsDefaut = Array.from({ length: niveaux }, (_, index) => boxVisualRank(index + 1, niveaux));
  const visuelsActifs = (Array.isArray(suivi.levelVisuals) && suivi.levelVisuals.length ? suivi.levelVisuals : visuelsDefaut)
    .map((rank) => Math.max(1, Math.min(5, Number(rank) || 1)))
    .filter((rank, index, liste) => liste.indexOf(rank) === index)
    .slice(0, 5);
  const niveauVideActif = suivi.emptyLevelActive !== false;
  const suiviNormalise = normalizeBoxTracker({ ...suivi, fillLevels: niveaux });
  const blocs = suiviNormalise.blocks;
  const appliquerBlocs = (blocks) => onChange(sortBoxBlocks({ ...suiviNormalise, blocks }));
  const ajouterBloc = () => {
    const order = blocs.length;
    appliquerBlocs([...blocs, { id: uid('block'), label: `Bloc ${order + 1}`, order, lines: [{ id: uid('line'), label: 'Ligne 1', order: 0, boxes: creerCasesDepuis([], 4) }] }]);
  };
  const modifierBloc = (blocId, modification) => appliquerBlocs(blocs.map((bloc) => bloc.id === blocId ? modification(bloc) : bloc));
  const retirerBloc = (blocId) => appliquerBlocs(blocs.length > 1 ? blocs.filter((bloc) => bloc.id !== blocId) : blocs);
  const ajouterLigne = (blocId) => modifierBloc(blocId, (bloc) => ({ ...bloc, lines: [...bloc.lines, { id: uid('line'), label: `Ligne ${bloc.lines.length + 1}`, order: bloc.lines.length, boxes: creerCasesDepuis([], 4) }] }));
  const modifierLigne = (blocId, ligneId, modification) => modifierBloc(blocId, (bloc) => ({ ...bloc, lines: bloc.lines.map((ligne) => ligne.id === ligneId ? modification(ligne) : ligne) }));
  const retirerLigne = (blocId, ligneId) => modifierBloc(blocId, (bloc) => ({ ...bloc, lines: bloc.lines.length > 1 ? bloc.lines.filter((ligne) => ligne.id !== ligneId) : bloc.lines }));
  const changerVisuel = (rank) => {
    const actif = visuelsActifs.includes(rank);
    const prochains = (actif ? visuelsActifs.filter((item) => item !== rank) : [...visuelsActifs, rank].sort((a, b) => a - b)).slice(0, 5);
    if (!prochains.length) return;
    onChange(normalizeBoxTracker({ ...suiviNormalise, fillLevels: prochains.length, levelVisuals: prochains, levelLabels: Array.from({ length: prochains.length }, (_, index) => `Niveau ${index + 1}`), levelPriorities: Array.from({ length: prochains.length }, (_, index) => index + 1) }));
  };

  return (
    <div className="box-editor">
      <div className="box-level-row box-level-row-top">
        <span>{t('sheet.boxes.activeLevels')}</span>
        <ApercuNiveaux niveaux={niveaux} levelVisuals={visuelsActifs} emptyActive={niveauVideActif} />
      </div>
      <div className="box-visual-choice-row" role="group" aria-label={t('sheet.boxes.activeLevels')}>
        <button className={`box-visual-choice ${niveauVideActif ? 'active' : ''}`} type="button" onClick={() => onChange(normalizeBoxTracker({ ...suiviNormalise, emptyLevelActive: !niveauVideActif }))} aria-pressed={niveauVideActif}><span className="box preview mark-0" /></button>
        {[1, 2, 3, 4, 5].map((rank) => <button className={`box-visual-choice ${visuelsActifs.includes(rank) ? 'active' : ''}`} key={rank} type="button" onClick={() => changerVisuel(rank)} aria-pressed={visuelsActifs.includes(rank)}><span className={`box preview mark-${rank} ${rank >= 5 ? 'full' : ''}`} /></button>)}
      </div>
      <div className="line-count-row box-blocks-head"><label>{t('sheet.boxes.blocks')}</label><button className="small-btn" onClick={ajouterBloc}>{t('sheet.boxes.addBlock')}</button></div>
      <div className="stack">
        {blocs.map((bloc) => (
          <div className="box-block-edit" key={bloc.id}>
            <div className="box-block-edit-head">
              <input value={bloc.label || ''} placeholder={t('sheet.boxes.blockName')} onChange={(e) => modifierBloc(bloc.id, (courant) => ({ ...courant, label: e.target.value || 'Bloc' }))} />
              <button className="small-btn subtle-danger" onClick={() => retirerBloc(bloc.id)} disabled={blocs.length <= 1}><IconeCadence name="remove" /></button>
            </div>
            <div className="stack">
              {bloc.lines.map((ligne) => (
                <div className={`free-box-edit-line box-line-edit ${bloc.lines.length <= 1 ? 'single-line' : ''}`} key={ligne.id}>
                  <input value={ligne.label || ''} placeholder={t('sheet.boxes.lineName')} disabled={bloc.lines.length <= 1} onChange={(e) => modifierLigne(bloc.id, ligne.id, (courante) => ({ ...courante, label: e.target.value || 'Ligne' }))} />
                  <input type="number" inputMode="numeric" min="1" value={(ligne.boxes || []).length || 1} onChange={(e) => modifierLigne(bloc.id, ligne.id, (courante) => ({ ...courante, boxes: creerCasesDepuis(courante.boxes, entierPositif(e.target.value, 1)) }))} />
                  <button className="small-btn subtle-danger" onClick={() => retirerLigne(bloc.id, ligne.id)} disabled={bloc.lines.length <= 1}><IconeCadence name="remove" /></button>
                </div>
              ))}
            </div>
            <button className="small-btn box-add-line-btn" onClick={() => ajouterLigne(bloc.id)}>{t('sheet.boxes.addLine')}</button>
          </div>
        ))}
      </div>
      <details className="advanced-options">
        <summary>{t('sheet.advancedOptions')}</summary>
        <GroupeOptionsAvancees title={t('sheet.advanced.automatisms')}>{resetOptions}</GroupeOptionsAvancees>
      </details>
    </div>
  );
}

function GroupeOptionsAvancees({ title, children }) {
  return <section className="advanced-option-group"><h4>{title}</h4>{children}</section>;
}
