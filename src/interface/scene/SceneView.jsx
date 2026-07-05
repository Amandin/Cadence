import { memo, useMemo } from 'react';
import { BarreActionBas } from './BarreActionBas.jsx';
import { EnteteScene } from './EnteteScene.jsx';
import { ListeInitiative } from './ListeInitiative.jsx';
import { ReserveHorsInitiative } from './ReserveHorsInitiative.jsx';

export const SceneView = memo(function SceneView({
  scene,
  characters,
  active,
  activeGroup,
  declarationEnDeclaration,
  temporaliteSouple,
  temporalitePhases,
  temporaliteDeclaration,
  phaseActive,
  phaseActiveId,
  phaseAttendRelanceInitiative,
  horlogesBloquantesActives,
  roundEffect,
  globalAutoTick,
  classeSuivantEffective,
  nextLabel,
  suivantDesactive,
  retourPossible,
  retourPreparationVisible,
  toutLeMondeAJoueSouple,
  phaseDemarreNouveauRound,
  nextStartsRound,
  libelleBas,
  dark,
  onRetourHub,
  onTourPrecedent,
  onTourSuivant,
  onRetourPreparation,
  onModifierCompteurGlobal,
  onToggleCompteurTemps,
  onToggleSurprisePreparation,
  onAjouterEtatScene,
  onModifierEtatScene,
  onRetirerEtatScene,
  onMarquerAJoue,
  onAnnulerAJoue,
  onModifierNotesReserve,
  onAjouterParticipant,
  onSaisirInitiatives,
  onOuvrirLanceurDes,
  onOuvrirMenu,
  performanceLow = false,
}) {
  const actifId = useMemo(() => scene.round < 0 ? '' : temporalitePhases ? phaseActiveId : scene.activeId, [phaseActiveId, scene.activeId, scene.round, temporalitePhases]);
  const prochainRound = useMemo(
    () => declarationEnDeclaration ? false : temporaliteSouple ? toutLeMondeAJoueSouple : temporalitePhases ? phaseDemarreNouveauRound : nextStartsRound,
    [declarationEnDeclaration, nextStartsRound, phaseDemarreNouveauRound, temporalitePhases, temporaliteSouple, toutLeMondeAJoueSouple],
  );

  return (
    <div className={`app scene-app ${dark ? 'dark' : ''} ${characters.selected ? 'has-character-panel' : ''}`}>
      <div className="shell scene-shell">
        <EnteteScene
          scene={scene}
          actif={declarationEnDeclaration ? null : temporalitePhases ? phaseActive : active}
          groupeActif={activeGroup}
          horlogesBloquantes={horlogesBloquantesActives}
          effetRound={roundEffect}
          compteurGlobalAuto={globalAutoTick}
          classeSuivant={classeSuivantEffective}
          libelleSuivant={nextLabel}
          temporaliteSouple={temporaliteSouple}
          temporalitePhases={temporalitePhases}
          temporaliteDeclaration={temporaliteDeclaration}
          suivantDesactive={suivantDesactive}
          retourDesactive={!retourPossible}
          dark={dark}
          onRetourHub={onRetourHub}
          onTourPrecedent={onTourPrecedent}
          onTourSuivant={onTourSuivant}
          onRetourPreparation={retourPreparationVisible ? onRetourPreparation : null}
          onModifierCompteurGlobal={onModifierCompteurGlobal}
          onToggleCompteurTemps={onToggleCompteurTemps}
          onToggleSurprisePreparation={onToggleSurprisePreparation}
          onAjouterEtatScene={onAjouterEtatScene}
          onModifierEtatScene={onModifierEtatScene}
          onRetirerEtatScene={onRetirerEtatScene}
          performanceLow={performanceLow}
        />
        <main className="scene-main with-reserve">
          <ListeInitiative
            scene={scene}
            participants={scene.participants}
            actifId={actifId}
            interactions={characters}
            temporaliteSouple={temporaliteSouple}
            temporalitePhases={temporalitePhases}
            temporaliteDeclaration={temporaliteDeclaration}
            phaseAttendRelanceInitiative={phaseAttendRelanceInitiative}
            performanceLow={performanceLow}
            onMarquerAJoue={onMarquerAJoue}
            onAnnulerAJoue={onAnnulerAJoue}
          />
          <ReserveHorsInitiative scene={scene} interactions={characters} onModifierNotes={onModifierNotesReserve} />
        </main>
      </div>
      <BarreActionBas
        dark={dark}
        classeSuivant={classeSuivantEffective}
        prochainRound={prochainRound}
        round={scene.round}
        horlogeBloquee={horlogesBloquantesActives.length > 0}
        suivantDesactive={suivantDesactive}
        retourDesactive={!retourPossible}
        libelleSuivant={libelleBas}
        onRetourHub={onRetourHub}
        onTourPrecedent={onTourPrecedent}
        onTourSuivant={onTourSuivant}
        onRetourPreparation={retourPreparationVisible ? onRetourPreparation : null}
        onAjouterParticipant={onAjouterParticipant}
        onSaisirInitiatives={onSaisirInitiatives}
        onOuvrirLanceurDes={onOuvrirLanceurDes}
        onOuvrirMenu={onOuvrirMenu}
      />
    </div>
  );
});
