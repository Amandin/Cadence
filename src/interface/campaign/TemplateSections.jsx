import { trackerTypeLabels } from '../../constants.js';
import { LigneTemplateSimple, LigneTemplateSysteme } from './TemplateRows.jsx';

function libelleDureeEtat(status = {}) {
  const impact = status.inactive ? '[!] inactif' : status.limited ? '[~] limite' : '[o] normal';
  const rythme = status.advanceOn === 'round' ? 'round(s)' : 'activation(s)';
  if (status.duration == null) return `${impact} | illimite`;
  return `${impact} | ${status.duration} ${rythme}`;
}

function libelleCompteurScene(compteur = {}) {
  const mode = compteur.mode || 'clock';
  if (mode === 'timer') return `minuteur ${Math.max(1, Math.round(Number(compteur.max || 60) / 60))} min`;
  if (mode === 'stopwatch') return 'chronometre';
  if (mode === 'counter') return `compteur /${compteur.max || 10}`;
  return `horloge ${compteur.max || 6} segments`;
}

export function OngletTemplatesSuivis({ templates, onAjouter, onEditer, onDupliquer, onSupprimer }) {
  return (
    <div className="stack">
      <div className="hub-section-head">
        <p className="muted compact-help">Ces suivis pourront etre ajoutes depuis l'edition d'une fiche.</p>
        <button className="small-btn" onClick={onAjouter}>+ suivi</button>
      </div>
      {templates.length === 0 ? <div className="empty-section panel">Aucun template de suivi.</div> : templates.map((template) => (
        <LigneTemplateSimple key={template.id} template={template} detail={trackerTypeLabels[template.tracker?.type] || 'Suivi'} onEditer={onEditer} onDupliquer={onDupliquer} onSupprimer={onSupprimer} />
      ))}
    </div>
  );
}

export function OngletTemplatesEtats({ templates, onAjouter, onEditer, onDupliquer, onSupprimer }) {
  return (
    <div className="stack">
      <div className="hub-section-head">
        <p className="muted compact-help">Ces etats seront proposes quand tu ajoutes un etat a une fiche.</p>
        <button className="small-btn" onClick={onAjouter}>+ etat</button>
      </div>
      {templates.length === 0 ? <div className="empty-section panel">Aucun template d'etat.</div> : templates.map((template) => template.id === 'status-template-surpris'
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
          <div><h4>Suivis globaux</h4><p className="muted compact-help">Ces templates remplacent ou preparent le suivi global de la scene.</p></div>
          <button className="small-btn" onClick={onAjouterCompteur}>+ compteur</button>
        </div>
        {counterTemplates.length === 0 ? <div className="empty-section panel">Aucun template de suivi global.</div> : counterTemplates.map((template) => (
          <LigneTemplateSimple key={template.id} template={template} detail={libelleCompteurScene(template.counter)} onEditer={onEditerCompteur} onDupliquer={onDupliquerCompteur} onSupprimer={onSupprimerCompteur} />
        ))}
      </section>
      <section className="scene-template-group">
        <div className="hub-section-head">
          <div><h4>Etats de scene</h4><p className="muted compact-help">Ces etats sont proposes dans le menu d'ajout d'etat de scene.</p></div>
          <button className="small-btn" onClick={onAjouterEtat}>+ etat</button>
        </div>
        {statusTemplates.length === 0 ? <div className="empty-section panel">Aucun template d'etat de scene.</div> : statusTemplates.map((template) => (
          <LigneTemplateSimple key={template.id} template={template} detail={libelleDureeEtat(template.status)} onEditer={onEditerEtat} onDupliquer={onDupliquerEtat} onSupprimer={onSupprimerEtat} />
        ))}
      </section>
    </div>
  );
}
