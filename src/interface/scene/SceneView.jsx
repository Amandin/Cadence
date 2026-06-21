import { BarreActionBas } from './BarreActionBas.jsx';
import { EnteteScene } from './EnteteScene.jsx';
import { ListeInitiative } from './ListeInitiative.jsx';
import { ReserveHorsInitiative } from './ReserveHorsInitiative.jsx';

export function SceneView({
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
  onOuvrirMenu,
}) {
  const actifId = scene.round < 0 ? '' : temporalitePhases ? phaseActiveId : scene.activeId;

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
        />
        <main className={`scene-main ${scene.reserve?.length ? 'with-reserve' : ''}`}>
          <ListeInitiative
            scene={scene}
            participants={scene.participants}
            actifId={actifId}
            interactions={characters}
            temporaliteSouple={temporaliteSouple}
            temporalitePhases={temporalitePhases}
            temporaliteDeclaration={temporaliteDeclaration}
            phaseAttendRelanceInitiative={phaseAttendRelanceInitiative}
            onMarquerAJoue={onMarquerAJoue}
            onAnnulerAJoue={onAnnulerAJoue}
          />
          <ReserveHorsInitiative scene={scene} interactions={characters} onModifierNotes={onModifierNotesReserve} />
        </main>
      </div>
      <BarreActionBas
        dark={dark}
        classeSuivant={classeSuivantEffective}
        prochainRound={declarationEnDeclaration ? false : temporaliteSouple ? toutLeMondeAJoueSouple : temporalitePhases ? phaseDemarreNouveauRound : nextStartsRound}
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
        onOuvrirMenu={onOuvrirMenu}
      />
    </div>
  );
}
