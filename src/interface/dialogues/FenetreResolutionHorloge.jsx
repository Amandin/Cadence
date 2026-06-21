import { isTriggeredClock } from '../../logic.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreResolutionHorloge({ participants, onFermer, onRelancerHorloge, onSupprimerHorloge }) {
  const horloges = participants.flatMap((participant) => (
    participant.trackers
      .filter(isTriggeredClock)
      .map((suivi) => ({ participant, suivi }))
  ));

  return (
    <Fenetre title={t('dialogs.resolveClock.title')} onClose={onFermer}>
      <p className="muted" style={{ marginTop: 0 }}>
        {t('dialogs.resolveClock.help')}
      </p>
      <div className="stack">
        {horloges.map(({ participant, suivi }) => (
          <div className="tracker triggered" key={`${participant.id}-${suivi.id}`}>
            <div className="tracker-top">
              <span>{participant.name}</span>
              <span className="chip hot">{suivi.name}</span>
            </div>
            <p style={{ margin: '4px 0 10px' }}>{t('dialogs.resolveClock.segments', { current: suivi.current, max: suivi.max })}</p>
            <div className="grid2">
              <button className="primary" onClick={() => onRelancerHorloge(participant.id, suivi.id)}>{t('dialogs.resolveClock.restart')}</button>
              <button className="danger-btn" onClick={() => onSupprimerHorloge(participant.id, suivi.id)}>{t('common.delete')}</button>
            </div>
          </div>
        ))}
      </div>
      <button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={onFermer}>{t('common.close')}</button>
    </Fenetre>
  );
}
