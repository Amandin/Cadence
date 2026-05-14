import { useMemo, useRef, useState } from 'react';
import { APP_VERSION } from '../../constants.js';

function grouperTemplates(templates = []) {
  return [...templates]
    .sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`, 'fr'))
    .reduce((groupes, template) => {
      const categorie = template.category || 'Sans catégorie';
      const groupe = groupes.find((item) => item.categorie === categorie);
      if (groupe) groupe.templates.push(template);
      else groupes.push({ categorie, templates: [template] });
      return groupes;
    }, []);
}

function OngletsHub({ onglet, setOnglet }) {
  return (
    <div className="grid3 hub-tabs">
      <button className={`choice ${onglet === 'scenes' ? 'selected' : ''}`} onClick={() => setOnglet('scenes')}>Scènes</button>
      <button className={`choice ${onglet === 'sauvegarde' ? 'selected' : ''}`} onClick={() => setOnglet('sauvegarde')}>Sauvegarde</button>
      <button className={`choice ${onglet === 'templates' ? 'selected' : ''}`} onClick={() => setOnglet('templates')}>Templates</button>
    </div>
  );
}

function EnteteHub({ campaignName, sombre, onChangerTheme, onOuvrirScene }) {
  const logo = sombre ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';

  return (
    <header className="campaign-hub-header panel">
      <div className="menu-brand">
        <img src={logo} alt="Cadence" />
        <div>
          <strong>{campaignName || 'Campagne Cadence'}</strong>
          <span className="muted">Cadence · v{APP_VERSION}</span>
        </div>
      </div>
      <div className="hub-header-actions">
        <button className="small-btn" onClick={onOuvrirScene}>Ouvrir la scène</button>
        <button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label="Basculer thème clair ou sombre">
          <span>☀</span>
          <span>☾</span>
          <i />
        </button>
      </div>
    </header>
  );
}

function OngletScenes({ scenes, sceneActiveId, onChoisirScene, onNouvelleScene }) {
  return (
    <div className="stack hub-section panel">
      <div className="hub-section-head">
        <h3>Scènes</h3>
        <button className="small-btn" onClick={onNouvelleScene}>Nouvelle scène</button>
      </div>
      <div className="stack">
        {scenes.map((scene, index) => (
          <button
            className={`restore-row hub-row ${scene.id === sceneActiveId ? 'selected' : ''}`}
            key={scene.id}
            onClick={() => onChoisirScene(index)}
          >
            <span><strong>{scene.title || 'Scène'}</strong><small>{scene.type || 'Scène'} · Round {scene.round || 1}</small></span>
            <em>{scene.id === sceneActiveId ? 'active' : 'ouvrir'}</em>
          </button>
        ))}
      </div>
    </div>
  );
}

function OngletSauvegarde({ onExporter, onImporter, onReinitialiser }) {
  const importInputRef = useRef(null);
  const choisirFichier = () => importInputRef.current?.click();
  const importerFichier = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onImporter(file);
  };

  return (
    <div className="stack hub-section panel">
      <h3>Sauvegarde</h3>
      <p className="muted compact-help">Exporte une campagne .cad, importe une sauvegarde Cadence ou réinitialise la démo.</p>
      <div className="grid2">
        <button className="primary" onClick={onExporter}>Exporter</button>
        <button className="small-btn" onClick={choisirFichier}>Importer</button>
        <input ref={importInputRef} type="file" accept=".cad,.json,application/json" style={{ display: 'none' }} onChange={importerFichier} />
      </div>
      <button className="danger-btn" onClick={onReinitialiser}>Réinitialiser la démo</button>
    </div>
  );
}

function OngletTemplates({ templates = [], onAjouterDepuisTemplate, onSupprimerTemplate }) {
  const groupes = useMemo(() => grouperTemplates(templates), [templates]);

  if (templates.length === 0) {
    return (
      <div className="stack hub-section panel">
        <h3>Templates</h3>
        <div className="empty-section panel">Aucun template enregistré. Ouvre une fiche personnage puis utilise “Enregistrer comme template”.</div>
      </div>
    );
  }

  return (
    <div className="stack hub-section panel">
      <h3>Templates</h3>
      <p className="muted compact-help">Ajoute rapidement un template à la scène courante ou supprime les fiches devenues inutiles.</p>
      {groupes.map((groupe) => (
        <section className="hub-template-group" key={groupe.categorie}>
          <div className="flexible-section-title"><span>{groupe.categorie}</span><strong>{groupe.templates.length}</strong></div>
          <div className="stack">
            {groupe.templates.map((template) => (
              <div className="restore-row hub-row" key={template.id}>
                <span><strong>{template.name}</strong><small>{template.participant?.kind || 'Personnage'}</small></span>
                <div className="compact-arrows">
                  <button className="small-btn" onClick={() => onAjouterDepuisTemplate(template.id)}>Ajouter</button>
                  <button className="danger-btn mini-danger" onClick={() => onSupprimerTemplate(template.id)}>Suppr.</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function HubCampagne({
  campaignName,
  scene,
  scenes,
  templates,
  dark,
  onChangerTheme,
  onOuvrirScene,
  onChoisirScene,
  onNouvelleScene,
  onExporter,
  onImporter,
  onReinitialiser,
  onAjouterDepuisTemplate,
  onSupprimerTemplate,
}) {
  const [onglet, setOnglet] = useState('scenes');

  return (
    <div className="campaign-page shell">
      <EnteteHub campaignName={campaignName} sombre={dark} onChangerTheme={onChangerTheme} onOuvrirScene={onOuvrirScene} />
      <main className="campaign-hub-page">
        <OngletsHub onglet={onglet} setOnglet={setOnglet} />
        {onglet === 'scenes' && <OngletScenes scenes={scenes} sceneActiveId={scene?.id} onChoisirScene={onChoisirScene} onNouvelleScene={onNouvelleScene} />}
        {onglet === 'sauvegarde' && <OngletSauvegarde onExporter={onExporter} onImporter={onImporter} onReinitialiser={onReinitialiser} />}
        {onglet === 'templates' && <OngletTemplates templates={templates} onAjouterDepuisTemplate={onAjouterDepuisTemplate} onSupprimerTemplate={onSupprimerTemplate} />}
      </main>
    </div>
  );
}
