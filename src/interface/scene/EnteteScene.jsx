import { memo } from 'react';
import { t } from '../../i18n/index.js';
import { getCadenceLogo, uiGlyphs } from '../../uiAssets.js';
import { participantEstInactif, participantEstLimite } from '../../domain/statuses.js';
import { BadgeRound, EtiquetteEtat } from '../commun/ComposantsCommuns.jsx';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { CompteurGlobal } from '../suivis/CompteurGlobal.jsx';

export const EnteteScene = memo(function EnteteScene(props) {
  const {
    scene,
    actif,
    groupeActif = [],
    horlogesBloquantes,
    effetRound,
    compteurGlobalAuto,
    classeSuivant,
    libelleSuivant,
    temporaliteSouple,
    temporalitePhases,
    temporaliteDeclaration,
    suivantDesactive,
    dark,
    onRetourHub,
    onTourSuivant,
    onModifierCompteurGlobal,
    onToggleCompteurTemps,
    onAjouterEtatScene,
    onModifierEtatScene,
    onRetirerEtatScene,
    performanceLow,
  } = props;
  const horlogeABloquee = horlogesBloquantes.length > 0;
  const enPreparation = scene.round < 0;
  const activationSimultanee = !temporaliteSouple && !horlogeABloquee && groupeActif.length > 1;
  const nomActivationActive = enPreparation
    ? t('scene.header.preparing')
    : horlogeABloquee
      ? horlogesBloquantes.map((participant) => participant.name).join(', ')
      : activationSimultanee
        ? groupeActif.map((participant) => participant.name).join(' + ')
        : temporaliteDeclaration && !actif ? t('scene.header.declareActions') : actif?.name || t('scene.header.noParticipant');
  const suffixeTemporalite = `${temporaliteSouple ? ` ${uiGlyphs.middleDot} ${t('scene.header.flexible')}` : temporalitePhases ? ` ${uiGlyphs.middleDot} ${t('scene.header.phases')}` : ''}${temporaliteDeclaration ? ` ${uiGlyphs.middleDot} ${t('scene.header.declaration')}` : ''}`;
  const actionDeclaree = temporaliteDeclaration && actif && scene.declarationStage === 'resolution' && !(scene.declarationPlayedIds || []).includes(actif.id) ? scene.declarations?.[actif.id] : '';
  const statutActif = participantEstInactif(actif) ? t('scene.status.inactive') : participantEstLimite(actif) ? t('scene.status.limited') : t('scene.status.active');
  const iconeSuivant = classeSuivant?.includes('next-round') ? 'nextSoft' : 'nextMedium';
  const libelleActivation = enPreparation
    ? t('scene.header.preparation')
    : horlogeABloquee
      ? t('scene.header.clockToManage')
      : activationSimultanee
        ? t('scene.header.simultaneousParticipants')
        : temporaliteDeclaration && !actif ? t('scene.header.declaration') : statutActif;
  const logo = getCadenceLogo(dark);

  return (
    <header className="top compact">
      <div className="scene-head scene-head-with-logo" style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', alignItems: 'center', gap: 8 }}>
        <button className="hub-return-logo" onClick={onRetourHub} aria-label={t('scene.header.returnHubAria')}><img src={logo} alt="" /></button>
        <div className="scene-title-block" style={{ minWidth: 0 }}>
          <h1>{scene.title}</h1>
          <div className="muted">{scene.type} {uiGlyphs.middleDot} {t('scene.header.participantsInInitiative', { count: scene.participants.length })}{suffixeTemporalite}</div>
        </div>
        <BadgeRound round={scene.round} effect={effetRound} phase={temporalitePhases ? scene.phase || 1 : null} surpriseRound={!!scene.surpriseRoundActive} />
      </div>
      <div className="turn-row header-turn-row">
        <div className={`active-box panel ${activationSimultanee ? 'simultaneous-turn' : ''} ${temporaliteSouple ? 'flexible-turn' : ''} ${temporalitePhases ? 'phase-turn' : ''} ${temporaliteDeclaration ? 'declaration-turn' : ''}`}>
          <div className="turn-active-line">
            <div className="active-name">
              {temporaliteSouple && !horlogeABloquee && !enPreparation ? <><div className="muted">{t('scene.header.flexibleMode')}</div><strong>{t('scene.header.resolvedActions')}</strong></> : <><div className="muted">{libelleActivation}</div><strong>{nomActivationActive}</strong>{actionDeclaree && <strong className="declaration-header-action">({actionDeclaree})</strong>}</>}
            </div>
            {temporaliteSouple && !horlogeABloquee && !enPreparation && <span className="chip flexible-chip">{t('scene.header.flexibleChip')}</span>}
            <CompteurGlobal compteur={scene.globalTracker} onChanger={onModifierCompteurGlobal} onToggleTemps={onToggleCompteurTemps} animationTick={compteurGlobalAuto} tickIntervalMs={performanceLow ? 4000 : 1000} />
          </div>
        </div>
        <button className={`turn-btn next ${classeSuivant}`} onClick={onTourSuivant} disabled={suivantDesactive} aria-label={libelleSuivant}>{horlogeABloquee ? uiGlyphs.pause : <IconeCadence name={iconeSuivant} />}</button>
      </div>
      <div className="statuses status-control-row scene-status-row">
        {(scene.statuses || []).map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onModifier={() => onModifierEtatScene?.(etat.id)} onRetirer={() => onRetirerEtatScene?.(etat.id)} />)}
        <button className="small-btn scene-add-status-btn" type="button" onClick={() => onAjouterEtatScene?.()}>{t('scene.status.add')}</button>
      </div>
    </header>
  );
});
