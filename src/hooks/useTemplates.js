import { useEffect, useState } from 'react';
import { categoryExists, instantiateTemplate, loadTemplateStore, makeTemplateFromParticipant, saveTemplateStore, templateNameExists } from '../templates.js';

export function useTemplates() {
  const [store, setStore] = useState(loadTemplateStore);

  useEffect(() => {
    saveTemplateStore(store);
  }, [store]);

  const saveParticipantAsTemplate = (participant, { name, category, newCategory }) => {
    const targetCategory = newCategory?.trim() || category;
    const cleanName = name?.trim();
    if (!cleanName) return { ok: false, message: 'Donne un nom au template.' };
    if (!targetCategory?.trim()) return { ok: false, message: 'Choisis ou crée une catégorie.' };
    if (templateNameExists(store.templates, targetCategory, cleanName)) return { ok: false, message: 'Ce nom existe déjà dans cette catégorie.' };

    const template = makeTemplateFromParticipant(participant, { name: cleanName, category: targetCategory });
    setStore((current) => ({
      ...current,
      categories: categoryExists(current.categories, targetCategory) ? current.categories : [...current.categories, targetCategory],
      templates: [...current.templates, template],
    }));
    return { ok: true, template };
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
