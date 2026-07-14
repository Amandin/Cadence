import { useEffect, useMemo, useState } from 'react';
import { initiativeInputIsValid, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';

function trierTemplates(templates) {
  return [...templates].sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`, 'fr'));
}

function listerCategories(categories, templates) {
  const connues = categories?.length ? categories : [];
  const utilisees = templates.map((template) => template.category).filter(Boolean);
  return [...new Set([...connues, ...utilisees])].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function FenetreAjoutPersonnage({ templates = [], categories = [], initiativeTextOrder, utiliserInitiative = true, preparation = false, onFermer, onCreerVierge, onCreerDepuisTemplate }) {
  const templatesTries = useMemo(() => trierTemplates(templates), [templates]);
  const categoriesDisponibles = useMemo(() => listerCategories(categories, templatesTries), [categories, templatesTries]);
  const textConfig = useMemo(() => normalizeInitiativeTextOrder(initiativeTextOrder), [initiativeTextOrder]);
  const [mode, setMode] = useState('blank');
  const [categorie, setCategorie] = useState(categoriesDisponibles[0] || '');
  const templatesCategorie = templatesTries.filter((template) => template.category === categorie);
  const [templateId, setTemplateId] = useState(templatesCategorie[0]?.id || '');
  const [placement, setPlacement] = useState('init');
  const [initiative, setInitiative] = useState('1');

  useEffect(() => {
    if (categoriesDisponibles.includes(categorie)) return;
    setCategorie(categoriesDisponibles[0] || '');
  }, [categorie, categoriesDisponibles]);

  useEffect(() => {
    if (templatesCategorie.some((template) => template.id === templateId)) return;
    setTemplateId(templatesCategorie[0]?.id || '');
  }, [templateId, templatesCategorie]);

  useEffect(() => {
    if (initiativeInputIsValid(initiative, textConfig)) return;
    setInitiative('');
  }, [initiative, textConfig]);

  const choisirCategorie = (nouvelleCategorie) => {
    const prochainsTemplates = templatesTries.filter((template) => template.category === nouvelleCategorie);
    setCategorie(nouvelleCategorie);
    setTemplateId(prochainsTemplates[0]?.id || '');
  };

  const initiativeValide = placement !== 'init' || !utiliserInitiative || initiativeInputIsValid(initiative, textConfig);
  const creerPersonnage = () => {
    if (!initiativeValide) return;
    const options = {
      placement,
      initiative: placement === 'init' && utiliserInitiative ? initiativeValueForMode(initiative, textConfig) : null,
    };
    if (mode === 'template') onCreerDepuisTemplate(templateId, options);
    else onCreerVierge(options);
  };

  const categorieVide = mode === 'template' && categorie && templatesCategorie.length === 0;

  return (
    <Fenetre title={t('characterAdd.title')} onClose={onFermer} className="character-add-sheet">
      <div className="stack">
        <div className="grid2">
          <button className={`choice ${mode === 'blank' ? 'selected' : ''}`} onClick={() => setMode('blank')}>{t('characterAdd.blank')}</button>
          <button className={`choice ${mode === 'template' ? 'selected' : ''}`} disabled={templatesTries.length === 0} onClick={() => setMode('template')}>{t('characterAdd.template')}</button>
        </div>
        {mode === 'template' && <div className="grid2">
          <label className="field">{t('characterAdd.category')}<select value={categorie} onChange={(event) => choisirCategorie(event.target.value)}>{categoriesDisponibles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">{t('characterAdd.model')}<select value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={templatesCategorie.length === 0}>{templatesCategorie.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        </div>}
        {categorieVide && <p className="muted" style={{ margin: 0, fontSize: 12 }}>{t('characterAdd.emptyCategory')}</p>}
        <div className="grid2">
          <button className={`choice ${placement === 'init' ? 'selected' : ''}`} onClick={() => setPlacement('init')}>{t('characterAdd.placement.init')}</button>
          <button className={`choice ${placement === 'reserve' ? 'selected' : ''}`} onClick={() => setPlacement('reserve')}>{t('characterAdd.placement.reserve')}</button>
          {preparation && utiliserInitiative && <button className={`choice ${placement === 'pending' ? 'selected' : ''}`} onClick={() => setPlacement('pending')}>{t('characterAdd.placement.pending')}</button>}
        </div>
        {placement === 'init' && utiliserInitiative && <ChampInitiative label={t('characterAdd.initiative')} valeur={initiative} textConfig={textConfig} onChange={setInitiative} />}
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>{t('characterAdd.help')}</p>
        <div className="grid2">
          <button className="primary" onClick={creerPersonnage} disabled={(mode === 'template' && !templateId) || !initiativeValide}>{t('common.create')}</button>
          <button className="small-btn" onClick={onFermer}>{t('common.cancel')}</button>
        </div>
      </div>
    </Fenetre>
  );
}
