import { useEffect, useState } from 'react';
import { categoryExists, instantiateTemplate, loadTemplateStore, makeTemplateFromParticipant, saveTemplateStore, templateNameExists } from '../templates.js';

export function useTemplates() {
  const [store, setStore] = useState(loadTemplateStore);

  useEffect(() => {
    saveTemplateStore(store);
  }, [store]);

  const saveParticipantAsTemplate = (participant, { name, category, newCategory, overwrite = false }) => {
    const targetCategory = newCategory?.trim() || category;
    const cleanName = name?.trim();
    if (!cleanName) return { ok: false, kind: 'missing-name', message: 'Donne un nom au template.' };
    if (!targetCategory?.trim()) return { ok: false, kind: 'missing-category', message: 'Choisis ou crée une catégorie.' };
    const duplicate = templateNameExists(store.templates, targetCategory, cleanName);
    if (duplicate && !overwrite) return { ok: false, kind: 'duplicate', message: 'Un template porte déjà ce nom dans cette catégorie. Tu peux l’écraser ou modifier le nom.' };

    const template = makeTemplateFromParticipant(participant, { name: cleanName, category: targetCategory });
    setStore((current) => ({
      ...current,
      categories: categoryExists(current.categories, targetCategory) ? current.categories : [...current.categories, targetCategory],
      templates: duplicate
        ? current.templates.map((item) => item.category === targetCategory && item.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase() ? { ...template, id: item.id, createdAt: item.createdAt, updatedAt: new Date().toISOString() } : item)
        : [...current.templates, template],
    }));
    return { ok: true, template, overwritten: duplicate };
  };

  const createParticipantFromTemplate = (templateId) => {
    const template = store.templates.find((item) => item.id === templateId);
    return instantiateTemplate(template);
  };

  return {
    categories: store.categories,
    templates: store.templates,
    saveParticipantAsTemplate,
    createParticipantFromTemplate,
  };
}
