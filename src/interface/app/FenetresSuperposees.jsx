import { FenetreEtat } from '../dialogues/FenetreEtat.jsx';
import { FenetreInformation } from '../dialogues/FenetreInformation.jsx';
import { FenetreLancerInitiatives } from '../dialogues/FenetreLancerInitiatives.jsx';
import { FenetreRejoindreInitiative } from '../dialogues/FenetreRejoindreInitiative.jsx';
import { FenetreResolutionHorloge } from '../dialogues/FenetreResolutionHorloge.jsx';
import { FenetreSauvegardeTemplate } from '../dialogues/FenetreSauvegardeTemplate.jsx';
import { FenetreAjoutPersonnage } from '../fiches/FenetreAjoutPersonnage.jsx';
import { FenetreEditionFiche } from '../fiches/FenetreEditionFiche.jsx';
import { FicheParticipant } from '../fiches/FicheParticipant.jsx';
import { MenuPrincipal } from '../menu/MenuPrincipal.jsx';
import { FenetreCompteurGlobal } from '../suivis/CompteurGlobal.jsx';

/**
 * Regroupe les fenêtres qui flottent au-dessus de la scène.
 *
 * App.jsx garde ainsi la responsabilité de l’orchestration globale, sans mélanger
 * le rendu principal de la scène avec toutes les modales possibles.
 */
export function FenetresSuperposees({
  scene,
  restorePoints,
  dark,
  characters,
  templates,
  actions,
  etatInterface,
  commandesInterface,
  compteurGlobal,
  resolutionHorloge,
  templatesUi,
}) {
  const {
    addSheetOpen,
    openMenu,
    notice,
    globalSheetOpen,
    clockModalOpen,
    initiativeEntryOpen,
  } = etatInterface;

  const {
    fermerAjoutPersonnage,
    fermerMenu,
    fermerNotice,
    fermerCompteurGlobal,
    fermerResolutionHorloge,
    fermerSaisieInitiatives,
    ouvrirSauvegardeTemplate,
    creerPersonnageVierge,
    creerDepuisTemplate,
    restaurerScene,
    ouvrirHubCampagne,
  } = commandesInterface;

  const { templateTarget, templateError, fermerSauvegardeTemplate, enregistrerTemplate } = templatesUi;
  const { resetClock, deleteClock } = resolutionHorloge;

  const ouvrirHub = () => {
    fermerMenu?.();
    ouvrirHubCampagne?.();
  };

  return (
    <>
      {characters.selected && <FicheParticipant participant={characters.selected} enInitiative={characters.isInInit(characters.selected.id)} onFermer={characters.closeCharacter} onModifier={() => characters.editCharacter(characters.selected.id)} onChangerInitiative={(initiative) => characters.updateCharacter(characters.selected.id, (participant) => ({ ...participant, initiative }))} onRejoindreInitiative={() => characters.requestJoin(characters.selected.id)} onQuitterInitiative={() => characters.leaveInit(characters.selected.id)} onSuivi={(trackerId, next) => characters.updateCharacterTracker(characters.selected.id, trackerId, next)} onSupprimerSuivi={(trackerId) => characters.deleteCharacterTracker(characters.selected.id, trackerId)} onAjouterEtat={() => characters.requestStatus(characters.selected.id)} onRetirerEtat={(statusId) => characters.removeCharacterStatus(characters.selected.id, statusId)} onNote={(note) => characters.updateCharacter(characters.selected.id, (participant) => ({ ...participant, note }))} />}
      {characters.editing && <FenetreEditionFiche participant={characters.editing} onClose={characters.closeEditor} onSave={characters.saveCharacter} onDelete={() => characters.deleteCharacter(characters.editing.id)} onSaveTemplate={ouvrirSauvegardeTemplate} />}
      {characters.statusTarget && <FenetreEtat participant={characters.statusTarget} onFermer={characters.cancelStatus} onValider={characters.saveStatus} />}
      {characters.joinTarget && <FenetreRejoindreInitiative participant={characters.joinTarget} onFermer={characters.cancelJoin} onValider={characters.joinInit} />}
      {addSheetOpen && <FenetreAjoutPersonnage templates={templates.templates} categories={templates.categories} onFermer={fermerAjoutPersonnage} onCreerVierge={creerPersonnageVierge} onCreerDepuisTemplate={creerDepuisTemplate} />}
      {templateTarget && <FenetreSauvegardeTemplate participant={templateTarget} categories={templates.categories} erreur={templateError} onFermer={fermerSauvegardeTemplate} onEnregistrer={enregistrerTemplate} />}
      {globalSheetOpen && <FenetreCompteurGlobal compteur={scene.globalTracker} onModifier={actions.updateGlobalTracker} onChanger={actions.stepGlobal} onFermer={fermerCompteurGlobal} />}
      {clockModalOpen && <FenetreResolutionHorloge participants={compteurGlobal.horlogesBloquantes} onFermer={fermerResolutionHorloge} onRelancerHorloge={resetClock} onSupprimerHorloge={deleteClock} />}
      {notice && <FenetreInformation titre={notice.title} message={notice.message} onFermer={fermerNotice} />}
      {openMenu && <MenuPrincipal scene={scene} restorePoints={restorePoints} onRestore={restaurerScene} onClose={fermerMenu} dark={dark} setDark={actions.setDark} onAddParticipant={commandesInterface.ouvrirAjoutPersonnage} onOpenCampaignHub={ouvrirHub} onGlobalTracker={actions.updateGlobalTracker} onOpenInitiativeRoller={commandesInterface.ouvrirSaisieInitiatives} />}
      {initiativeEntryOpen && <FenetreLancerInitiatives participants={scene.participants} reserve={scene.reserve} onFermer={fermerSaisieInitiatives} onValider={actions.applyInitiativeRolls} onPasserHorsInitiative={actions.moveParticipantsToReserve} />}
    </>
  );
}
