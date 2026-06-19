import { useEffect, useRef, useState } from 'react';
import { activeThresholds, applyBoxMarkAction, applyDelta, boxBlocks, boxVisualRank, isTriggeredClock, normalizeThresholds, sortBoxBlocks, thresholdValue, trackerBounds, trackerLimitMode } from '../../logic.js';
import { t } from '../../i18n/index.js';

function TitreSuivi({ titre, avantTitre, suffixe = null }) {
  return <span className="tracker-title">{avantTitre}{titre}{suffixe}</span>;
}

const thresholdGlowColors = {
  neutral: '#94a3b8',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
};

function styleSeuils(seuils) {
  if (!seuils.length) return {};
  return {
    '--threshold-a': thresholdGlowColors[seuils[0]?.color] || thresholdGlowColors.neutral,
    '--threshold-b': thresholdGlowColors[seuils[1]?.color] || thresholdGlowColors[seuils[0]?.color] || thresholdGlowColors.neutral,
  };
}

function SeuilsActifs({ seuils }) {
  if (!seuils.length) return null;
  return <span className="threshold-chip-row">{seuils.map((seuil, index) => <span className={`threshold-chip threshold-${seuil.color || 'neutral'}`} key={`${seuil.label}-${index}`}>{seuil.label}</span>)}</span>;
}

function IconeMetronome({ fige = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="metronome-icon">
      <path d="M8 21h8l-2.4-14h-3.2L8 21Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 7V3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d={fige ? 'M12 13V7' : 'M12 12l4-3'} fill="none" stroke="currentColor" strokeWidth={fige ? '2.1' : '2.8'} strokeLinecap="round" />
      <path d="M9.4 18h5.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function trackerCanFreeze(suivi) {
  return suivi.autoReset !== 'never' && !!suivi.freezeAllowed;
}

function BoutonGelSuivi({ suivi, onToggle, title }) {
  if (!trackerCanFreeze(suivi)) return null;
  return <button className={`freeze-btn ${suivi.frozen ? 'active' : ''}`} onClick={onToggle} title={title} aria-label={title}><IconeMetronome fige={!!suivi.frozen} /></button>;
}

function normaliserPas(valeur) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? Math.max(1, nombre) : 1;
}

function ControlePas({ valeur, onChange, className = '' }) {
  const [edition, setEdition] = useState(false);
  const [saisie, setSaisie] = useState(String(normaliserPas(valeur)));
  const valider = () => {
    onChange(saisie);
    setEdition(false);
  };

  if (edition) {
    return <input className={`step-chip-input ${className}`.trim()} type="number" inputMode="numeric" min="1" value={saisie} autoFocus onChange={(event) => setSaisie(event.target.value)} onBlur={valider} onKeyDown={(event) => { if (event.key === 'Enter') valider(); if (event.key === 'Escape') setEdition(false); }} aria-label={t('trackers.step.label')} />;
  }

  return <button className={`step-chip ${className}`.trim()} onClick={() => { setSaisie(String(normaliserPas(valeur))); setEdition(true); }} title={t('trackers.step.edit')} aria-label={t('trackers.step.editCurrent', { value: normaliserPas(valeur) })}>+/-{normaliserPas(valeur)}</button>;
}

function lignesEquilibrees(elements, maxParLigne = 5) {
  const liste = Array.from(elements || []);
  if (liste.length <= maxParLigne) return [liste];
  const nombreLignes = Math.ceil(liste.length / maxParLigne);
  const tailleLigne = Math.ceil(liste.length / nombreLignes);
  return Array.from({ length: nombreLignes }, (_, index) => liste.slice(index * tailleLigne, (index + 1) * tailleLigne));
}

function capaciteParLigne(largeur, { taille, espace, reserve = 0, min = 2, max = 12, fallback = 5 }) {
  const disponible = Number(largeur) - reserve;
  if (!Number.isFinite(disponible) || disponible <= 0) return fallback;
  const capacite = Math.floor((disponible + espace) / (taille + espace));
  return Math.max(min, Math.min(max, capacite));
}

function useLargeurElement() {
  const ref = useRef(null);
  const [largeur, setLargeur] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const mesurer = () => setLargeur(element.getBoundingClientRect().width);
    mesurer();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
      const entree = entries[0];
      if (entree) setLargeur(entree.contentRect.width);
    }) : null;
    observer?.observe(element);
    window.addEventListener('resize', mesurer);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', mesurer);
    };
  }, []);

  return [ref, largeur];
}

export function Suivi({ suivi, onModifier, onSupprimer, avantTitre = null, couleur = 'slate', afficherBadgeSecret = true }) {
  const [deltaOuvert, setDeltaOuvert] = useState(false);
  const [delta, setDelta] = useState('');
  const [modeSaisieBarre, setModeSaisieBarre] = useState('delta');
  const [directionSaisieBarre, setDirectionSaisieBarre] = useState(1);
  const [actionCases, setActionCases] = useState('fill');
  const [pasCases, setPasCases] = useState('1');
  const champDeltaRef = useRef(null);
  const declenche = isTriggeredClock(suivi);
  const seuils = activeThresholds(suivi) || [];
  const classeSeuils = seuils.length ? 'threshold-glow' : '';
  const classeSecret = suivi.secret ? 'tracker-secret' : '';
  const styleSeuil = styleSeuils(seuils);
  const cyclesPuces = Number(suivi.cycles ?? suivi.cyclesInitial ?? 0) || 0;
  const cyclesHorloge = Number(suivi.cycles ?? suivi.cyclesInitial ?? 0) || 0;
  const titreGel = suivi.frozen ? t('trackers.common.unfreezeAutomation') : t('trackers.common.freezeAutomation');
  const badgeSecret = suivi.secret && afficherBadgeSecret ? <span className="chip secret-chip" title={t('sheet.tracker.secret')} aria-label={t('sheet.tracker.secret')}>{'🥷'}</span> : null;
  const suffixePuces = (suivi.type === 'points' || suivi.type === 'dots') && suivi.limitMode === 'loop'
    ? <><span className={`title-counter color-${couleur || 'slate'}`}>{cyclesPuces}</span>{badgeSecret}</>
    : badgeSecret;
  const suffixeHorloge = suivi.type === 'clock' && suivi.limitMode === 'increment'
    ? <><span className={`title-counter color-${couleur || 'slate'}`}>{cyclesHorloge}</span>{badgeSecret}</>
    : badgeSecret;
  const casesMultiNiveaux = Number(suivi.fillLevels || 1) > 1;
  const modifier = (valeur) => onModifier({ ...suivi, ...valeur });
  const appliquerPas = (direction) => suivi.type !== 'boxes' && onModifier(applyDelta(suivi, direction * (suivi.type === 'bar' ? 1 : normaliserPas(suivi.step))));
  const changerPasCases = (valeur) => setPasCases(String(valeur ?? '').replace(/[^\d]/g, ''));
  const pasCasesEffectif = casesMultiNiveaux ? normaliserPas(pasCases) : 1;
  const appliquerActionCase = (mark) => {
    let suivant = mark;
    for (let index = 0; index < pasCasesEffectif; index += 1) {
      suivant = applyBoxMarkAction(suivant, suivi.fillLevels || 5, actionCases);
    }
    return suivant;
  };
  const ouvrirDelta = (direction) => { setModeSaisieBarre('delta'); setDirectionSaisieBarre(direction > 0 ? 1 : -1); setDelta(''); setDeltaOuvert(true); };
  const ouvrirValeurBarre = () => { setModeSaisieBarre('value'); setDelta(''); setDeltaOuvert(true); };
  const appliquerSaisieBarre = () => { if (String(delta).trim() === '') { setDeltaOuvert(false); return; } const valeur = Number(delta); if (!Number.isFinite(valeur)) return; onModifier(modeSaisieBarre === 'value' ? { ...suivi, current: valeur } : applyDelta(suivi, Math.abs(valeur) * directionSaisieBarre)); setDelta(''); setDeltaOuvert(false); };
  const cocherCase = (blocId, ligneId, caseId) => {
    const blocks = boxBlocks(suivi).map((bloc) => bloc.id !== blocId ? bloc : {
      ...bloc,
      lines: bloc.lines.map((ligne) => ligne.id !== ligneId ? ligne : {
        ...ligne,
        boxes: ligne.boxes.map((caseSuivi) => caseSuivi.id === caseId ? { ...caseSuivi, mark: appliquerActionCase(caseSuivi.mark) } : caseSuivi),
      }),
    });
    onModifier(sortBoxBlocks({ ...suivi, blocks }));
  };

  useEffect(() => {
    if (!deltaOuvert) return;
    requestAnimationFrame(() => champDeltaRef.current?.focus());
  }, [deltaOuvert]);

  if (suivi.type === 'clock') {
    return <div className={`tracker ${classeSecret} ${classeSeuils} ${declenche ? 'triggered' : ''} ${suivi.frozen ? 'frozen' : ''}`} style={styleSeuil}><div className="tracker-top clock-top"><div className="clock-title-zone"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} suffixe={suffixeHorloge} /><SeuilsActifs seuils={seuils} />{suivi.frozen && <span className="chip">{t('trackers.common.frozen')}</span>}{declenche && <span className="chip hot">{t('trackers.common.toResolve')}</span>}</div><div className="clock-inline"><button onClick={() => appliquerPas(-1)}>-</button><HorlogeSuivi suivi={suivi} /><button onClick={() => appliquerPas(1)}>+</button></div><BoutonGelSuivi suivi={suivi} onToggle={() => modifier({ frozen: !suivi.frozen })} title={titreGel} /></div>{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => modifier({ current: 0 })}>{t('trackers.common.resetToZero')}</button><button className="danger-btn" onClick={onSupprimer}>{t('common.delete')}</button></div>}</div>;
  }

  if (suivi.type === 'boxes') {
    return <div className={`tracker ${classeSecret}`}><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} suffixe={badgeSecret} /><div className="box-action-toggle" role="group" aria-label={t('trackers.boxes.actionGroup')}><button className={actionCases === 'fill' ? 'active' : ''} onClick={() => setActionCases('fill')} title={t('trackers.boxes.fill')}>+</button><button className={actionCases === 'empty' ? 'active' : ''} onClick={() => setActionCases('empty')} title={t('trackers.boxes.empty')}>-</button>{casesMultiNiveaux && <input className="box-action-step" type="number" inputMode="numeric" min="1" value={pasCases} onChange={(event) => changerPasCases(event.target.value)} onBlur={() => setPasCases(String(pasCasesEffectif))} aria-label={t('trackers.boxes.stepLabel')} title={t('trackers.boxes.stepLabel')} />}</div></div><CasesSuivi suivi={suivi} cocher={cocherCase} /></div>;
  }

  if (suivi.type === 'number') {
    return <div className={`tracker ${classeSecret} ${classeSeuils} ${declenche ? 'triggered' : ''} ${suivi.frozen ? 'frozen' : ''}`} style={styleSeuil}><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} suffixe={badgeSecret} /><div className="tracker-top-actions"><SeuilsActifs seuils={seuils} />{suivi.frozen && <span className="chip">{t('trackers.common.frozen')}</span>}{declenche && <span className="chip hot">{t('trackers.common.toResolve')}</span>}<span className="chip counter-current-chip">{t('sheet.currentValue', { value: suivi.current ?? 0 })}</span><div className="counter-header-controls"><ControlePas valeur={normaliserPas(suivi.step)} onChange={(valeur) => modifier({ step: normaliserPas(valeur) })} /><BoutonGelSuivi suivi={suivi} onToggle={() => modifier({ frozen: !suivi.frozen })} title={titreGel} /></div></div></div><CompteursSuivi suivi={suivi} onModifier={modifier} />{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="danger-btn" onClick={onSupprimer}>{t('common.delete')}</button></div>}</div>;
  }

  if (suivi.type === 'bar') {
    return <div className={`tracker ${classeSecret} ${classeSeuils} ${declenche ? 'triggered' : ''} ${suivi.frozen ? 'frozen' : ''}`} style={styleSeuil}><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} suffixe={badgeSecret} /><div className="tracker-top-actions"><SeuilsActifs seuils={seuils} />{suivi.frozen && <span className="chip">{t('trackers.common.frozen')}</span>}{declenche && <span className="chip hot">{t('trackers.common.toResolve')}</span>}<BoutonGelSuivi suivi={suivi} onToggle={() => modifier({ frozen: !suivi.frozen })} title={titreGel} /></div></div>{deltaOuvert && <div className="delta-pop tracker-action-pop"><label><small>{modeSaisieBarre === 'value' ? t('trackers.bar.newValue') : directionSaisieBarre < 0 ? t('trackers.bar.subtractValue') : t('trackers.bar.addValue')}</small><input ref={champDeltaRef} type="number" inputMode="numeric" min={modeSaisieBarre === 'delta' ? '0' : undefined} value={delta} onChange={(event) => setDelta(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && appliquerSaisieBarre()} placeholder={modeSaisieBarre === 'value' ? '' : '3'} /></label><button onClick={appliquerSaisieBarre}>{t('common.ok')}</button></div>}<div className="controls bar-controls"><button onClick={() => ouvrirDelta(-1)}>-</button><button className="bar-action-zone" onClick={ouvrirValeurBarre} aria-label={t('trackers.bar.openValue', { name: suivi.name })}><BarreSuivi suivi={suivi} /></button><button onClick={() => ouvrirDelta(1)}>+</button></div>{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => modifier({ current: 0 })}>{t('trackers.common.resetToZero')}</button><button className="danger-btn" onClick={onSupprimer}>{t('common.delete')}</button></div>}</div>;
  }

  return <div className={`tracker ${classeSecret} ${classeSeuils} ${declenche ? 'triggered' : ''} ${suivi.frozen ? 'frozen' : ''}`} style={styleSeuil}><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} suffixe={suffixePuces} /><div className="tracker-top-actions"><SeuilsActifs seuils={seuils} />{suivi.frozen && <span className="chip">{t('trackers.common.frozen')}</span>}{declenche && <span className="chip hot">{t('trackers.common.toResolve')}</span>}<BoutonGelSuivi suivi={suivi} onToggle={() => modifier({ frozen: !suivi.frozen })} title={titreGel} /></div></div><div className="points-controls"><PointsSuivi suivi={suivi} onModifier={modifier} /></div>{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => modifier({ current: 0 })}>{t('trackers.common.resetToZero')}</button><button className="danger-btn" onClick={onSupprimer}>{t('common.delete')}</button></div>}</div>;
}

function BarreSuivi({ suivi }) {
  const max = Number(suivi.max || 1), min = Number(suivi.min ?? 0), courant = Number(suivi.current || 0), amplitude = Math.max(1, max - min);
  const ratio = Math.max(0, Math.min(1, (courant - min) / amplitude));
  const exces = Math.max(0, courant - max);
  const manqueValeur = Math.max(0, min - courant);
  const sousMinimum = manqueValeur > 0;
  const sousZero = courant < 0;
  const entreZeroEtMinimum = sousMinimum && !sousZero && min > 0;
  const depassement = exces / Math.max(1, amplitude + exces);
  const manque = manqueValeur / Math.max(1, amplitude + manqueValeur);
  const largeurDepassement = depassement > 0 ? Math.min(100, Math.max(8, depassement * 100)) : 0;
  const largeurManque = manque > 0 ? Math.min(100, Math.max(8, manque * 100)) : 0;
  const largeurNormale = Math.max(0, 100 - largeurManque - largeurDepassement);
  const classeRemplissage = courant / max <= .25 ? 'danger' : courant / max <= .5 ? 'warn' : '';
  const seuilActif = activeThresholds(suivi)?.[0];
  const couleurSeuilActif = thresholdGlowColors[seuilActif?.color] || null;
  const styleRemplissage = { width: `${ratio * 100}%`, ...(couleurSeuilActif ? { background: couleurSeuilActif } : {}) };
  const seuils = normalizeThresholds(suivi.thresholds).map((seuil) => ({ ...seuil, effectiveValue: thresholdValue(suivi, seuil) })).filter((seuil) => seuil.effectiveValue >= min && seuil.effectiveValue <= max);
  const classesBarre = `bar-bg ${sousMinimum ? 'under-min' : ''} ${entreZeroEtMinimum ? 'between-zero-and-min' : ''} ${sousZero ? 'under-zero' : ''} ${exces > 0 || sousMinimum ? 'overflowing' : ''}`.trim();

  return <><div className={classesBarre}><div className={`bar-fill ${classeRemplissage}`} style={styleRemplissage} />{depassement > 0 && <div className="bar-over" style={{ width: `${largeurDepassement}%` }} />}{manque > 0 && <div className={`bar-under ${entreZeroEtMinimum ? 'between-zero-and-min' : ''} ${sousZero ? 'under-zero' : ''}`.trim()} style={{ width: `${largeurManque}%` }} />}{seuils.map((seuil) => <span className={`bar-threshold-marker threshold-${seuil.color || 'neutral'}`} key={`${seuil.basis}-${seuil.value}-${seuil.label}`} title={seuil.label || t('trackers.bar.thresholdFallback', { value: seuil.effectiveValue })} style={{ left: `${largeurManque + ((seuil.effectiveValue - min) / amplitude) * largeurNormale}%`, '--marker-color': thresholdGlowColors[seuil.color] || thresholdGlowColors.neutral }} />)}</div><div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 3 }}><span>{min}</span><span>{courant}/{max}</span></div></>;
}

function PointsSuivi({ suivi, onModifier }) {
  const [zoneRef, largeurZone] = useLargeurElement();
  const max = Math.max(1, Number(suivi.max || 1));
  const { min } = trackerBounds(suivi);
  const courant = Number(suivi.current ?? min);
  const modeBoucle = trackerLimitMode(suivi) === 'loop';
  const appliquerCycle = (direction) => onModifier(applyDelta(suivi, direction));
  const reserveCommandes = modeBoucle ? 72 : 0;
  const maxParLigne = capaciteParLigne(largeurZone, { taille: 22, espace: 4, reserve: reserveCommandes, min: 3, max: 14, fallback: 8 });

  const puces = Array.from({ length: max }, (_, i) => i);

  return <div ref={zoneRef} className={`points-wrap ${modeBoucle ? 'with-cycle-controls' : ''}`}>{modeBoucle && <div className="points-cycle-slot"><button className="points-cycle-btn" onClick={() => appliquerCycle(-1)} aria-label={t('trackers.points.previousCycle')}>-</button></div>}<div className="dots balanced-token-rows">{lignesEquilibrees(puces, maxParLigne).map((ligne, rowIndex) => <div className="token-row" key={rowIndex}>{ligne.map((i) => <button key={i} className={`dot ${i < suivi.current ? 'on' : ''}`} onClick={() => onModifier({ current: i + 1 === suivi.current ? i : i + 1 })} />)}</div>)}</div>{modeBoucle && <div className="points-cycle-slot"><button className="points-cycle-btn" onClick={() => appliquerCycle(1)} aria-label={t('trackers.points.nextCycle')}>+</button></div>}</div>;
}

function CompteursSuivi({ suivi, onModifier }) {
  const [compteurOuvert, setCompteurOuvert] = useState('');
  const [valeurManuelle, setValeurManuelle] = useState('');
  const step = normaliserPas(suivi.step);
  const compteurs = [{ id: '__main', label: suivi.name || t('trackers.counter.defaultName'), current: suivi.current ?? 0, size: suivi.counterSize || 'compact' }, ...(Array.isArray(suivi.counters) ? suivi.counters : [])];
  const changer = (compteur, direction) => {
    const delta = direction * step;
    const current = Number(compteur.current || 0) + delta;
    setValeurManuelle(String(current));
    if (compteur.id === '__main') return onModifier(applyDelta(suivi, delta));
    return onModifier({ counters: (suivi.counters || []).map((item) => item.id === compteur.id ? { ...item, current } : item) });
  };
  const saisir = (compteur, valeur) => {
    const current = Number(valeur);
    if (!Number.isFinite(current)) return;
    setCompteurOuvert('');
    setValeurManuelle('');
    if (compteur.id === '__main') return onModifier({ current });
    return onModifier({ counters: (suivi.counters || []).map((item) => item.id === compteur.id ? { ...item, current } : item) });
  };
  const ouvrir = (compteur) => {
    const dejaOuvert = compteurOuvert === compteur.id;
    setCompteurOuvert(dejaOuvert ? '' : compteur.id);
    setValeurManuelle(dejaOuvert ? '' : String(compteur.current ?? 0));
  };

  return <div className="counter-wrap"><div className="counter-grid">{compteurs.map((compteur) => <div className={`counter-unit counter-size-${compteur.size || 'compact'}`} key={compteur.id}><button className="counter-edge" onClick={() => changer(compteur, -1)}>-</button><button className="counter-tile" onClick={() => ouvrir(compteur)} aria-label={t('trackers.counter.edit', { label: compteur.label || t('trackers.counter.defaultName') })}><span>{compteur.label || t('trackers.counter.defaultName')}</span><strong>{compteur.current ?? 0}</strong></button><button className="counter-edge" onClick={() => changer(compteur, 1)}>+</button>{compteurOuvert === compteur.id && <div className="counter-pop"><input type="number" inputMode="numeric" value={valeurManuelle} onChange={(event) => setValeurManuelle(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && saisir(compteur, valeurManuelle)} /><button onClick={() => saisir(compteur, valeurManuelle)}>{t('common.ok')}</button></div>}</div>)}</div></div>;
}

function HorlogeSuivi({ suivi }) {
  const max = Math.max(1, Number(suivi.max || 1));
  const min = Number(suivi.min ?? 0);
  const courant = Number.isFinite(Number(suivi.current)) ? Number(suivi.current) : 0;
  const declenche = isTriggeredClock(suivi);
  const mode = trackerLimitMode(suivi);
  const amplitude = Math.max(1, max - min);
  const courantBorne = Math.max(min, Math.min(max, courant));
  const ratio = (courantBorne - min) / amplitude;
  const depassement = mode === 'overflow'
    ? (suivi.direction === 'countdown' ? Math.max(0, min - courant) : Math.max(0, courant - max))
    : 0;
  const deborde = depassement > 0;
  const ratioDepassement = deborde ? depassement / Math.max(1, amplitude + depassement) : 0;
  const attention = !declenche && !deborde && ratio >= .5;
  const proche = !declenche && !deborde && ratio >= .75;
  const progression = Math.max(0, Math.min(1, ratio));

  return <div className={`clock-face ${attention ? 'warning' : ''} ${proche ? 'near' : ''} ${declenche ? 'triggered' : ''} ${deborde ? 'overflowing' : ''} ${suivi.frozen ? 'frozen' : ''}`} style={{ '--clock-progress': `${progression * 360}deg`, '--overflow-progress': `${ratioDepassement * 360}deg` }}><span>{courant}</span><small>/{max}</small></div>;
}

function CasesSuivi({ suivi, cocher }) {
  const [zoneRef, largeurZone] = useLargeurElement();
  const maxParLigne = capaciteParLigne(largeurZone, { taille: 30, espace: 1, reserve: 120, min: 2, max: 12, fallback: 5 });
  const rendreCases = (bloc, ligne) => {
    const rangees = lignesEquilibrees(ligne.boxes, maxParLigne);
    return <div className="boxes balanced-token-rows">{rangees.map((rangee, rowIndex) => <div className="token-row" key={rowIndex}>{rangee.map((caseSuivi) => { const rank = boxVisualRank(caseSuivi.mark, suivi); return <button key={caseSuivi.id} className={`box mark-${rank} ${rank >= 5 ? 'full' : ''}`} onClick={() => cocher(bloc.id, ligne.id, caseSuivi.id)} aria-label={`${bloc.label} ${ligne.label} case ${caseSuivi.position + 1}`} />; })}</div>)}</div>;
  };

  return <div ref={zoneRef} className="boxes grouped-boxes">{boxBlocks(suivi).map((bloc) => {
    const ligneUnique = bloc.lines.length === 1;
    if (ligneUnique) {
      const ligne = bloc.lines[0];
      return <div className="box-group" key={bloc.id}><div className="box-row single-line"><div className="box-block-label inline">{bloc.label}</div>{rendreCases(bloc, ligne)}</div></div>;
    }
    return <div className="box-group" key={bloc.id}><div className="box-block-label">{bloc.label}</div>{bloc.lines.map((ligne) => <div className="box-row" key={ligne.id}>{rendreCases(bloc, ligne)}<div className="box-label right">{ligne.label}</div></div>)}</div>;
  })}</div>;
}
