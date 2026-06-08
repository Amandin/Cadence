import { trackerTypeLabels } from '../../constants.js';
import { LigneTemplateSimple, LigneTemplateSysteme } from './TemplateRows.jsx';

function libelleDureeEtat(status = {}) {
  const impact = status.inactive ? '[!] inactif' : status.limited ? '[~] limité' : '[o] normal';
  const rythme = status.advanceOn === 'round' ? 'round(s)' : 'activation(s)';
  if (status.duration == null) return `${impact} | illimité`;
  return `${impact} | ${status.duration} ${rythme}`;
}

function libelleCompteurScene(compteur = {}) {
  const mode = compteur.mode || 'clock';
  if (mode === 'timer') return `minuteur ${Math.max(1, Math.round(Number(compteur.max || 60) / 60))} min`;
  if (mode === 'stopwatch') return 'chronomètre';
  if (mode === 'counter') return `compteur /${compteur.max || 10}`;
  return `horloge ${compteur.max || 6} segments`;
}

export function OngletTemplatesSuivis({ templates, onAjouter, onEditer, onDupliquer, onSupprimer }) {
  return (
    <div className="stack">
      <div className="hub-section-head">
        <p className="muted compact-help">Ces indicateurs pourront être ajoutés depuis l’édition d’une fiche.</p>
        <button className="small-btn" onClick={onAjouter}>+ indicateur</button>
      </div>
      {templates.length === 0 ? <div className="empty-section panel">Aucun modèle d’indicateur.</div> : templates.map((template) => (
        <LigneTemplateSimple key={template.id} template={template} detail={trackerTypeLabels[template.tracker?.type] || 'Indicateur'} onEditer={onEditer} onDupliquer={onDupliquer} onSupprimer={onSupprimer} />
      ))}
    </div>
  );
}

export function OngletTemplatesEtats({ templates, onAjouter, onEditer, onDupliquer, onSupprimer }) {
  return (
    <div className="stack">
      <div className="hub-section-head">
        <p className="muted compact-help">Ces états seront proposés quand tu ajoutes un état à une fiche.</p>
        <button className="small-btn" onClick={onAjouter}>+ état</button>
      </div>
      {templates.length === 0 ? <div className="empty-section panel">Aucun modèle d’état.</div> : templates.map((template) => template.id === 'status-template-surpris'
        ? <LigneTemplateSysteme key={template.id} template={template} detail={libelleDureeEtat(template.status)} />
        : <LigneTemplateSimple key={template.id} template={template} detail={libelleDureeEtat(template.status)} onEditer={onEditer} onDupliquer={onDupliquer} onSupprimer={onSupprimer} />)}
    </div>
  );
}

export function OngletTemplatesScene({ counterTemplates, statusTemplates, onAjouterCompteur, onEditerCompteur, onDupliquerCompteur, onSupprimerCompteur, onAjouterEtat, onEditerEtat, onDupliquerEtat, onSupprimerEtat }) {
  return (
    <div className="stack">
      <section className="scene-template-group">
        <div className="hub-section-head">
          <div><h4>Indicateurs de scène</h4><p className="muted compact-help">Ces modèles remplacent ou préparent l’indicateur global de la scène.</p></div>
          <button className="small-btn" onClick={onAjouterCompteur}>+ indicateur</button>
        </div>
        {counterTemplates.length === 0 ? <div className="empty-section panel">Aucun modèle d’indicateur de scène.</div> : counterTemplates.map((template) => (
          <LigneTemplateSimple key={template.id} template={template} detail={libelleCompteurScene(template.counter)} onEditer={onEditerCompteur} onDupliquer={onDupliquerCompteur} onSupprimer={onSupprimerCompteur} />
        ))}
      </section>
      <section className="scene-template-group">
        <div className="hub-section-head">
          <div><h4>États de scène</h4><p className="muted compact-help">Ces états sont proposés dans le menu d’ajout d’état de scène.</p></div>
          <button className="small-btn" onClick={onAjouterEtat}>+ état</button>
        </div>
        {statusTemplates.length === 0 ? <div className="empty-section panel">Aucun modèle d’état de scène.</div> : statusTemplates.map((template) => (
          <LigneTemplateSimple key={template.id} template={template} detail={libelleDureeEtat(template.status)} onEditer={onEditerEtat} onDupliquer={onDupliquerEtat} onSupprimer={onSupprimerEtat} />
        ))}
      </section>
    </div>
  );
}
