import { categoryExists, instantiateTemplate, makeTemplateFromParticipant, mergeTemplateStores, normalizeTemplateStore, templateNameExists } from '../templates.js';

export function useTemplates(store, setStore) {
  const templateStore = normalizeTemplateStore(store);

  const saveParticipantAsTemplate = (participant, { name, category, newCategory, overwrite = false }) => {
    const targetCategory = newCategory?.trim() || category;
    const cleanName = name?.trim();
    if (!cleanName) return { ok: false, kind: 'missing-name', message: 'Donne un nom au template.' };
    if (!targetCategory?.trim()) return { ok: false, kind: 'missing-category', message: 'Choisis ou crée une catégorie.' };
    const duplicate = templateNameExists(templateStore.templates, targetCategory, cleanName);
    if (duplicate && !overwrite) return { ok: false, kind: 'duplicate', message: 'Un template porte déjà ce nom dans cette catégorie. Tu peux l’écraser ou modifier le nom.' };

    const template = makeTemplateFromParticipant(participant, { name: cleanName, category: targetCategory });
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        categories: categoryExists(currentStore.categories, targetCategory) ? currentStore.categories : [...currentStore.categories, targetCategory],
        templates: duplicate
          ? currentStore.templates.map((item) => item.category === targetCategory && item.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase() ? { ...template, id: item.id, createdAt: item.createdAt, updatedAt: new Date().toISOString() } : item)
          : [...currentStore.templates, template],
      });
    });
    return { ok: true, template, overwritten: duplicate };
  };

  const createParticipantFromTemplate = (templateId) => {
    const template = templateStore.templates.find((item) => item.id === templateId);
    return instantiateTemplate(template);
  };

  const deleteTemplate = (templateId) => {
    setStore((current) => {
      const currentStore = normalizeTemplateStore(current);
      return normalizeTemplateStore({
        ...currentStore,
        templates: currentStore.templates.filter((template) => template.id !== templateId),
      });
    });
  };

  const importTemplates = (incomingStore) => {
    const result = mergeTemplateStores(templateStore, incomingStore);
    setStore(result.store);
    return result;
  };

  return {
    categories: templateStore.categories,
    templates: templateStore.templates,
    saveParticipantAsTemplate,
    createParticipantFromTemplate,
    deleteTemplate,
    importTemplates,
  };
}
