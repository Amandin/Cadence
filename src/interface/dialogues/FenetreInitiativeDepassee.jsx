import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreInitiativeDepassee({ kind, onActiver, onAjouter, onModifier, onSurpris }) {
  const insertionImmediate = ['classic-insert', 'phase-insert'].includes(kind);
  const insertionPhase = kind === 'phase-insert';
  const phaseDepassee = kind === 'phase-passed';
  const horsPhase = kind === 'phase-not-current';

  const title = insertionPhase
    ? t('initiative.passed.title.phaseInsert')
    : insertionImmediate
      ? t('initiative.passed.title.insert')
      : horsPhase
        ? t('initiative.passed.title.outOfPhase')
        : phaseDepassee
          ? t('initiative.passed.title.phasePassed')
          : t('initiative.passed.title.passed');

  return (
    <Fenetre title={title} onClose={onAjouter}>
      <div className="stack">
        {insertionImmediate
          ? <><p style={{ margin: 0 }}>{t('initiative.passed.insertHelp1')}</p><p style={{ margin: 0 }}>{t('initiative.passed.insertHelp2')}</p></>
          : horsPhase
            ? <><p style={{ margin: 0 }}>{t('initiative.passed.outOfPhaseHelp1')}</p><p style={{ margin: 0 }}>{t('initiative.passed.outOfPhaseHelp2')}</p></>
            : phaseDepassee
              ? <><p style={{ margin: 0 }}>{t('initiative.passed.phasePassedHelp1')}</p><p style={{ margin: 0 }}>{t('initiative.passed.phasePassedHelp2')}</p></>
              : <><p style={{ margin: 0 }}>{t('initiative.passed.passedHelp1')}</p><p style={{ margin: 0 }}>{t('initiative.passed.passedHelp2')}</p></>}
        <p className="muted compact-help">{t('initiative.passed.gmHelp')}</p>
        {insertionImmediate && <button className="primary" type="button" onClick={onActiver}>{t('initiative.passed.activateNow')}</button>}
        <div className="grid2 dynamic-insertion-secondary-actions with-surprise-action">
          <button className="small-btn" type="button" onClick={onAjouter}>{t('initiative.passed.addAnyway')}</button>
          <button className="small-btn suggested" type="button" onClick={onSurpris}>{t('initiative.passed.addSurprised')}</button>
          <button className="small-btn" type="button" onClick={onModifier}>{t('initiative.passed.editInitiative')}</button>
        </div>
      </div>
    </Fenetre>
  );
}
